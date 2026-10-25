# Aperture

Reusable **input → prompt → Gemini → review → save** platform. Portfolio Pulse stays in `findashboard/`; this app does not touch it.

Each new idea is a folder under `solutions/`. One Cloudflare Worker hosts all of them. The Gemini API key lives only on the Worker.

## Setup

```bash
cd aperture
npm install
copy .dev.vars.example .dev.vars
```

Put your Google Gemini key in `.dev.vars`:

```
GEMINI_API_KEY=your-key
```

Apply the schema to the local D1 database, then start Vite + the Worker:

```bash
npm run db:migrate
npm run dev
```

Open the printed `localhost` URL. The hub lists solutions. **Demo intake** accepts text and/or an image.

Without a key, Generate returns an error; you can still paste JSON and Save to exercise D1.

## Production

1. Create D1 and paste the id into `wrangler.jsonc` (`d1_databases[0].database_id`):

   ```bash
   npx wrangler d1 create aperture-db
   npx wrangler d1 migrations apply aperture-db --remote
   ```

2. Store the Gemini secret (this deploys a new Worker version):

   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

3. Build and deploy:

   ```bash
   npm run deploy
   ```

Optional: wrap the site with Cloudflare Access. Optional: put [AI Gateway](https://developers.cloudflare.com/ai-gateway/) in front of Gemini later for logs and caching.

Change the model with `vars.GEMINI_MODEL` in `wrangler.jsonc` (default `gemini-2.5-flash`).

## Add a solution

1. Copy `solutions/_starter` to `solutions/<id>/`.
2. Edit `manifest.json`, `prompt.md`, `schema.json`, and `page.js` (the main page for that idea).
3. Register it in:
   - `src/catalog.js` (hub + page)
   - `worker/catalog.js` (prompt + schema for `/api/generate`)
4. Restart or rebuild.

`{{input_text}}` in `prompt.md` is replaced with the text the page sends. Images are attached as Gemini inline data. The browser only calls `/api/generate`; it never sees the API key.

Saved rows are generic JSON in D1, keyed by `solution_id`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite + local Worker + local D1 |
| `npm run build` | Client + Worker build output in `dist/` |
| `npm run preview` | Run the build in workerd |
| `npm run deploy` | Build, then `wrangler deploy` |
