# Requirements Document

## Introduction

This document defines the requirements for adding WhatsApp as a first-class integration type to the Aperture Cloudflare Worker platform. The feature enables business clients to receive WhatsApp messages, extract structured intent using Gemini, store messages in D1, and send automated replies — all without modifying any existing Gemini solution paths. A reusable template (`solutions/_whatsapp-starter/`) lets operators onboard new clients by copying a folder and filling in a prompt and schema.

## Glossary

- **Worker**: The Cloudflare Worker defined in `worker/index.js` that handles all HTTP routing.
- **Catalog**: The solution registry in `worker/catalog.js` that maps solution IDs to their manifest, prompt, schema, and optional `autoReply` function.
- **Solution**: A directory under `solutions/` containing a `manifest.json`, `prompt.md`, `schema.json`, and optionally an `auto_reply.js` file.
- **WhatsApp_Solution**: A Solution whose `manifest.json` contains `"type": "whatsapp"`.
- **Gemini_Solution**: A Solution whose `manifest.json` does not contain `"type": "whatsapp"` (the default, existing type).
- **WhatsApp_Module**: The module `worker/whatsapp.js` that encapsulates all Meta webhook and messaging logic.
- **Meta_Platform**: The Meta Cloud API that delivers WhatsApp webhook events and receives outbound messages via `graph.facebook.com`.
- **Webhook_Verification**: The one-time GET handshake Meta performs to confirm the Worker controls the webhook URL.
- **Inbound_Message**: A WhatsApp text message delivered by Meta_Platform via POST to the Worker.
- **Outbound_Message**: A WhatsApp text message sent by the Worker to a user via Meta_Platform.
- **Gemini**: The Google Gemini API used to extract structured intent from WhatsApp message text.
- **D1**: The Cloudflare D1 SQLite database bound to the Worker as `env.DB`.
- **whatsapp_messages**: The D1 table that stores both inbound and outbound WhatsApp message rows.
- **solution_id**: The unique string identifier for a Solution, used to scope all D1 queries.
- **autoReply**: An exported function in a WhatsApp_Solution's `auto_reply.js` that returns a reply string or null.
- **WA_VERIFY_TOKEN**: A Wrangler secret holding the token used to authenticate Meta's webhook verification request.
- **WA_ACCESS_TOKEN**: A Wrangler secret holding the Meta System User access token used to send Outbound_Messages.
- **Starter_Template**: The `solutions/_whatsapp-starter/` directory that serves as the base template for new WhatsApp_Solutions.
- **Clinic_Solution**: The `solutions/whatsapp-clinic/` directory — the first concrete WhatsApp_Solution for a medical clinic.

---

## Requirements

### Requirement 1: Webhook Verification

**User Story:** As a Meta platform operator, I want the Worker to respond correctly to Meta's webhook verification handshake, so that the webhook URL can be successfully registered in the Meta App Dashboard.

#### Acceptance Criteria

1. WHEN a GET request arrives at `/api/whatsapp/:solutionId/webhook` with `hub.mode=subscribe`, a `hub.verify_token` matching `WA_VERIFY_TOKEN`, and a `hub.challenge` value present, THE Worker SHALL respond with HTTP 200, a `Content-Type: text/plain` header, and a response body containing the exact value of `hub.challenge`.
2. WHEN a GET request arrives at `/api/whatsapp/:solutionId/webhook` with a `hub.verify_token` that is absent or does not match `WA_VERIFY_TOKEN`, THE Worker SHALL respond with HTTP 403.
3. WHEN a GET request arrives at `/api/whatsapp/:solutionId/webhook` with `hub.mode` absent or not equal to `subscribe`, THE Worker SHALL respond with HTTP 403.
4. THE WhatsApp_Module SHALL process webhook verification requests without reading from or writing to any persistent store, and without modifying any application state.
5. IF a GET request arrives at `/api/whatsapp/:solutionId/webhook` with `hub.mode=subscribe` and a matching `hub.verify_token` but with `hub.challenge` absent, THEN THE Worker SHALL respond with HTTP 400.

---

