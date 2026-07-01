# Implementation Plan: iOS Share Sheet API Integration

## Overview

Implement the iOS Share Sheet integration in two parallel tracks: a Cloudflare Pages Function (`functions/api/share.js`) for the server-side token-authenticated link-save endpoint, and a new `ApiAccessSection` React component mounted inside `UpdateProfileModal` for client-side token management. Both tracks share a common token-hashing approach using the Web Crypto API.

## Tasks

- [x] 1. Set up test infrastructure and shared token-hashing utility
  - Install `fast-check` as a dev dependency (`npm install --save-dev fast-check`)
  - Create `src/utils/tokenHash.ts` exporting a single `hashToken(rawBytes: Uint8Array): Promise<string>` function that uses `crypto.subtle.digest('SHA-256', rawBytes)` and returns a lowercase hex string
  - This utility is imported by both `ApiAccessSection` and `share.js` (the server copy uses its own inline version since Pages Functions can't import from `src/`)
  - _Requirements: 1.5, 5.2, 9.2_

  - [ ]* 1.1 Write property test for `hashToken`
    - **Property 9: Token hash stored is always the SHA-256 of the generated token**
    - Generate random `Uint8Array(32)` values; compute expected hex digest independently; assert `hashToken` output matches
    - Tag: `// Feature: ios-share-integration, Property 9: token hash stored is SHA-256 of generated token`
    - **Validates: Requirements 5.2, 9.2**

- [x] 2. Implement `functions/api/share.js` — skeleton and CORS
  - Create `functions/api/share.js` exporting `onRequestOptions` (returns 204 with CORS headers) and `onRequestPost` (stub returning 501 for now)
  - Define the CORS headers constant: `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`, `Access-Control-Allow-Headers: Content-Type, Authorization`
  - Add a `json(body, status, extraHeaders)` helper that always merges CORS headers into every response
  - Add a TODO comment: `// TODO: Rate limiting — recommended future enhancement: per-IP and per-token limiting (e.g. Cloudflare Rate Limiting rules or a KV-based counter)`
  - _Requirements: 4.1, 4.4, 9.4_

  - [ ]* 2.1 Write property test: CORS headers present on all responses
    - **Property 5: CORS headers present on all responses**
    - Drive the handler through all code paths (auth failures, validation failures, success, server error) and assert all three CORS headers are present on every response
    - Tag: `// Feature: ios-share-integration, Property 5: CORS headers present on all responses`
    - **Validates: Requirements 4.4**

- [x] 3. Implement authentication logic in `functions/api/share.js`
  - Extract `extractBearerToken(request)` helper: returns the raw token string or `null` if header is absent/malformed
  - Implement inline SHA-256 hex hash function (mirrors `src/utils/tokenHash.ts` but uses Worker-runtime globals)
  - Implement `lookupUserByTokenHash(supabaseAdminClient, tokenHash)` helper: queries `auth.users` via the Admin API filtering on `raw_user_meta_data->>'api_token_hash'`; returns the user row or `null`
  - Wire into `onRequestPost`: return 401 for missing header, 401 for malformed header, 401 for no matching user
  - Validate `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` presence in `context.env`; return 500 if missing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.2, 4.3, 9.1, 9.3_

  - [ ]* 3.1 Write property test: missing/malformed Authorization → 401
    - **Property 1: Missing or malformed Authorization always yields 401**
    - Use `fc.oneof(fc.constant(undefined), fc.string().filter(s => !s.startsWith('Bearer ')))` for the Authorization header value; assert status 401 for any body content
    - Tag: `// Feature: ios-share-integration, Property 1: missing or malformed Authorization always yields 401`
    - **Validates: Requirements 1.1, 1.2**

  - [ ]* 3.2 Write property test: unknown token → 401
    - **Property 2: Unknown token always yields 401**
    - Mock `lookupUserByTokenHash` to always return `null`; use `fc.string({ minLength: 1 })` for token values; assert status 401
    - Tag: `// Feature: ios-share-integration, Property 2: unknown token always yields 401`
    - **Validates: Requirements 1.3**

- [x] 4. Implement request body validation in `functions/api/share.js`
  - In `onRequestPost`, after auth succeeds, attempt `request.json()`; catch parse errors and return 400 `{ error: "Invalid JSON body" }`
  - Validate that `body.url` is a non-empty string; return 400 `{ error: "url is required" }` if not
  - Normalise optional fields: `title` defaults to `''`, `notes` defaults to `''`, `tags` defaults to `[]`
  - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.1 Write property test: non-JSON body → 400
    - **Property 4: Non-JSON body always yields 400**
    - Use `fc.string().filter(s => { try { JSON.parse(s); return false } catch { return true } })` to generate invalid JSON strings; authenticate the request with a valid mock token; assert status 400
    - Tag: `// Feature: ios-share-integration, Property 4: non-JSON body always yields 400`
    - **Validates: Requirements 2.1**

  - [ ]* 4.2 Write property test: missing/empty `url` → 400
    - **Property 3: Missing or empty url field always yields 400**
    - Use `fc.record({ title: fc.option(fc.string()), notes: fc.option(fc.string()) })` (no url field) and separately `fc.constant({ url: '' })`; authenticate; assert 400
    - Tag: `// Feature: ios-share-integration, Property 3: missing or empty url always yields 400`
    - **Validates: Requirements 2.2**

- [x] 5. Implement MetadataScraper helper and link insertion in `functions/api/share.js`
  - Extract `fetchMetadata(url)` as a standalone async function at the top of the file — copy the linkedom parsing logic from `functions/api/fetch-metadata.js` (fetch → parseHTML → extract og:title, og:image)
  - In `onRequestPost`, if `body.title` is empty, call `fetchMetadata`; catch any exceptions (log a `console.warn`, continue); apply the title fallback chain: scraped title → url string
  - Store `imageUrl` from `fetchMetadata` as `favicon` if available
  - Init `@supabase/supabase-js` `createClient` using `context.env.SUPABASE_URL` + `context.env.SUPABASE_SERVICE_ROLE_KEY` (service role, `auth: { persistSession: false }`)
  - Insert into `public.links` with the correct field mapping; handle DB errors by returning 500
  - On success return 200 `{ success: true, link: { id, url, title } }`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [ ]* 5.1 Write property test: title fallback chain
    - **Property 7: Title fallback chain is always honoured**
    - Use `fc.record({ bodyTitle: fc.option(fc.string()), scraperTitle: fc.option(fc.string()), scraperThrows: fc.boolean() })`; mock `fetchMetadata` accordingly; verify inserted title follows precedence rules
    - Tag: `// Feature: ios-share-integration, Property 7: title fallback chain is always honoured`
    - **Validates: Requirements 3.2, 3.4**

  - [ ]* 5.2 Write property test: scraper failure never blocks insertion
    - **Property 8: MetadataScraper failure never blocks insertion**
    - Mock `fetchMetadata` to throw `new Error(fc.string())`; assert response is 200 with `success: true`
    - Tag: `// Feature: ios-share-integration, Property 8: MetadataScraper failure never blocks insertion`
    - **Validates: Requirements 3.4, 3.5**

  - [ ]* 5.3 Write property test: inserted link carries correct user_id
    - **Property 6: Inserted link always carries the resolved user's ID**
    - Use `fc.record({ url: fc.webUrl(), title: fc.option(fc.string()), notes: fc.option(fc.string()), tags: fc.option(fc.array(fc.string())) })`; assert mock Supabase insert was called with `user_id` matching the mock user
    - Tag: `// Feature: ios-share-integration, Property 6: inserted link carries resolved user's ID`
    - **Validates: Requirements 3.1**

- [x] 6. Checkpoint — endpoint tests pass
  - Ensure all tests in `functions/api/share.test.js` pass; ask the user if any questions arise.

- [x] 7. Implement `src/components/ApiAccessSection.tsx` — token status display
  - Create `src/components/ApiAccessSection.tsx` with the `ApiAccessSectionProps` interface and internal state shape defined in the design
  - Render the token status section: if `user?.user_metadata?.api_token_generated_at` is present, format and display the date using `new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })`; otherwise display "No token generated"
  - Do NOT display `api_token_hash` or any substring of it anywhere in the component
  - Render the "iOS Shortcut Setup" section with the 5 numbered steps and a hyperlink to the shortcut URL constant (define `const IOS_SHORTCUT_URL = 'https://www.icloud.com/shortcuts/TODO'` at the top of the file)
  - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2, 8.3_

  - [ ]* 7.1 Write property test: token status reflects metadata
    - **Property 11: Token status display reflects metadata correctly**
    - Use `fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString())` for `api_token_generated_at`; render component; assert rendered text contains 4-digit year and does not contain full ISO string
    - Tag: `// Feature: ios-share-integration, Property 11: token status display reflects metadata correctly`
    - **Validates: Requirements 6.1**

  - [ ]* 7.2 Write property test: token hash never appears in rendered output
    - **Property 10: Token hash never appears in rendered output**
    - Render ApiAccessSection in all states (no token, token active, during generation, after error) with a known `api_token_hash` value; assert `document.body.textContent` does not contain the hash value
    - Tag: `// Feature: ios-share-integration, Property 10: token hash never appears in rendered output`
    - **Validates: Requirements 6.3, 9.2**

- [x] 8. Implement `src/components/ApiAccessSection.tsx` — token generation
  - Add "Generate Token" button; on click:
    1. If `user_metadata.api_token_generated_at` already exists, show a `window.confirm` (or inline confirmation UI) warning that the old token will be invalidated; abort if user cancels
    2. Generate `rawBytes = crypto.getRandomValues(new Uint8Array(32))`
    3. Compute `tokenHex` (the display value the user will copy) by mapping each byte to `padStart(2,'0')` hex
    4. Call `hashToken(rawBytes)` from `src/utils/tokenHash.ts` to get `tokenHash`
    5. Call `supabase.auth.updateUser({ data: { api_token_hash: tokenHash, api_token_generated_at: new Date().toISOString() } })`
    6. On success: set `generatedToken` state to `tokenHex`; on error: set error message
  - Render the one-time token display field: `<input readOnly value={generatedToken} />` with a "Copy" button (`navigator.clipboard.writeText`) and a dismissal button that clears `generatedToken` from state
  - Display a prominent warning: "Store this token now — it cannot be retrieved again."
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.1 Write property test: updateUser receives correct hash
    - **Property 9: Token hash stored is always the SHA-256 of the generated token**
    - Mock `crypto.getRandomValues` to return `fc.uint8Array({ minLength: 32, maxLength: 32 })`; capture `updateUser` call arguments; compute expected hash independently; assert they match
    - Tag: `// Feature: ios-share-integration, Property 9: token hash stored is SHA-256 of generated token`
    - **Validates: Requirements 5.2, 9.2**

- [x] 9. Implement `src/components/ApiAccessSection.tsx` — token revocation
  - Add "Revoke Token" button, visible only when `user_metadata.api_token_generated_at` is present
  - On click: set `revoking: true`; call `supabase.auth.updateUser({ data: { api_token_hash: null, api_token_generated_at: null } })`
  - On success: the parent `onUserUpdated` callback (if provided) triggers a session refresh so the component re-reads the updated `user_metadata`
  - On failure: display error message; leave existing token state unchanged
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10. Mount `ApiAccessSection` inside `UpdateProfileModal.tsx`
  - Import `ApiAccessSection` in `UpdateProfileModal.tsx`
  - Render `<ApiAccessSection user={user} supabase={supabase} />` below the existing Last Name field, separated by a `<hr className="border-card-divider" />`
  - Pass an `onUserUpdated` callback that calls `supabase.auth.getUser()` and updates the local `user` state so the status display refreshes after generation or revocation
  - _Requirements: 5.1, 5.3, 6.1, 6.2, 7.2_

- [x] 11. Checkpoint — all tests pass
  - Run `npx vitest --run`; ensure all unit and property tests pass; ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `functions/api/share.js` cannot import from `src/` — the `hashToken` logic is duplicated inline; `src/utils/tokenHash.ts` is for the browser side only
- The iOS Shortcut URL in `IOS_SHORTCUT_URL` is a placeholder — update it once the Shortcut is published
- Rate limiting is documented as a TODO comment in `share.js` per Requirement 9.4; implement as a Cloudflare Rate Limiting rule on the `/api/share` route when ready
- `SUPABASE_SERVICE_ROLE_KEY` must be added to Cloudflare Pages environment variables (not `.env`) and must never appear in any `src/` file
