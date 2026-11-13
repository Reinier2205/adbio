# Implementation Plan: WhatsApp Integration

## Overview

Add WhatsApp as a first-class integration type to the Aperture Cloudflare Worker platform. The plan progresses from the data layer (D1 migration) through the core module (`worker/whatsapp.js`), router extension, solution templates, catalog registration, steering documentation, and property-based tests. Each step is fully integrated before moving on — no orphaned code.

## Tasks

- [x] 1. Create D1 migration for `whatsapp_messages` table
  - [x] 1.1 Write `aperture/migrations/0002_whatsapp_messages.sql`
    - Create `whatsapp_messages` table with columns: `id` (INTEGER PK AUTOINCREMENT), `solution_id` (TEXT NOT NULL), `from_number` (TEXT NOT NULL), `direction` (TEXT NOT NULL), `body` (TEXT NOT NULL), `gemini_output` (TEXT nullable), `wa_message_id` (TEXT NOT NULL), `timestamp` (TEXT NOT NULL)
    - Add `CHECK(direction IN ('in', 'out'))` constraint on `direction`
    - Add `UNIQUE` constraint on `wa_message_id`
    - Add index `idx_wa_messages_solution` on `(solution_id, timestamp)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Implement `worker/whatsapp.js` module
  - [x] 2.1 Implement `parseWebhookBody(body)`
    - Defensively navigate Meta's nested envelope: `body.entry[0].changes[0].value.messages[0]`
    - Return `{ from, text, waMessageId }` only for `msg.type === 'text'`
    - Return `null` for status updates, read receipts, non-text types, missing fields, or any malformed structure — never throw
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.2 Write property test for `parseWebhookBody` (Property 3)
    - **Property 3: Null-safe webhook body parsing**
    - Use `fast-check` to generate arbitrary JavaScript objects; assert `parseWebhookBody` never throws and always returns a valid extraction object or null
    - Set up `vitest` + `fast-check` test infrastructure in `aperture/` as part of this task
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [x] 2.3 Implement `verifyWebhook(url, verifyToken)`
    - Read `hub.mode`, `hub.verify_token`, `hub.challenge` from `url.searchParams`
    - Return `200 text/plain` with challenge value when `hub.mode === 'subscribe'` AND token matches
    - Return `400` when `hub.challenge` is absent with matching mode and token
    - Return `403` for all other cases (missing or mismatched token, wrong mode)
    - Pure function — no DB access, no side effects
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1_

  - [ ]* 2.4 Write property test for `verifyWebhook` (Property 1)
    - **Property 1: Webhook verification token matching**
    - Use `fast-check` to generate arbitrary token strings; assert that any `token !== verifyToken` always produces 403, and matching token with `hub.mode=subscribe` and a present challenge always produces 200
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 2.5 Implement `sendWhatsAppMessage({ phoneNumberId, to, body, accessToken })`
    - POST to `https://graph.facebook.com/v19.0/{phoneNumberId}/messages` with JSON body `{ messaging_product: 'whatsapp', to, type: 'text', text: { body } }` and `Authorization: Bearer {accessToken}` header
    - Throw an error when Meta returns a non-2xx status (include status code in error message)
    - Return void on success
    - _Requirements: 4.6_

  - [x] 2.6 Implement `handleIncoming(request, env, solution)`
    - Parse request body with `.json()` catching errors; if parse fails return `200 { ok: true }` immediately
    - Call `parseWebhookBody(body)`; if null return `200 { ok: true }` immediately
    - Call `generateWithGemini` with solution prompt, schema, and message text; catch failures and set `geminiOutput = null`, log `event: 'gemini_error'`
    - Insert inbound row into `whatsapp_messages` via parameterized D1 query bound with `solution_id`; use `INSERT OR IGNORE` to handle duplicate `wa_message_id` gracefully; log but do not rethrow on other D1 errors
    - Call `solution.autoReply(geminiOutput, message)` to get reply text
    - If reply is non-empty non-null: call `sendWhatsAppMessage` with `solution.manifest.phone_number_id`, then insert outbound row; on send failure log `event: 'send_error'` and skip outbound insert
    - If `env.WA_ACCESS_TOKEN` is absent, log error and skip send
    - Always return `200 { ok: true }` regardless of any internal errors
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 5.6, 5.7, 5.8, 5.9, 9.2_

  - [ ]* 2.7 Write property test for `handleIncoming` always-200 invariant (Property 4)
    - **Property 4: Always-200 response invariant**
    - Use `fast-check` to generate arbitrary request bodies (valid messages, non-message events, malformed JSON, Gemini failures, D1 failures); mock `env.DB` and `generateWithGemini`; assert `handleIncoming` always returns HTTP 200
    - **Validates: Requirements 3.7, 3.5, 4.5**