### Requirement 2: Inbound Message Routing

**User Story:** As a system operator, I want the Worker to route WhatsApp webhook requests to the correct handler based on the solution type, so that only valid WhatsApp_Solutions are processed and existing Gemini_Solutions are unaffected.

#### Acceptance Criteria

1. IF a request arrives at `/api/whatsapp/:solutionId/webhook` and no solution with that `solutionId` exists in the Catalog, THEN THE Worker SHALL respond with HTTP 404 and a JSON body containing at least an `error` field with a string value.
2. IF a request arrives at `/api/whatsapp/:solutionId/webhook` and a solution with that `solutionId` exists in the Catalog but its `manifest.type` is not equal to `"whatsapp"`, THEN THE Worker SHALL respond with HTTP 400 and a JSON body containing at least an `error` field with a string value.
3. WHEN a POST request arrives at `/api/whatsapp/:solutionId/webhook`, the solution exists in the Catalog, and its `manifest.type` equals `"whatsapp"`, THE Worker SHALL delegate processing to the WhatsApp_Module.
4. IF a request arrives at `/api/whatsapp/:solutionId/webhook` with an HTTP method other than GET or POST, THEN THE Worker SHALL respond with HTTP 405 and an `Allow` header with value `GET, POST`.
5. THE Worker SHALL continue to respond to requests on `/api/health`, `/api/generate`, and `/api/records/*` with the same HTTP status codes and response shapes as before the WhatsApp routes were added.
6. WHEN a GET request arrives at `/api/whatsapp/:solutionId/webhook`, THE Worker SHALL delegate processing to the WhatsApp_Module for webhook verification handling.

---

### Requirement 3: Inbound Message Processing

**User Story:** As a business operator, I want incoming WhatsApp text messages to be parsed and stored, so that I have a complete message history with structured intent for each client.

#### Acceptance Criteria

1. WHEN a valid Meta webhook POST body contains a text message, THE WhatsApp_Module SHALL extract `from`, `text`, and `waMessageId` from the nested webhook envelope.
2. WHEN the webhook POST body does not contain a text message (e.g. status updates, read receipts, non-text message types), THE WhatsApp_Module SHALL return HTTP 200 without performing any D1 writes or Gemini calls.
3. WHEN the webhook POST body is malformed or cannot be parsed as JSON, THE WhatsApp_Module SHALL return HTTP 200 without throwing an exception.
4. WHEN a text message is extracted, THE WhatsApp_Module SHALL call Gemini using the solution's `prompt.md` and `schema.json` to produce a structured intent object.
5. WHEN the Gemini call fails for any reason, THE WhatsApp_Module SHALL continue processing with `gemini_output` set to null and SHALL still attempt the D1 insert.
6. WHEN a text message is extracted, THE WhatsApp_Module SHALL insert an inbound row into `whatsapp_messages` containing `direction = 'in'`, `solution_id`, `wa_message_id`, `from_number`, `body`, `gemini_output`, and `timestamp`, scoped by `solution_id`; IF a row with the same `wa_message_id` already exists, THEN THE WhatsApp_Module SHALL skip the insert without returning an error.
7. IF the D1 insert fails for any reason other than a duplicate `wa_message_id`, THEN THE WhatsApp_Module SHALL log the error and SHALL NOT perform a retry within the same request.
8. THE WhatsApp_Module SHALL always return HTTP 200 to Meta_Platform, regardless of internal errors.

---

### Requirement 4: Outbound Message (Auto-Reply)

**User Story:** As a business operator, I want the Worker to send an automated reply to each inbound WhatsApp message, so that clients receive immediate acknowledgement.

#### Acceptance Criteria

