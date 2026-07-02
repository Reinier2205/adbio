// functions/api/share.js
// Uses native fetch for all Supabase calls — no npm SDK needed, works on
// Cloudflare Pages Functions without a bundler step.
import { parseHTML } from 'linkedom';

// TODO: Rate limiting — recommended future enhancement: per-IP and per-token
// limiting (e.g. Cloudflare Rate Limiting rules or a KV-based counter)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/** Returns a JSON Response that always includes CORS headers. */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Extracts the raw Bearer token string, or null if absent/malformed. */
function extractBearerToken(request) {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length).trim();
}

/**
 * SHA-256 hex digest of a token string.
 * The iOS Shortcut transmits the token as the hex string the user copied, so
 * we encode that string to UTF-8 bytes before hashing — matching exactly what
 * the browser-side ApiAccessSection stores.
 */
async function hashToken(rawToken) {
  const data = new TextEncoder().encode(rawToken);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Looks up a user whose user_metadata.api_token_hash matches tokenHash.
 * Uses the Supabase Auth Admin REST API with the service role key.
 * Returns the user object or null.
 */
async function lookupUserByTokenHash(supabaseUrl, serviceRoleKey, tokenHash) {
  // Fetch page 1 of users (up to 1000). For apps with >1000 users, add pagination.
  const resp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  if (!resp.ok) return null;
  const data = await resp.json();
  const users = data.users ?? [];
  return users.find(u => u.user_metadata?.api_token_hash === tokenHash) ?? null;
}

/**
 * Inserts a link into public.links using the Supabase PostgREST API.
 * Returns { id, url, title } on success, throws on error.
 */
async function insertLink(supabaseUrl, serviceRoleKey, link) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/links`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(link),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(err);
  }
  const rows = await resp.json();
  return rows[0];
}

/**
 * Fetches OG metadata for a URL using linkedom. Never throws — errors are
 * caught by the caller and the link is still saved with a fallback title.
 * Hard timeout of 5 seconds to avoid hanging the Cloudflare Worker.
 */
async function fetchMetadata(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaveMyLinks/1.0)' },
      redirect: 'follow',
      signal: controller.signal,
    });
    if (!resp.ok) return { title: '', imageUrl: '' };
    const html = await resp.text();
    const { document } = parseHTML(html);
    const title =
      document.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
      document.querySelector('title')?.textContent ||
      '';
    let imageUrl =
      document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    if (imageUrl) {
      try { imageUrl = new URL(imageUrl, url).href; } catch { imageUrl = ''; }
    }
    return { title: title.trim(), imageUrl };
  } finally {
    clearTimeout(timer);
  }
}

/** Handle CORS preflight. */
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/** Handle POST /api/share */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Validate required env vars
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // Auth — extract and validate Bearer token
  const rawToken = extractBearerToken(request);
  if (rawToken === null) {
    const hasHeader = !!request.headers.get('Authorization');
    return json(
      { error: hasHeader ? 'Invalid authorization format' : 'Missing authorization header' },
      401
    );
  }

  const tokenHash = await hashToken(rawToken);
  const user = await lookupUserByTokenHash(supabaseUrl, serviceRoleKey, tokenHash);
  if (!user) {
    return json({ error: 'Invalid token' }, 401);
  }

  // Parse and validate request body
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.url || typeof body.url !== 'string' || body.url.trim() === '') {
    return json({ error: 'url is required' }, 400);
  }

  const url = body.url.trim();
  const title = (typeof body.title === 'string' ? body.title : '').trim();
  const notes = typeof body.notes === 'string' ? body.notes : '';
  const tags = Array.isArray(body.tags) ? body.tags : [];

  // Optional metadata scraping
  let finalTitle = title;
  let favicon = null;

  if (!finalTitle) {
    try {
      const meta = await fetchMetadata(url);
      if (meta.title) finalTitle = meta.title;
      if (meta.imageUrl) favicon = meta.imageUrl;
    } catch (e) {
      console.warn('MetadataScraper failed (non-fatal):', e?.message ?? e);
    }
  }

  if (!finalTitle) finalTitle = url;

  // Insert link
  try {
    const inserted = await insertLink(supabaseUrl, serviceRoleKey, {
      user_id: user.id,
      url,
      title: finalTitle,
      favicon,
      notes,
      tags,
      starred: false,
    });
    return json({ success: true, link: { id: inserted.id, url: inserted.url, title: inserted.title } });
  } catch (e) {
    console.error('Link insertion error:', e?.message ?? e);
    return json({ error: 'Failed to save link' }, 500);
  }
}
