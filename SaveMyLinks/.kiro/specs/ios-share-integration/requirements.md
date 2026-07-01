# Requirements Document

## Introduction

This feature adds iOS Share Sheet integration to SaveMyLinks, allowing users to save links directly from Safari and other iOS apps without opening the SaveMyLinks web app. The integration consists of three parts: a new `POST /api/share` Cloudflare Pages Function endpoint that authenticates via API token, an API token management UI section added to the existing profile modal, and a documentation reference for the user_metadata fields that store the token hash. The raw token is generated client-side and shown to the user exactly once; only its SHA-256 hash is persisted in Supabase Auth `user_metadata`.

## Glossary

- **ShareEndpoint**: The Cloudflare Pages Function at `POST /api/share` that receives link-save requests from the iOS Shortcut.
- **ApiToken**: A cryptographically random 32-byte value generated client-side via `crypto.getRandomValues`. The raw value is shown to the user once and never stored.
- **TokenHash**: The SHA-256 hash of the ApiToken, stored in `user_metadata.api_token_hash` in Supabase Auth.
- **TokenMetadata**: The pair of `user_metadata` fields `api_token_hash` (string) and `api_token_generated_at` (ISO-8601 string) that together represent a user's active API token state.
- **ApiAccessSection**: The UI section added to `UpdateProfileModal` that allows users to generate, view status of, and revoke their ApiToken.
- **MetadataScraper**: The optional linkedom-based logic (reused from `fetch-metadata.js`) that fetches OG tags for a URL. Failure does not block link insertion.
- **ServiceRoleClient**: A Supabase client initialised with `SUPABASE_SERVICE_ROLE_KEY` on the server side (inside the Cloudflare Pages Function). Never exposed to the browser.
- **iOS_Shortcut**: An Apple Shortcuts automation that calls `POST /api/share` when the user taps "Save to SaveMyLinks" in the iOS Share Sheet.

---

## Requirements

### Requirement 1: POST /api/share Endpoint — Authentication

**User Story:** As an iOS Shortcut, I want to authenticate requests using a Bearer token, so that only the token owner's links are saved.

#### Acceptance Criteria

1. WHEN a request arrives at `POST /api/share` without an `Authorization` header, THE ShareEndpoint SHALL return HTTP 401 with JSON body `{ "error": "Missing authorization header" }`.
2. WHEN a request arrives with an `Authorization` header that does not start with `Bearer `, THE ShareEndpoint SHALL return HTTP 401 with JSON body `{ "error": "Invalid authorization format" }`.
3. WHEN a request arrives with a Bearer token whose SHA-256 hash matches no `api_token_hash` in `auth.users` `user_metadata`, THE ShareEndpoint SHALL return HTTP 401 with JSON body `{ "error": "Invalid token" }`.
4. WHEN a request arrives with a valid Bearer token, THE ShareEndpoint SHALL resolve the associated user and proceed to process the link-save request.
5. THE ShareEndpoint SHALL hash the raw Bearer token using `crypto.subtle.digest('SHA-256', ...)` before querying Supabase, so that the raw token is never stored or logged.

---

### Requirement 2: POST /api/share Endpoint — Request Validation

**User Story:** As an iOS Shortcut, I want the endpoint to validate my request body, so that malformed requests fail with a clear error rather than producing corrupt data.

#### Acceptance Criteria

1. WHEN the request body is not valid JSON, THE ShareEndpoint SHALL return HTTP 400 with JSON body `{ "error": "Invalid JSON body" }`.
2. WHEN the request body is valid JSON but the `url` field is absent or an empty string, THE ShareEndpoint SHALL return HTTP 400 with JSON body `{ "error": "url is required" }`.
3. WHEN the `url` field is present and non-empty, THE ShareEndpoint SHALL accept optional fields `title` (string), `notes` (string), and `tags` (array of strings), applying empty-string and empty-array defaults where fields are absent.
4. THE ShareEndpoint SHALL respond to `OPTIONS` preflight requests with the appropriate CORS headers and HTTP 204 to support cross-origin calls from iOS Shortcuts.

---

### Requirement 3: POST /api/share Endpoint — Link Saving

**User Story:** As a SaveMyLinks user, I want links saved via the iOS Shortcut to appear immediately in my SaveMyLinks collection, so that I can access them on any device.

#### Acceptance Criteria

1. WHEN a valid authenticated request is received with a `url` field, THE ShareEndpoint SHALL insert a new row into `public.links` using the ServiceRoleClient, setting `user_id` to the resolved user's ID.
2. WHEN the `title` field is absent or empty in the request body, THE ShareEndpoint SHALL attempt to fetch the page title using the MetadataScraper; if scraping fails or returns an empty title, THE ShareEndpoint SHALL use the URL string as the fallback title.
3. WHEN the MetadataScraper succeeds in returning an OG image URL, THE ShareEndpoint SHALL store it in the `favicon` column of the inserted link row.
4. WHEN the MetadataScraper throws an exception, THE ShareEndpoint SHALL catch the exception, log a warning, and continue with link insertion using the fallback title and no favicon.
5. WHEN link insertion succeeds, THE ShareEndpoint SHALL return HTTP 200 with JSON body `{ "success": true, "link": { "id": "<uuid>", "url": "<url>", "title": "<title>" } }`.
6. WHEN link insertion fails due to a database error, THE ShareEndpoint SHALL return HTTP 500 with JSON body `{ "error": "Failed to save link" }`.