1. WHEN an inbound text message is processed, THE WhatsApp_Module SHALL call `solution.autoReply(geminiOutput, message)` to determine the reply text.
2. WHEN `autoReply` returns a non-empty string, THE WhatsApp_Module SHALL send that string as the Outbound_Message body to the sender via Meta_Platform, where the message body is between 1 and 4096 characters inclusive.
3. WHEN `autoReply` returns null or an empty string, THE WhatsApp_Module SHALL skip sending an Outbound_Message.
4. WHEN an Outbound_Message is sent successfully, THE WhatsApp_Module SHALL insert an outbound row into `whatsapp_messages` with `direction = 'out'`, the sender's phone number, the message body, and `gemini_output` set to null.
5. IF sending an Outbound_Message fails, THEN THE WhatsApp_Module SHALL log an error message indicating the sender's phone number and failure reason, and SHALL NOT insert an outbound row into `whatsapp_messages`.
6. THE `sendWhatsAppMessage` function SHALL POST to `https://graph.facebook.com/v19.0/{phoneNumberId}/messages` and SHALL throw an error when Meta_Platform returns a non-2xx response.
7. IF the `whatsapp_messages` insert for an outbound row fails, THEN THE WhatsApp_Module SHALL log an error indicating the failed insert and SHALL NOT retry the insert automatically.

---

### Requirement 5: D1 Data Storage

**User Story:** As a business operator, I want all inbound and outbound WhatsApp messages stored in D1, so that I have a complete, queryable message history scoped per client.

#### Acceptance Criteria

1. THE Worker SHALL create a `whatsapp_messages` D1 table via a migration file `aperture/migrations/0002_whatsapp_messages.sql`.
2. THE `whatsapp_messages` table SHALL contain the following columns with the specified types and nullability: `id` (INTEGER PRIMARY KEY AUTOINCREMENT, NOT NULL), `solution_id` (TEXT NOT NULL), `from_number` (TEXT NOT NULL), `direction` (TEXT NOT NULL), `body` (TEXT NOT NULL), `gemini_output` (TEXT, nullable), `wa_message_id` (TEXT NOT NULL), and `timestamp` (TEXT NOT NULL).
3. THE `whatsapp_messages` table SHALL enforce a CHECK constraint on `direction` allowing only the values `'in'` and `'out'`.
4. THE Worker SHALL create an index on `(solution_id, timestamp)` on the `whatsapp_messages` table to support per-client pagination queries.
5. THE `whatsapp_messages` table SHALL enforce a UNIQUE constraint on `wa_message_id` so that replayed or duplicate webhook deliveries for the same message do not produce duplicate rows.
6. WHEN inserting a row into `whatsapp_messages`, THE WhatsApp_Module SHALL bind `solution_id` as a query parameter so that the INSERT targets only rows belonging to the current solution.
7. WHEN querying `whatsapp_messages`, THE WhatsApp_Module SHALL include `solution_id` as a WHERE condition in every SELECT, UPDATE, and DELETE statement so that no query can access rows belonging to a different solution.
8. THE WhatsApp_Module SHALL store `gemini_output` as a serialized JSON string when a Gemini response is available, and as NULL when no Gemini response was produced (including inbound messages where generation failed or outbound messages).
9. THE WhatsApp_Module SHALL set `timestamp` to the ISO 8601 UTC representation of the current time at insert time, formatted to millisecond precision (e.g., `2026-01-15T10:30:00.000Z`).

---

### Requirement 6: Catalog Extension

**User Story:** As a developer, I want to register WhatsApp solutions in the catalog alongside Gemini solutions, so that the router can dispatch to the correct handler without modifying existing catalog entries.

#### Acceptance Criteria

1. THE Catalog SHALL support a `type` discriminator field on solution entries, where `"whatsapp"` identifies a WhatsApp_Solution; any unrecognized `type` value SHALL be treated as a Gemini_Solution for routing purposes.
2. WHEN a solution entry omits the `type` field, THE Catalog SHALL treat it as a Gemini_Solution for backward compatibility.
3. THE Catalog SHALL export an `isWhatsAppSolution(solution)` helper that returns `true` when `solution.manifest.type === 'whatsapp'` and returns `false` for null, undefined, or entries where `manifest.type` is absent or any other value.
4. WHEN a WhatsApp_Solution is registered in the Catalog, THE Catalog entry SHALL include `manifest`, `prompt`, `schema`, and `autoReply` fields; IF any of these fields is absent, THE Worker SHALL throw an error at startup indicating which field is missing.
5. THE Catalog registration of new WhatsApp_Solutions SHALL require no changes to existing Gemini_Solution entries.

