import { R2_BUCKET_NAME, KV_NAMESPACE } from './env';

export default {
  async fetch(request) {
    if (request.method === 'POST') {
      const form = await request.formData();
      const file = form.get('file');
      const player = form.get('player');
      const square = form.get('square');

      if (!file || !player || !square) return new Response("Missing fields", { status: 400 });

      const filename = `${player}_${square}_${Date.now()}_${file.name}`;
      const object = await R2_BUCKET_NAME.put(filename, file.stream());

      const url = `https://<YOUR_R2_PUBLIC_URL>/${filename}`;

      // Store URL in KV for tracking
      await KV_NAMESPACE.put(`${player}_${square}`, url);

      return new Response(JSON.stringify({ url }), { headers: { 'Content-Type': 'application/json' } });
    }
    return new Response("OK");
  }
};
