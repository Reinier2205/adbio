import { getSolution } from './catalog.js';
import { generateWithGemini } from './gemini.js';

const MAX_IMAGE_CHARS = 5_500_000;

function json(body, status = 200) {
  return Response.json(body, { status });
}

function fillPrompt(template, inputText) {
  return String(template || '').replaceAll('{{input_text}}', inputText || '(no text provided)');
}

function parsePayload(row) {
  let payload = row.payload;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = { raw: row.payload };
    }
  }
  return {
    id: row.id,
    solutionId: row.solution_id,
    createdAt: row.created_at,
    title: row.title,
    payload,
  };
}

async function handleGenerate(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, 400);

  const solutionId = String(body.solutionId || '').trim();
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/\s/g, '') : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'image/jpeg';

  const solution = getSolution(solutionId);
  if (!solution) return json({ error: `Unknown solution: ${solutionId}` }, 404);
  if (!text && !imageBase64) return json({ error: 'Provide text and/or an image' }, 400);
  if (imageBase64 && imageBase64.length > MAX_IMAGE_CHARS) {
    return json({ error: 'Image is too large. Use a smaller screenshot.' }, 413);
  }

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({
      error: 'GEMINI_API_KEY is not set. Add it to .dev.vars locally or run wrangler secret put GEMINI_API_KEY.',
    }, 503);
  }

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const prompt = fillPrompt(solution.prompt, text);

  try {
    const output = await generateWithGemini({
      apiKey,
      model,
      prompt,
      schema: solution.schema,
      imageBase64: imageBase64 || null,
      mimeType,
    });
    return json({ solutionId, output });
  } catch (err) {
    console.error(JSON.stringify({ event: 'gemini_error', message: String(err?.message || err) }));
    return json({ error: err.message || 'Gemini request failed' }, 502);
  }
}

async function listRecords(url, env) {
  const solutionId = url.searchParams.get('solution');
  if (!solutionId) return json({ error: 'Missing solution query parameter' }, 400);

  const { results } = await env.DB.prepare(
    `SELECT id, solution_id, created_at, title, payload
     FROM records WHERE solution_id = ?1
     ORDER BY created_at DESC, id DESC`
  ).bind(solutionId).all();

  return json((results || []).map(parsePayload));
}

async function createRecord(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, 400);

  const solutionId = String(body.solutionId || '').trim();
  const title = String(body.title || '').trim();
  const payload = body.payload;
  if (!solutionId || payload == null) {
    return json({ error: 'Missing required fields: solutionId, payload' }, 400);
  }
  if (!getSolution(solutionId)) return json({ error: `Unknown solution: ${solutionId}` }, 404);

  const createdAt = new Date().toISOString();
  const payloadText = JSON.stringify(payload);
  const result = await env.DB.prepare(
    `INSERT INTO records (solution_id, created_at, title, payload) VALUES (?1, ?2, ?3, ?4)`
  ).bind(solutionId, createdAt, title, payloadText).run();

  const id = result.meta.last_row_id;
  return json({ id, solutionId, createdAt, title, payload }, 201);
}

async function deleteRecord(id, env) {
  if (!id || Number.isNaN(Number(id))) return json({ error: 'Invalid record id' }, 400);
  await env.DB.prepare(`DELETE FROM records WHERE id = ?1`).bind(Number(id)).run();
  return new Response(null, { status: 204 });
}

async function updateRecord(id, request, env) {
  if (!id || Number.isNaN(Number(id))) return json({ error: 'Invalid record id' }, 400);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return json({ error: 'Invalid JSON body' }, 400);

  const fields = [];
  const binds = [];
  if (body.title != null) { fields.push('title = ?' + (binds.length + 1)); binds.push(String(body.title)); }
  if (body.payload != null) { fields.push('payload = ?' + (binds.length + 1)); binds.push(JSON.stringify(body.payload)); }
  if (!fields.length) return json({ error: 'Nothing to update' }, 400);

  binds.push(Number(id));
  await env.DB.prepare(`UPDATE records SET ${fields.join(', ')} WHERE id = ?${binds.length}`)
    .bind(...binds).run();

  const row = await env.DB.prepare('SELECT id, solution_id, created_at, title, payload FROM records WHERE id = ?1')
    .bind(Number(id)).first();
  if (!row) return json({ error: 'Record not found' }, 404);
  return json(parsePayload(row));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/health' && request.method === 'GET') {
        return json({ ok: true, app: 'aperture' });
      }

      if (path === '/api/generate' && request.method === 'POST') {
        return await handleGenerate(request, env);
      }

      if (path === '/api/records' && request.method === 'GET') {
        return await listRecords(url, env);
      }

      if (path === '/api/records' && request.method === 'POST') {
        return await createRecord(request, env);
      }

      const deleted = path.match(/^\/api\/records\/([^/]+)$/);
      if (deleted && request.method === 'DELETE') {
        return await deleteRecord(deleted[1], env);
      }

      const patched = path.match(/^\/api\/records\/([^/]+)$/);
      if (patched && request.method === 'PATCH') {
        return await updateRecord(patched[1], request, env);
      }

      if (path.startsWith('/api/')) {
        return json({ error: 'Not found' }, 404);
      }

      return new Response(null, { status: 404 });
    } catch (err) {
      console.error(JSON.stringify({ event: 'worker_error', message: String(err?.message || err) }));
      return json({ error: 'Internal error' }, 500);
    }
  },
};