---

### Requirement 7: Starter Template

**User Story:** As a developer, I want a ready-to-copy WhatsApp solution template, so that I can onboard a new client by filling in a prompt and schema without writing boilerplate.

#### Acceptance Criteria

1. THE Starter_Template SHALL contain a `manifest.json` with `"type": "whatsapp"` and a `phone_number_id` placeholder.
2. THE Starter_Template SHALL contain a `prompt.md` with a Gemini intent extraction template ending with the `{{input_text}}` placeholder.
3. THE Starter_Template SHALL contain a `schema.json` defining a JSON Schema stub for the extracted intent fields.
4. THE Starter_Template SHALL contain an `auto_reply.js` that exports an `autoReply(geminiOutput, message)` function returning a string or null.
5. THE `autoReply` function in any WhatsApp_Solution SHALL be a pure function with no side effects and no async operations.

---

### Requirement 8: Clinic Solution

**User Story:** As a clinic operator, I want a concrete WhatsApp solution for my clinic, so that patient WhatsApp messages are automatically processed and I receive structured intake data.

#### Acceptance Criteria

1. THE Clinic_Solution SHALL extract four fields from each patient message via Gemini: `appointment_request` (boolean), `symptom` (string), `urgency_level` (enum: `"low"` | `"medium"` | `"high"`), and `callback_preference` (string).
2. WHEN `urgency_level` is `"high"`, THE Clinic_Solution `autoReply` SHALL return a reply that communicates urgency and instructs the patient to contact emergency services if needed.
3. WHEN `appointment_request` is true and `urgency_level` is not `"high"`, THE Clinic_Solution `autoReply` SHALL return a reply acknowledging the appointment request and including the `symptom` field if present.
4. WHEN `gemini_output` is null (Gemini failed), THE Clinic_Solution `autoReply` SHALL return a generic fallback reply.
5. THE Clinic_Solution SHALL be registered in the Catalog as a WhatsApp_Solution.

---

### Requirement 9: Security and Secrets Management

**User Story:** As a system operator, I want all sensitive credentials stored as Wrangler secrets, so that they are never committed to source control.

#### Acceptance Criteria

1. IF `WA_VERIFY_TOKEN` is absent from the Worker environment bindings, THEN THE Worker SHALL reject the webhook verification request with HTTP 403 and emit an error message indicating the missing token.
2. IF `WA_ACCESS_TOKEN` is absent from the Worker environment bindings, THEN THE WhatsApp_Module SHALL emit an error message indicating the missing token and SHALL skip sending the Outbound_Message.
3. THE Worker SHALL not read `WA_VERIFY_TOKEN` or `WA_ACCESS_TOKEN` from any version-controlled file (such as `wrangler.jsonc`); both values SHALL come exclusively from Worker environment bindings.
4. THE Worker SHALL NOT perform X-Hub-Signature-256 HMAC validation in v1; signature validation is deferred to a future version.

---

### Requirement 10: Backward Compatibility

**User Story:** As an existing Aperture user, I want the WhatsApp integration to be purely additive, so that all existing Gemini-based solutions and API routes continue to work unchanged.

#### Acceptance Criteria

1. WHILE the WhatsApp integration is deployed, THE Worker SHALL respond to requests on `/api/health`, `/api/generate`, `/api/records`, and `/api/records/:id` with the same HTTP status codes and response body structures as before the integration was added.
2. WHEN a request path matches `/api/whatsapp/:solutionId/webhook`, THE Worker SHALL route that request exclusively to the WhatsApp handler and SHALL NOT invoke any existing route handler.
3. IF a request path does not match `/api/whatsapp/:solutionId/webhook`, THEN THE Worker SHALL process it using the same route handler and return the same HTTP status code and response body structure as before the WhatsApp integration was added.
4. THE existing `records` D1 table schema SHALL remain unmodified both in migration files and at runtime; no new migration SHALL alter the `records` table.
5. THE WhatsApp integration SHALL introduce no new npm dependencies to the project.