---

### Requirement 4: POST /api/share Endpoint — CORS and Environment

**User Story:** As a developer, I want the endpoint to be correctly configured for Cloudflare Pages Functions, so that it integrates seamlessly with the existing deployment.

#### Acceptance Criteria

1. THE ShareEndpoint SHALL be located at `functions/api/share.js` and export an `onRequestPost` function and an `onRequestOptions` function following the Cloudflare Pages Functions convention.
2. THE ShareEndpoint SHALL read `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `context.env`, so that secrets are never bundled into the client.
3. IF `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is absent from `context.env`, THEN THE ShareEndpoint SHALL return HTTP 500 with JSON body `{ "error": "Server misconfiguration" }`.
4. THE ShareEndpoint SHALL include `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, and `Access-Control-Allow-Headers: Content-Type, Authorization` on all responses.

---

### Requirement 5: API Token Generation

**User Story:** As a SaveMyLinks user, I want to generate an API token from my profile settings, so that I can configure my iOS Shortcut with a unique credential.

#### Acceptance Criteria

1. WHEN a user clicks "Generate Token" in the ApiAccessSection, THE ApiAccessSection SHALL generate a 32-byte random value using `crypto.getRandomValues` on the client side.
2. WHEN a token is generated, THE ApiAccessSection SHALL compute the SHA-256 hash of the token using `crypto.subtle.digest` and call `supabase.auth.updateUser` with `data: { api_token_hash: <hex-hash>, api_token_generated_at: <ISO-8601-string> }` to persist only the hash.
3. WHEN the `updateUser` call succeeds, THE ApiAccessSection SHALL display the raw token exactly once in a read-only, selectable input field with a "Copy" button and a prominent warning that the token cannot be retrieved again.
4. WHEN the `updateUser` call fails, THE ApiAccessSection SHALL display an error message and SHALL NOT show any token value to the user.
5. IF a user already has a token (i.e., `user_metadata.api_token_generated_at` is present), THEN THE ApiAccessSection SHALL prompt the user to confirm before generating a new token, warning that the old token will be invalidated.

---

### Requirement 6: API Token Status Display

**User Story:** As a SaveMyLinks user, I want to see whether I have an active API token and when it was created, so that I know if my iOS Shortcut is configured.

#### Acceptance Criteria

1. WHEN the ApiAccessSection renders and `user_metadata.api_token_generated_at` is present, THE ApiAccessSection SHALL display the token generation date formatted as a human-readable local date string (e.g. "Token active since June 29, 2025").
2. WHEN the ApiAccessSection renders and `user_metadata.api_token_generated_at` is absent, THE ApiAccessSection SHALL display a message indicating no token is configured (e.g. "No token generated").
3. THE ApiAccessSection SHALL NOT display the token hash or any partial representation of the raw token in the status area.

---

### Requirement 7: API Token Revocation

**User Story:** As a SaveMyLinks user, I want to revoke my API token, so that I can invalidate any previously distributed credentials.

#### Acceptance Criteria

1. WHEN a user clicks "Revoke Token" in the ApiAccessSection and a token exists, THE ApiAccessSection SHALL call `supabase.auth.updateUser` with `data: { api_token_hash: null, api_token_generated_at: null }` to clear TokenMetadata.
2. WHEN the revocation call succeeds, THE ApiAccessSection SHALL update the UI to show the "No token generated" state and hide the "Revoke Token" button.
3. WHEN the revocation call fails, THE ApiAccessSection SHALL display an error message and leave the existing token state unchanged.
4. IF no token exists, THEN THE ApiAccessSection SHALL NOT display the "Revoke Token" button.

---

### Requirement 8: iOS Shortcut Installation Guidance

**User Story:** As a SaveMyLinks user, I want clear instructions for setting up the iOS Shortcut, so that I can connect my iPhone to my account without technical difficulty.

#### Acceptance Criteria

1. THE ApiAccessSection SHALL display a section titled "iOS Shortcut Setup" that is always visible regardless of token state.
2. THE ApiAccessSection SHALL include a numbered list of setup steps: (1) generate a token, (2) copy the token, (3) open the provided iOS Shortcut link, (4) paste the token into the Shortcut configuration, (5) use the Share Sheet.
3. THE ApiAccessSection SHALL include a hyperlink to the iOS Shortcut download URL, which is configurable via a constant in the component (placeholder URL acceptable for initial implementation).

---

### Requirement 9: Security Constraints

**User Story:** As a system operator, I want the integration to meet baseline security requirements, so that user accounts cannot be compromised through the API token mechanism.

#### Acceptance Criteria

1. THE ShareEndpoint SHALL never log, return, or transmit the raw Bearer token in any response or server-side log entry.
2. THE ApiAccessSection SHALL never send the raw token to any server endpoint; only the SHA-256 hash SHALL be transmitted to Supabase.
3. THE ShareEndpoint SHALL use the ServiceRoleClient exclusively for the user lookup query and link insertion; the anon key SHALL NOT be used server-side in this function.
4. WHERE rate limiting is not implemented in the initial release, THE ShareEndpoint SHALL include a comment documenting rate limiting as a recommended future enhancement, specifying per-IP and per-token limiting as the suggested approach.
