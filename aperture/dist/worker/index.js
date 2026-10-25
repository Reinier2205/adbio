const id = "demo-intake";
const title = "Demo intake";
const description = "Paste text and/or drop an image. Gemini extracts a title, summary, date, and list of items. Review the JSON, then save.";
const inputs = "text + image";
const demoManifest = {
  id,
  title,
  description,
  inputs
};
const demoPrompt = 'You extract structured notes from messy human input.\r\n\r\nRules:\r\n- Use only what is present in the text and/or image. Do not invent facts.\r\n- If a field is unknown, use an empty string or an empty array.\r\n- Dates must be ISO 8601 (YYYY-MM-DD) when you can read a date; otherwise use "".\r\n- items should be concrete extracted bullets, not a rewrite of the whole input.\r\n- title should be short (under 80 characters).\r\n- summary should be 1–3 sentences.\r\n\r\nInput text:\r\n{{input_text}}\r\n';
const type = "object";
const properties = { "title": { "type": "string", "description": "Short title for this capture" }, "summary": { "type": "string", "description": "One to three sentence summary" }, "date": { "type": "string", "description": "ISO date YYYY-MM-DD if present, else empty" }, "items": { "type": "array", "items": { "type": "string" }, "description": "Concrete extracted bullets" } };
const required = ["title", "summary", "date", "items"];
const demoSchema = {
  type,
  properties,
  required
};
const catalog = {
  [demoManifest.id]: {
    manifest: demoManifest,
    prompt: demoPrompt,
    schema: demoSchema
  }
};
function getSolution(id2) {
  return catalog[id2] || null;
}
const TYPE_MAP = {
  object: "OBJECT",
  string: "STRING",
  number: "NUMBER",
  integer: "INTEGER",
  boolean: "BOOLEAN",
  array: "ARRAY"
};
function toGeminiSchema(node) {
  if (!node || typeof node !== "object") return { type: "STRING" };
  const rawType = Array.isArray(node.type) ? node.type[0] : node.type;
  const type2 = TYPE_MAP[String(rawType || "object").toLowerCase()] || "OBJECT";
  const out = { type: type2 };
  if (node.description) out.description = node.description;
  if (type2 === "OBJECT" && node.properties) {
    out.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      out.properties[key] = toGeminiSchema(value);
    }
    if (Array.isArray(node.required)) out.required = node.required;
  }
  if (type2 === "ARRAY" && node.items) out.items = toGeminiSchema(node.items);
  if (Array.isArray(node.enum)) out.enum = node.enum.map(String);
  return out;
}
function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.filter((part) => part.text && !part.thought).map((part) => part.text).join("").trim();
}
async function generateWithGemini({ apiKey, model, prompt, schema, imageBase64, mimeType }) {
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64
      }
    });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      signal: AbortSignal.timeout(4e4),
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: toGeminiSchema(schema),
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingLevel: "low" }
        }
      })
    });
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") {
      throw new Error("Gemini timed out. Try a smaller image, or generate from text only.");
    }
    throw err;
  }
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    const message = data?.error?.message || `Gemini request failed (${res.status})`;
    throw new Error(message);
  }
  const text = extractText(data);
  if (!text) throw new Error("Gemini returned an empty response");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned JSON that could not be parsed");
  }
}
const MAX_IMAGE_CHARS = 55e5;
function json(body, status = 200) {
  return Response.json(body, { status });
}
function fillPrompt(template, inputText) {
  return String(template || "").replaceAll("{{input_text}}", inputText || "(no text provided)");
}
function parsePayload(row) {
  let payload = row.payload;
  if (typeof payload === "string") {
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
    payload
  };
}
async function handleGenerate(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);
  const solutionId = String(body.solutionId || "").trim();
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.replace(/\s/g, "") : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/jpeg";
  const solution = getSolution(solutionId);
  if (!solution) return json({ error: `Unknown solution: ${solutionId}` }, 404);
  if (!text && !imageBase64) return json({ error: "Provide text and/or an image" }, 400);
  if (imageBase64 && imageBase64.length > MAX_IMAGE_CHARS) {
    return json({ error: "Image is too large. Use a smaller screenshot." }, 413);
  }
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({
      error: "GEMINI_API_KEY is not set. Add it to .dev.vars locally or run wrangler secret put GEMINI_API_KEY."
    }, 503);
  }
  const model = env.GEMINI_MODEL || "gemini-3.8-flash";
  const prompt = fillPrompt(solution.prompt, text);
  try {
    const output = await generateWithGemini({
      apiKey,
      model,
      prompt,
      schema: solution.schema,
      imageBase64: imageBase64 || null,
      mimeType
    });
    return json({ solutionId, output });
  } catch (err) {
    console.error(JSON.stringify({ event: "gemini_error", message: String(err?.message || err) }));
    return json({ error: err.message || "Gemini request failed" }, 502);
  }
}
async function listRecords(url, env) {
  const solutionId = url.searchParams.get("solution");
  if (!solutionId) return json({ error: "Missing solution query parameter" }, 400);
  const { results } = await env.DB.prepare(
    `SELECT id, solution_id, created_at, title, payload
     FROM records WHERE solution_id = ?1
     ORDER BY created_at DESC, id DESC`
  ).bind(solutionId).all();
  return json((results || []).map(parsePayload));
}
async function createRecord(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);
  const solutionId = String(body.solutionId || "").trim();
  const title2 = String(body.title || "").trim();
  const payload = body.payload;
  if (!solutionId || payload == null) {
    return json({ error: "Missing required fields: solutionId, payload" }, 400);
  }
  if (!getSolution(solutionId)) return json({ error: `Unknown solution: ${solutionId}` }, 404);
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const payloadText = JSON.stringify(payload);
  const result = await env.DB.prepare(
    `INSERT INTO records (solution_id, created_at, title, payload) VALUES (?1, ?2, ?3, ?4)`
  ).bind(solutionId, createdAt, title2, payloadText).run();
  const id2 = result.meta.last_row_id;
  return json({ id: id2, solutionId, createdAt, title: title2, payload }, 201);
}
async function deleteRecord(id2, env) {
  if (!id2 || Number.isNaN(Number(id2))) return json({ error: "Invalid record id" }, 400);
  await env.DB.prepare(`DELETE FROM records WHERE id = ?1`).bind(Number(id2)).run();
  return new Response(null, { status: 204 });
}
const index = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === "/api/health" && request.method === "GET") {
        return json({ ok: true, app: "aperture" });
      }
      if (path === "/api/generate" && request.method === "POST") {
        return await handleGenerate(request, env);
      }
      if (path === "/api/records" && request.method === "GET") {
        return await listRecords(url, env);
      }
      if (path === "/api/records" && request.method === "POST") {
        return await createRecord(request, env);
      }
      const deleted = path.match(/^\/api\/records\/([^/]+)$/);
      if (deleted && request.method === "DELETE") {
        return await deleteRecord(deleted[1], env);
      }
      if (path.startsWith("/api/")) {
        return json({ error: "Not found" }, 404);
      }
      return new Response(null, { status: 404 });
    } catch (err) {
      console.error(JSON.stringify({ event: "worker_error", message: String(err?.message || err) }));
      return json({ error: "Internal error" }, 500);
    }
  }
};
const workerEntry = index ?? {};
export {
  workerEntry as default
};
//# sourceMappingURL=index.js.map