- [x] 3. Checkpoint — Ensure `worker/whatsapp.js` tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Extend router in `worker/index.js`
  - [x] 4.1 Add WhatsApp route dispatch to `worker/index.js`
    - Import `verifyWebhook` and `handleIncoming` from `./whatsapp.js`
    - Import `isWhatsAppSolution` from `./catalog.js`
    - Before the existing catch-all 404, match `path.match(/^\/api\/whatsapp\/([^/]+)\/webhook$/)` and extract `solutionId`
    - Call `getSolution(solutionId)`; return `404 { error }` if null
    - Check `isWhatsAppSolution(solution)`; return `400 { error }` if false
    - Dispatch `GET` → `verifyWebhook(url, env.WA_VERIFY_TOKEN)`, `POST` → `handleIncoming(request, env, solution)`, any other method → `405` with `Allow: GET, POST` header
    - Leave all existing route handlers (`/api/health`, `/api/generate`, `/api/records/*`) completely unchanged
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 10.1, 10.2, 10.3_

  - [ ]* 4.2 Write property test for route isolation (Property 11)
    - **Property 11: WhatsApp route path isolation**
    - Use `fast-check` to generate arbitrary path strings that do NOT match `/api/whatsapp/:id/webhook`; assert the WhatsApp route handler is never invoked and existing route handlers return the same responses as before
    - **Validates: Requirements 10.1, 10.2**

- [x] 5. Create `solutions/_whatsapp-starter/` template
  - [x] 5.1 Create the four starter template files
    - `manifest.json`: `{ "id": "_whatsapp-starter", "title": "WhatsApp Starter", "description": "...", "inputs": "text", "type": "whatsapp", "phone_number_id": "PLACEHOLDER_PHONE_NUMBER_ID" }`
    - `prompt.md`: generic intent extraction prompt; last line must be exactly `{{input_text}}`
    - `schema.json`: JSON Schema stub with two example fields (`intent` string, `details` string) marked required
    - `auto_reply.js`: exports `autoReply(geminiOutput, message)` — returns a default string when `geminiOutput` is null, otherwise a generic acknowledgement; pure function, no side effects
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Create `solutions/whatsapp-clinic/` first client solution
  - [x] 6.1 Write clinic solution files
    - `manifest.json`: `{ "id": "whatsapp-clinic", "title": "Clinic WhatsApp Assistant", "description": "Receives patient WhatsApp messages and extracts appointment intent.", "inputs": "text", "type": "whatsapp", "phone_number_id": "PLACEHOLDER_PHONE_NUMBER_ID" }`
    - `prompt.md`: clinic-specific Gemini prompt instructing extraction of `appointment_request`, `symptom`, `urgency_level`, `callback_preference`; must end with `{{input_text}}`
    - `schema.json`: JSON Schema with `appointment_request` (boolean), `symptom` (string), `urgency_level` (enum: `"low" | "medium" | "high"`), `callback_preference` (string); all required
    - `auto_reply.js`: 3-branch logic — `geminiOutput === null` → fallback reply; `urgency_level === 'high'` → urgency + emergency services message; `appointment_request === true` → acknowledgement including `symptom` if present; default → generic reply; pure function
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 6.2 Write property tests for clinic `autoReply` (Properties 8 and 9)
    - **Property 8: autoReply determinism**
    - **Property 9: Clinic autoReply coverage**
    - Use `fast-check` to generate arbitrary `geminiOutput` objects (including null); assert `autoReply` never throws, always returns string or null, and the urgency/appointment/fallback branches fire correctly
    - **Validates: Requirements 7.5, 8.2, 8.3, 8.4**

