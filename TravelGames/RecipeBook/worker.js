// ============================================================
// Recipe Box — Cloudflare Worker
// AI extraction via Google Gemini + URL scraping
// Secrets (set via: wrangler secret put GEMINI_API_KEY):
//   GEMINI_API_KEY
// ============================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function cors(body, status = 200) {
  return new Response(body, {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'POST') {
      return cors(JSON.stringify({ error: 'Method not allowed' }), 405);
    }

    const url = new URL(request.url);
    try {
      if (url.pathname === '/extract')   return handleExtract(request, env);
      if (url.pathname === '/fetch-url') return handleFetchUrl(request);
      return cors(JSON.stringify({ error: 'Not found' }), 404);
    } catch (err) {
      return cors(JSON.stringify({ error: err.message }), 500);
    }
  },
};

// ── /extract ─────────────────────────────────────────────────
// Body: { type: 'images'|'text'|'url_text', content }
async function handleExtract(request, env) {
  const body = await request.json();
  const { type, content } = body;
  if (!type || !content) {
    return cors(JSON.stringify({ error: 'Missing type or content' }), 400);
  }

  const schema = `{
  "title": "string",
  "servings": "string (e.g. '4' or '' if unknown)",
  "prepTime": "string (e.g. '15 min' or '')",
  "cookTime": "string (e.g. '30 min' or '')",
  "ingredients": ["keep quantity with ingredient, e.g. '2 cups flour'"],
  "steps": ["one clear action per step, in order"],
  "tags": ["up to 5 short lowercase words e.g. 'dessert', 'vegetarian', 'south african'"],
  "notes": "tips, storage, variations — empty string if none"
}`;

  const instruction = `You are a recipe extraction assistant. Extract the recipe and return ONLY valid JSON matching this exact schema — no markdown, no extra text:\n${schema}\n\nRules:\n- If multiple images are provided, treat them as pages of the same recipe.\n- Clean up OCR errors and fix obvious typos.\n- For pasted or scraped text, ignore navigation/ads and extract only the recipe.\n- If no recognisable recipe is found, return {"error":"no_recipe_found"}.`;

  // Build Gemini request parts
  const parts = [];

  if (type === 'images') {
    // content is [{ base64, mimeType }]
    for (const img of content) {
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
    }
    parts.push({ text: instruction });
  } else {
    // text or url_text
    parts.push({ text: `${instruction}\n\nRecipe source:\n${content}` });
  }

  const geminiModel = 'gemini-3.5-flash-lite';
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${env.GEMINI_API_KEY}`;
  console.log('Calling Gemini:', geminiUrl.replace(env.GEMINI_API_KEY, 'REDACTED'));

  const result = await callGeminiWithRetry(geminiUrl, parts);
  return cors(JSON.stringify(result));
}

// ── /fetch-url ────────────────────────────────────────────────
async function handleFetchUrl(request) {
  const body = await request.json();
  const targetUrl = body.url;
  if (!targetUrl) return cors(JSON.stringify({ error: 'Missing url' }), 400);

  let parsed;
  try { parsed = new URL(targetUrl); } catch {
    return cors(JSON.stringify({ error: 'Invalid URL' }), 400);
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return cors(JSON.stringify({ error: 'Only http/https URLs allowed' }), 400);
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RecipeBot/1.0)', 'Accept': 'text/html' },
    });
    if (!resp.ok) throw new Error(`Page returned ${resp.status}`);
    const html = await resp.text();
    const text = stripHtml(html).slice(0, 12000);
    return cors(JSON.stringify({ text }));
  } catch (err) {
    return cors(JSON.stringify({ error: `Could not fetch page: ${err.message}` }), 502);
  }
}

// ── Gemini call with retry ────────────────────────────────────
async function callGeminiWithRetry(url, parts, maxAttempts = 4) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 1500 },
        }),
      });
    } catch (networkErr) {
      return { error: 'Could not reach the AI service. Check your connection.' };
    }

    if (response.ok) {
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Strip any accidental markdown fences
      const clean = raw.trim().replace(/^```json\s*/i, '').replace(/^```/, '').replace(/```\s*$/, '').trim();
      const first = clean.indexOf('{'), last = clean.lastIndexOf('}');
      const jsonStr = (first !== -1 && last !== -1) ? clean.slice(first, last + 1) : clean;
      try {
        return { recipe: JSON.parse(jsonStr) };
      } catch {
        return { error: 'AI returned an unreadable response — fill in the details manually.' };
      }
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < maxAttempts) {
      await new Promise(r => setTimeout(r, 700 * Math.pow(2, attempt - 1)));
      continue;
    }

    let errBody = '';
    try { errBody = await response.text(); } catch {}
    if (response.status === 429) lastErr = { error: 'AI service is busy. Wait a moment and try again.' };
    else if (response.status === 400) lastErr = { error: `AI bad request: ${errBody.slice(0,200)}` };
    else if (response.status === 403) lastErr = { error: `AI API key issue: ${errBody.slice(0,200)}` };
    else lastErr = { error: `AI error ${response.status}: ${errBody.slice(0,300)}` };
    break;
  }
  return lastErr || { error: 'Unknown error contacting AI service.' };
}

// ── Strip HTML ────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ').trim();
}
