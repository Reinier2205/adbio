const id$2 = "demo-intake";
const title$2 = "Demo intake";
const description$2 = "Paste text and/or drop an image. Gemini extracts a title, summary, date, and list of items. Review the JSON, then save.";
const inputs$2 = "text + image";
const demoManifest = {
  id: id$2,
  title: title$2,
  description: description$2,
  inputs: inputs$2
};
const demoPrompt = 'You extract structured notes from messy human input.\r\n\r\nRules:\r\n- Use only what is present in the text and/or image. Do not invent facts.\r\n- If a field is unknown, use an empty string or an empty array.\r\n- Dates must be ISO 8601 (YYYY-MM-DD) when you can read a date; otherwise use "".\r\n- items should be concrete extracted bullets, not a rewrite of the whole input.\r\n- title should be short (under 80 characters).\r\n- summary should be 1–3 sentences.\r\n\r\nInput text:\r\n{{input_text}}\r\n';
const type$2 = "object";
const properties$2 = { "title": { "type": "string", "description": "Short title for this capture" }, "summary": { "type": "string", "description": "One to three sentence summary" }, "date": { "type": "string", "description": "ISO date YYYY-MM-DD if present, else empty" }, "items": { "type": "array", "items": { "type": "string" }, "description": "Concrete extracted bullets" } };
const required$2 = ["title", "summary", "date", "items"];
const demoSchema = {
  type: type$2,
  properties: properties$2,
  required: required$2
};
const id$1 = "song-creator";
const title$1 = "Song Creator";
const description$1 = "Paste a Meta AI song analysis and your creative direction — get a Suno-ready song design back.";
const inputs$1 = "text";
const songManifest = {
  id: id$1,
  title: title$1,
  description: description$1,
  inputs: inputs$1
};
const songPrompt = `\uFEFFYou are a professional songwriter and Suno AI expert. Your job is to analyse a song description and write complete, ready-to-use lyrics for a new original song inspired by it.

The input contains three parts:
1. A song analysis (from Meta AI or similar) describing an existing song
2. The user's creative direction for their own new song
3. The song structure the user wants (e.g. intro, 2 verses, chorus, bridge, outro)

Rules:
- Extract the original song's details from the analysis only. Do not invent facts about the original.
- If original info is unknown, use an empty string or empty array.
- For original_style: write Suno-compatible style tags (e.g. "afrobeats, upbeat, acoustic guitar, 95bpm, warm male vocals").
- For new_style: adapt the original style tags to fit the user's creative direction. Keep the musical DNA, adjust mood/genre to match their idea.
- For new_title: suggest a catchy, original title that fits the user's theme.
- For new_lyrics: write COMPLETE song lyrics — not a prompt, not a description, actual words the singer will sing. Follow the song structure the user requested. Use Suno section tags exactly as follows on their own line before each section:
  [Intro], [Verse 1], [Verse 2], [Verse 3], [Pre-Chorus], [Chorus], [Bridge], [Hook], [Outro], [Break], [Instrumental]
  Write 4–8 lines per section. Make the lyrics vivid, personal, and emotionally resonant. The chorus should be catchy and memorable. Rhyme scheme should feel natural, not forced.

Output fields:
- original_title: title of the original song
- original_style: Suno style tags for the original
- original_lyrics_themes: key themes and hooks from the original
- new_title: your suggested title for the user's new song
- new_style: Suno style tags for the new song
- new_lyrics: the complete lyrics with Suno section tags

{{input_text}}\r
`;
const type$1 = "object";
const properties$1 = { "original_title": { "type": "string", "description": "Title of the original song" }, "original_style": { "type": "string", "description": "Suno style tags describing the original song (genre, mood, instruments, tempo)" }, "original_lyrics_themes": { "type": "array", "items": { "type": "string" }, "description": "Key lyrical themes and hooks from the original song" }, "new_title": { "type": "string", "description": "Suggested title for the new song" }, "new_style": { "type": "string", "description": "Suno style prompt for the new song, blending the original style with the user's creative direction" }, "new_lyrics": { "type": "string", "description": "Complete song lyrics with Suno section tags such as [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro]. Each section on its own line followed by the lyrics for that section." } };
const required$1 = ["original_title", "original_style", "original_lyrics_themes", "new_title", "new_style", "new_lyrics"];
const songSchema = {
  type: type$1,
  properties: properties$1,
  required: required$1
};
const id = "image-transpose";
const title = "Photo Transpose";
const description = "Map your face onto any scene — upload a scene image and your photo, then get a ready-to-use generation prompt.";
const inputs = "image";
const transposeManifest = {
  id,
  title,
  description,
  inputs
};
const transposePrompt = `You are an expert AI image analyst and prompt engineer. Your job is to analyse a scene image and extract a detailed design code JSON that captures everything needed to recreate that scene with a different person's face transposed onto it.

Rules:
- Analyse only what is visible in the image. Do not invent details that are not present.
- Describe the composition, lighting, color palette, style, and all key visual elements precisely.
- Extract the subject's current attributes (pose, clothing, hair) so they can be preserved.
- Build an identity_preservation block that locks in the subject's facial structure for identity transfer.
- The final_generation_prompt must be a single, complete, paste-ready prompt for an image generation model. It must:
  - Open with "A photorealistic [style] image of [subject description with MY FACE transposed onto the subject]"
  - Include all scene elements, lighting, color palette, and composition details
  - Include the identity preservation rules as explicit directives (e.g. "preserve exact facial features from reference photo: unchanged nose, lips, eyes, face oval, and natural asymmetry")
  - End with "Ultra high resolution, cinematic quality."

Output fields:
- subject_identity: Facial and physical attributes of the subject in the scene (gender, approximate age, facial features, hair, pose)
- target_scene: Composition, style, color palette, lighting, and all visual elements of the scene
- identity_preservation_rules: Specific rules to preserve facial identity during transposition (facial_structure_lock, natural_asymmetry, hair_blending_mode)
- final_generation_prompt: The complete, unified prompt string ready to paste into an image generation model

{{input_text}}
`;
const type = "object";
const properties = { "subject_identity": { "type": "object", "description": "Facial and physical attributes of the subject in the scene image", "properties": { "gender": { "type": "string", "description": "Gender of the subject" }, "approximate_age": { "type": "string", "description": "Estimated age range" }, "facial_features": { "type": "string", "description": "Description of facial structure, expression, and defining features" }, "hair": { "type": "string", "description": "Hair color, length, texture, and style" }, "pose": { "type": "string", "description": "Body position and posture of the subject" }, "clothing": { "type": "string", "description": "What the subject is wearing" } }, "required": ["gender", "approximate_age", "facial_features", "hair", "pose", "clothing"] }, "target_scene": { "type": "object", "description": "Visual design code of the scene image", "properties": { "subject": { "type": "string", "description": "One-sentence description of the scene's main subject and action" }, "composition": { "type": "string", "description": "Framing, angle, depth of field, and compositional choices" }, "style": { "type": "string", "description": "Visual style — e.g. cinematic photography, digital painting, AI-generated realism" }, "lighting": { "type": "string", "description": "Lighting type, direction, and mood" }, "color_palette_primary": { "type": "string", "description": "Dominant colors in hex or descriptive names" }, "color_palette_secondary": { "type": "string", "description": "Supporting colors in hex or descriptive names" }, "elements": { "type": "string", "description": "Key visual elements present in the scene, comma-separated" }, "background": { "type": "string", "description": "Background description" } }, "required": ["subject", "composition", "style", "lighting", "color_palette_primary", "elements", "background"] }, "identity_preservation_rules": { "type": "object", "description": "Rules to preserve facial identity during transposition", "properties": { "priority": { "type": "string", "description": "Identity preservation priority level" }, "facial_structure_lock": { "type": "string", "description": "Instruction to lock facial proportions, eye shape, nose structure, and jawline" }, "eyes": { "type": "string", "description": "Eye shape and color preservation rule" }, "nose_shape": { "type": "string", "description": "Nose shape preservation rule" }, "lips_shape": { "type": "string", "description": "Lip shape preservation rule" }, "face_oval": { "type": "string", "description": "Face oval / jawline preservation rule" }, "natural_asymmetry": { "type": "string", "description": "Natural facial asymmetry preservation rule" }, "hair_blending_mode": { "type": "string", "description": "How to blend reference hair with scene subject hair" }, "skin_tone_adaptation": { "type": "string", "description": "Skin tone blending approach for the new lighting context" } }, "required": ["priority", "facial_structure_lock", "natural_asymmetry"] }, "final_generation_prompt": { "type": "string", "description": "Complete, paste-ready prompt for an image generation model combining the scene design and identity transfer directives" } };
const required = ["subject_identity", "target_scene", "identity_preservation_rules", "final_generation_prompt"];
const transposeSchema = {
  type,
  properties,
  required
};
const catalog = {
  [demoManifest.id]: {
    manifest: demoManifest,
    prompt: demoPrompt,
    schema: demoSchema
  },
  [songManifest.id]: {
    manifest: songManifest,
    prompt: songPrompt,
    schema: songSchema
  },
  [transposeManifest.id]: {
    manifest: transposeManifest,
    prompt: transposePrompt,
    schema: transposeSchema
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
  return parts.map((part) => part.text || "").join("").trim();
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
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    signal: AbortSignal.timeout(45e3),
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: toGeminiSchema(schema),
        maxOutputTokens: 2048
      }
    })
  });
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
  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
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
async function updateRecord(id2, request, env) {
  if (!id2 || Number.isNaN(Number(id2))) return json({ error: "Invalid record id" }, 400);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "Invalid JSON body" }, 400);
  const fields = [];
  const binds = [];
  if (body.title != null) {
    fields.push("title = ?" + (binds.length + 1));
    binds.push(String(body.title));
  }
  if (body.payload != null) {
    fields.push("payload = ?" + (binds.length + 1));
    binds.push(JSON.stringify(body.payload));
  }
  if (!fields.length) return json({ error: "Nothing to update" }, 400);
  binds.push(Number(id2));
  await env.DB.prepare(`UPDATE records SET ${fields.join(", ")} WHERE id = ?${binds.length}`).bind(...binds).run();
  const row = await env.DB.prepare("SELECT id, solution_id, created_at, title, payload FROM records WHERE id = ?1").bind(Number(id2)).first();
  if (!row) return json({ error: "Record not found" }, 404);
  return json(parsePayload(row));
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
      const patched = path.match(/^\/api\/records\/([^/]+)$/);
      if (patched && request.method === "PATCH") {
        return await updateRecord(patched[1], request, env);
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
