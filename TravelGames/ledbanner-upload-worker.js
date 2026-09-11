/**
 * Cloudflare Worker — LED Banner Photo Upload Proxy
 *
 * Accepts a multipart/form-data POST with a single field "photo" (image file).
 * Uploads it to Supabase Storage (ledbanner-photos bucket) using the service_role
 * key, then returns the public URL as JSON.
 *
 * The service_role key lives only in this Worker's environment variables and is
 * never exposed to the browser.
 *
 * Deploy:
 *   1. Create a new Worker at https://dash.cloudflare.com/ -> Workers & Pages
 *   2. Paste this file as the Worker script
 *   3. Add these environment variables (Settings -> Variables):
 *        SUPABASE_URL        = https://yvisilurjrwzlbzbyzhc.supabase.co
 *        SUPABASE_SERVICE_KEY = <service_role key from supabase projects api-keys>
 *   4. Note the worker URL (e.g. https://ledbanner-upload.<account>.workers.dev)
 *      and set UPLOAD_WORKER_URL in ledbanner.html to that value.
 *
 * Files are stored as ledbanner-photos/<uuid>.<ext> and are publicly readable.
 */

const BUCKET = 'ledbanner-photos';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'POST only' }, 405);
    }

    let formData;
    try {
      formData = await request.formData();
    } catch {
      return json({ error: 'Expected multipart/form-data' }, 400);
    }

    const photo = formData.get('photo');
    if (!photo || typeof photo === 'string') {
      return json({ error: 'Missing photo field' }, 400);
    }

    // Derive extension from MIME type
    const mime = photo.type || 'image/jpeg';
    const extMap = {
      'image/jpeg': 'jpg',
      'image/png':  'png',
      'image/webp': 'webp',
      'image/gif':  'gif',
    };
    const ext = extMap[mime] ?? 'jpg';

    // Generate a unique filename
    const filename = `${crypto.randomUUID()}.${ext}`;
    const storagePath = filename;

    const arrayBuffer = await photo.arrayBuffer();

    // Upload to Supabase Storage via REST API
    const uploadUrl = `${env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': mime,
        'x-upsert': 'false',
      },
      body: arrayBuffer,
    });

    if (!uploadRes.ok) {
      const body = await uploadRes.text();
      return json({ error: `Supabase upload failed: ${body}` }, 502);
    }

    // Build the public URL
    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return json({ url: publicUrl }, 200);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