- [x] 7. Update catalog registrations
  - [x] 7.1 Update `worker/catalog.js`
    - Import `clinicManifest`, `clinicPrompt`, `clinicSchema` from `solutions/whatsapp-clinic/`
    - Import `{ autoReply as clinicAutoReply }` from `solutions/whatsapp-clinic/auto_reply.js`
    - Add clinic entry to `catalog` object: `{ manifest, prompt, schema, autoReply }`
    - Add `export function isWhatsAppSolution(solution)` returning `solution?.manifest?.type === 'whatsapp'`; return false for null, undefined, or absent `type`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.5_

  - [ ]* 7.2 Write property test for `isWhatsAppSolution` (Property 7)
    - **Property 7: isWhatsAppSolution correctness**
    - Use `fast-check` to generate arbitrary solution-shaped objects; assert returns `true` iff `manifest.type === 'whatsapp'` and `false` for null, undefined, or any other type value
    - **Validates: Requirements 6.2, 6.3**

  - [x] 7.3 Update `src/catalog.js`
    - Import `clinicManifest` from `solutions/whatsapp-clinic/manifest.json`
    - Import `{ render as renderClinic }` from `solutions/whatsapp-clinic/page.js` — copy `_starter/page.js` to `solutions/whatsapp-clinic/page.js` verbatim first
    - Add `{ ...clinicManifest, render: renderClinic }` to the `solutions` array
    - _Requirements: 6.1_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Create WhatsApp solution steering file
  - [x] 9.1 Write `.kiro/steering/aperture-whatsapp-solution.md`
    - Mirror the structure of `.kiro/steering/aperture-new-solution.md` but for WhatsApp solutions
    - Cover: gather info (solution id, title, description, phone_number_id, Gemini extraction fields, autoReply branches), generate the four files (manifest.json with `type: "whatsapp"`, prompt.md, schema.json, auto_reply.js), register in both catalog files, build + deploy steps
    - Include YAML frontmatter with `inclusion: manual`, `name: aperture-whatsapp-solution`, and a description
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Build and verify
  - [x] 10.1 Run `npm run build` from `aperture/` and fix any errors
    - Confirm all imports resolve (catalog entries, whatsapp.js, solution files)
    - Fix any Vite/Rollup build errors before proceeding to deploy
    - _Requirements: 10.1, 10.5_

  - [x] 10.2 Apply D1 migration locally and deploy
    - Run `wrangler d1 migrations apply aperture-db --local` to verify the migration SQL is valid
    - Run `npx wrangler deploy --config dist/worker/wrangler.json` to deploy to Cloudflare
    - Confirm `/api/health` still returns `{ ok: true }` after deploy (backward compatibility smoke test)
    - _Requirements: 5.1, 10.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The test infrastructure (vitest + fast-check) is set up in task 2.2 and reused by all subsequent property test tasks
- Task 7.3 requires copying `_starter/page.js` to `solutions/whatsapp-clinic/page.js` — it is the standard frontend shell and needs no modification for WhatsApp solutions (they have no Aperture UI form)
- All D1 inserts use `INSERT OR IGNORE` on `wa_message_id` to handle Meta's at-least-once webhook delivery safely (Requirement 3.6)
- The `phone_number_id` placeholder in both starter and clinic manifests must be replaced with the real Meta-issued phone number ID before the webhook can send outbound messages
- Property tests reference design document properties by number for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "6.1"] },
    { "id": 3, "tasks": ["2.4", "2.5", "6.2"] },
    { "id": 4, "tasks": ["2.6", "7.1"] },
    { "id": 5, "tasks": ["2.7", "7.2", "7.3"] },
    { "id": 6, "tasks": ["4.1"] },
    { "id": 7, "tasks": ["4.2", "9.1"] },
    { "id": 8, "tasks": ["10.1"] },
    { "id": 9, "tasks": ["10.2"] }
  ]
}
```
