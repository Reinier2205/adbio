---
inclusion: manual
name: aperture-whatsapp-solution
description: Use when the user wants to add a new WhatsApp solution to the Aperture platform, create a new WhatsApp integration for a client, or onboard a new business on WhatsApp.
---

# Aperture: Add New WhatsApp Solution

You are helping the user add a new WhatsApp solution to the **Aperture** platform.

Aperture WhatsApp solutions are webhook handlers that receive inbound WhatsApp messages from Meta, run Gemini intent extraction on the message text, store the result in D1, and optionally send an automated reply. Each solution lives in a folder under `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\` and contains five files:
- `manifest.json` — id, title, description, type, phone_number_id
- `prompt.md` — Gemini extraction prompt (must end with `{{input_text}}`)
- `schema.json` — JSON Schema defining the structured output Gemini must return
- `auto_reply.js` — pure function that decides what reply to send (or whether to skip)
- `page.js` — the frontend display component (copied verbatim from `_whatsapp-starter`)

Two catalog files must also be updated:
- `c:\Users\Reinier\Documents\GitHub\adbio\aperture\src\catalog.js` — client-side catalog
- `c:\Users\Reinier\Documents\GitHub\adbio\aperture\worker\catalog.js` — worker-side catalog

## Your job

### Step 1 — Gather information

Ask the user for the following if they haven't provided it. Ask all missing questions in **one message**, not one by one.

1. **Solution ID** — A short kebab-case identifier starting with `whatsapp-`, e.g. `whatsapp-clinic`. Must be unique, lowercase, no spaces.
2. **Title** — Human-readable name shown in the UI, e.g. "Clinic WhatsApp Assistant".
3. **Description** — One sentence shown as subtitle in the UI.
4. **Phone number ID** — The Meta-issued numeric ID for the business WhatsApp phone number (found in Meta App Dashboard → WhatsApp → API Setup). Use `PLACEHOLDER_PHONE_NUMBER_ID` if the user doesn't have it yet.
5. **Extraction fields** — What Gemini should extract from each incoming message. For each field: name, type (`string`, `number`, `boolean`, or `array of string`), description, and whether it is required.
6. **Auto-reply branches** — What automated replies should be sent? Describe the conditions (e.g. urgency level, intent type) and the reply text for each branch, plus a fallback reply.

Only proceed to Step 2 once you have all of the above.

### Step 2 — Generate the four solution files

Create folder `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\<id>\` and write these four files:

**`manifest.json`** — include `"type": "whatsapp"` and `"phone_number_id"`:
```json
{
  "id": "<id>",
  "title": "<Title>",
  "description": "<Description>",
  "inputs": "text",
  "type": "whatsapp",
  "phone_number_id": "<phone_number_id>"
}
```

**`schema.json`** — build a valid JSON Schema `object` with the user's extraction fields. Example:
```json
{
  "type": "object",
  "properties": {
    "intent": { "type": "string", "description": "Primary intent of the message" },
    "urgency": { "type": "string", "description": "Urgency level: low, medium, or high" }
  },
  "required": ["intent", "urgency"]
}
```

**`prompt.md`** — write a clear Gemini extraction instruction. Rules:
- Tell Gemini what kind of expert it is
- State that it must use only information present in the message (no invented facts)
- Tell it to follow the JSON schema exactly and prefer empty strings over guesses
- List each output field with a one-line description
- End the prompt with exactly this line: `{{input_text}}`

**`auto_reply.js`** — a pure function that maps Gemini output to a reply string. Rules:
- Export a named function `autoReply(geminiOutput, message)`
- `geminiOutput` is the structured object Gemini returned, or `null` if extraction failed
- `message` is `{ from: string, text: string, waMessageId: string }`
- Return a reply string, or `null` to skip sending a reply
- No async, no side effects, no imports

Example structure:
```js
/**
 * @param {object|null} geminiOutput
 * @param {{ from: string, text: string, waMessageId: string }} message
 * @returns {string|null}
 */
export function autoReply(geminiOutput, message) {
  if (!geminiOutput) {
    return "Thank you for your message. We'll be in touch shortly.";
  }
  if (geminiOutput.urgency === 'high') {
    return "This sounds urgent. We will contact you as soon as possible.";
  }
  return "Thank you! We've received your message and will respond soon.";
}
```

### Step 3 — Copy `page.js`

Copy `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\_whatsapp-starter\page.js` verbatim to `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\<id>\page.js`. Do **not** modify it.

### Step 4 — Register in the catalogs

**`worker/catalog.js`** — add imports for the manifest, prompt (`?raw`), schema, and `autoReply` from the new solution, then add an entry to the `catalog` object:
```js
import newManifest from '../solutions/<id>/manifest.json';
import newPrompt from '../solutions/<id>/prompt.md?raw';
import newSchema from '../solutions/<id>/schema.json';
import { autoReply as newAutoReply } from '../solutions/<id>/auto_reply.js';

export const catalog = {
  // ... existing entries ...
  [newManifest.id]: {               // ← add this
    manifest: newManifest,
    prompt: newPrompt,
    schema: newSchema,
    autoReply: newAutoReply,
  },
};
```

**`src/catalog.js`** — add imports for the manifest and `render` from `page.js`, then add the solution to the array:
```js
import newManifest from '../solutions/<id>/manifest.json';
import { render as renderNew } from '../solutions/<id>/page.js';

export const solutions = [
  // ... existing entries ...
  { ...newManifest, render: renderNew },   // ← add this
];
```

### Step 5 — Build and deploy

Run these commands from `c:\Users\Reinier\Documents\GitHub\adbio\aperture\`:

```powershell
npm run build
npx wrangler deploy --config dist/worker/wrangler.json
```

If the build fails, read the error output and fix it before deploying.

### Step 6 — Set Wrangler secrets (if not already set)

These secrets are shared across all WhatsApp solutions. If they are already configured, skip this step.

```powershell
npx wrangler secret put WA_VERIFY_TOKEN
npx wrangler secret put WA_ACCESS_TOKEN
```

- **`WA_VERIFY_TOKEN`** — a random string of at least 32 characters. Must match exactly what you will enter in Meta App Dashboard when registering the webhook.
- **`WA_ACCESS_TOKEN`** — the permanent access token from Meta App Dashboard → WhatsApp → API Setup.

### Step 7 — Configure the Meta webhook

In [Meta App Dashboard](https://developers.facebook.com/apps/), go to **WhatsApp → Configuration** and register the webhook:

- **Callback URL**: `https://aperture.reinier-olivier.workers.dev/api/whatsapp/<id>/webhook`
- **Verify token**: the same value you set as `WA_VERIFY_TOKEN`
- **Webhook fields**: subscribe to `messages`

After saving, send a test message to the business WhatsApp number to confirm the webhook receives and processes it.

## Important notes

- Replace `PLACEHOLDER_PHONE_NUMBER_ID` in `manifest.json` with the real Meta-issued numeric phone number ID before the solution can send outbound replies.
- `autoReply` must be a **pure function** — no `async`, no side effects, no external calls. It runs synchronously inside the Worker.
- The D1 `whatsapp_messages` table already exists (created by `migrations/0002_whatsapp_messages.sql`). No new migration is needed for new solutions. Messages are stored in the shared table, scoped by `solution_id`.
- The WhatsApp webhook handler (`worker/whatsapp.js`) is shared infrastructure — do not modify it when adding a new solution.
