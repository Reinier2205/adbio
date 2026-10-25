---
inclusion: auto
name: aperture-new-solution
description: Use when the user wants to add a new solution to the Aperture platform, create a new Aperture solution, or build a new idea using the Aperture template.
---

# Aperture: Add New Solution

You are helping the user add a new solution to the **Aperture** platform.

Aperture is a Cloudflare Worker + Vite app that uses Gemini to extract structured JSON from text/image input. Each "solution" is a folder under `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\` containing four files:
- `manifest.json` — id, title, description, inputs
- `prompt.md` — the Gemini instruction prompt (must end with `{{input_text}}` on the last line)
- `schema.json` — JSON Schema defining the output object Gemini must return
- `page.js` — the frontend UI (copy from `_starter` unchanged unless customisation is needed)

Two catalog files must also be updated:
- `c:\Users\Reinier\Documents\GitHub\adbio\aperture\src\catalog.js` — client-side catalog
- `c:\Users\Reinier\Documents\GitHub\adbio\aperture\worker\catalog.js` — worker-side catalog

## Your job

### Step 1 — Gather information

Ask the user for the following if they haven't provided it. Ask all missing questions in one message, not one by one.

1. **Idea** — What should this solution do? (e.g. "extract line items from a receipt photo")
2. **ID** — A short kebab-case identifier, e.g. `receipt-reader`. Must be unique, lowercase, no spaces.
3. **Title** — Human-readable name shown in the UI, e.g. "Receipt Reader".
4. **Description** — One sentence shown as subtitle in the UI.
5. **Inputs** — What the user provides: `"text"`, `"image"`, or `"text + image"`.
6. **Output fields** — What fields should Gemini extract? For each field: name, type (string/number/boolean/array of string), description, and whether it is required.

Only proceed to Step 2 once you have all of the above.

### Step 2 — Generate the files

Using the information collected:

**`manifest.json`** — fill id, title, description, inputs.

**`schema.json`** — build a valid JSON Schema `object` with the user's fields. Example structure:
```json
{
  "type": "object",
  "properties": {
    "fieldName": { "type": "string", "description": "..." }
  },
  "required": ["fieldName"]
}
```

**`prompt.md`** — write a clear Gemini instruction. Rules:
- Tell Gemini what kind of expert it is
- List extraction rules (use only what is present, no invented facts, empty string if unknown)
- List each output field with a one-line description
- End the prompt with exactly this line: `{{input_text}}`

**`page.js`** — copy verbatim from `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\_starter\page.js`. Do not modify it.

### Step 3 — Create the solution folder

1. Create folder: `c:\Users\Reinier\Documents\GitHub\adbio\aperture\solutions\<id>\`
2. Write all four files into it.

### Step 4 — Update the catalogs

**`src/catalog.js`** — add an import for the new manifest and render function, and add the solution to the array:
```js
import newManifest from '../solutions/<id>/manifest.json';
import { render as renderNew } from '../solutions/<id>/page.js';

export const solutions = [
  { ...demoManifest, render: renderDemo },
  { ...newManifest, render: renderNew },   // ← add this
];
```

**`worker/catalog.js`** — add imports for manifest, prompt, and schema, and add the entry to the catalog object:
```js
import newManifest from '../solutions/<id>/manifest.json';
import newPrompt from '../solutions/<id>/prompt.md?raw';
import newSchema from '../solutions/<id>/schema.json';

export const catalog = {
  [demoManifest.id]: { ... },
  [newManifest.id]: {                      // ← add this
    manifest: newManifest,
    prompt: newPrompt,
    schema: newSchema,
  },
};
```

### Step 5 — Build and deploy

Run these commands from `c:\Users\Reinier\Documents\GitHub\adbio\aperture\`:

```powershell
npm run build
npx wrangler deploy --config dist/worker/wrangler.json
```

If the build fails, read the error output and fix it before deploying.

### Step 6 — Confirm

Tell the user:
- The solution ID and the URL it will appear at
- That they should open `https://aperture.reinier-olivier.workers.dev` and select the new solution from the list
- Ask if they want to commit the changes to git
