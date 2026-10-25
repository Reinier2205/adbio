const TYPE_MAP = {
  object: 'OBJECT',
  string: 'STRING',
  number: 'NUMBER',
  integer: 'INTEGER',
  boolean: 'BOOLEAN',
  array: 'ARRAY',
};

export function toGeminiSchema(node) {
  if (!node || typeof node !== 'object') return { type: 'STRING' };
  const rawType = Array.isArray(node.type) ? node.type[0] : node.type;
  const type = TYPE_MAP[String(rawType || 'object').toLowerCase()] || 'OBJECT';
  const out = { type };
  if (node.description) out.description = node.description;
  if (type === 'OBJECT' && node.properties) {
    out.properties = {};
    for (const [key, value] of Object.entries(node.properties)) {
      out.properties[key] = toGeminiSchema(value);
    }
    if (Array.isArray(node.required)) out.required = node.required;
  }
  if (type === 'ARRAY' && node.items) out.items = toGeminiSchema(node.items);
  if (Array.isArray(node.enum)) out.enum = node.enum.map(String);
  return out;
}

function extractText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('').trim();
}

export async function generateWithGemini({ apiKey, model, prompt, schema, imageBase64, mimeType }) {
  const parts = [{ text: prompt }];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: imageBase64,
      },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(schema),
      },
    }),
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
  if (!text) throw new Error('Gemini returned an empty response');

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Gemini returned JSON that could not be parsed');
  }
}
