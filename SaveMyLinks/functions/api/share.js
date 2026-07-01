// functions/api/share.js
import { createClient } from '@supabase/supabase-js';
import { parseHTML } from 'linkedom';

// TODO: Rate limiting — recommended future enhancement: per-IP and per-token limiting (e.g. Cloudflare Rate Limiting rules or a KV-based counter)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Returns a JSON Response that always includes CORS headers.
 * @param {unknown} body      - Value to serialize as JSON.
 * @param {number}  status    - HTTP status code (default 200).
 * @param {Record<string,string>} extraHeaders - Additional headers to merge in.
 */
function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Extracts the raw Bearer token from the Authorization header.
 * Returns the token string (the part after "Bearer ") or null if the header
 * is absent or does not start with "Bearer ".
 * @param {Request} request
 * @returns {string|null}
 */
function extractBearerToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice('Bearer '.length);
}

/**
 * Hashes a raw token string using SHA-256 and returns a lowercase hex digest.
 * NOTE: The iOS Shortcut sends the token as a string; we encode it to bytes
 * before hashing. The browser-side ApiAccessSection hashes the raw Uint8Array
 * directly — these are intentionally different inputs (string bytes vs raw bytes)
 * because the Shortcut transmits the hex-encoded token string over the wire.
 * @param {string} rawToken
 * @returns {Promise<string>}
 */
async function hashToken(rawToken) {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawToken);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Looks up a user in Supabase Auth by their stored api_token_hash.
 * Uses the Admin API (service role) to list all users and filter by metadata.
 * Returns the matching user object or null if no match is found.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabaseAdminClient
 * @param {string} tokenHash - Lowercase hex SHA-256 digest to match against.
 * @returns {Promise<object|null>}
 */
async function lookupUserByTokenHash(supabaseAdminClient, tokenHash) {
  const { data, error } = await supabaseAdminClient.auth.admin.listUsers();
  if (error || !data) return null;
  const match = data.users.find(
    user => user.user_metadata?.api_token_hash === tokenHash
  );
  return match ?? null;
}

/**
 * Optionally fetches Open Graph metadata for a URL using linkedom.
 * Returns { title, imageUrl } — both may be empty strings if scraping fails or
 * if the page has no OG tags. Never throws; errors are caught by the caller.
 * @param {string} url
 * @returns {Promise<{ title: string, imageUrl: string }>}
 */
async function fetchMetadata(url) {
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaveMyLinks/1.0)' },
    redirect: 'follow',
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
}

/**
 * Handle CORS preflight requests.
 * Returns HTTP 204 with no body and the required CORS headers.
 */
export async function onRequestOptions(_context) {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Handle POST /api/share requests.
 * Authenticates the request via Bearer token, optionally scrapes OG metadata,
 * inserts a new row into public.links, and returns the saved link data.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // Requirement 4.2 / 4.3 — validate env secrets are present
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server misconfiguration' }, 500);
  }

  // Initialise the service-role Supabase client (never use the anon key here)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Requirement 1.1 — reject missing Authorization header
  // Requirement 1.2 — reject malformed Authorization header
  const rawToken = extractBearerToken(request);
  if (rawToken === null) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization header' }, 401);
    }
    return json({ error: 'Invalid authorization format' }, 401);
  }

  // Requirement 1.5 — hash the raw token; never log or store the raw value
  const tokenHash = await hashToken(rawToken);

  // Requirement 1.3 — reject tokens that don't match any stored hash
  const user = await lookupUserByTokenHash(supabaseAdmin, tokenHash);
  if (!user) {
    return json({ error: 'Invalid token' }, 401);
  }

  // --- Body Validation (Requirement 2.x) ---

  // Requirement 2.1 — reject non-JSON bodies
  let body;
  try {
    body = await request.json();
  } catch (_e) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Requirement 2.2 — require a non-empty url field
  if (!body.url || typeof body.url !== 'string' || body.url.trim() === '') {
    return json({ error: 'url is required' }, 400);
  }

  // Requirement 2.3 — normalise optional fields
  const url = body.url.trim();
  const title = (typeof body.title === 'string' ? body.title : '').trim();
  const notes = typeof body.notes === 'string' ? body.notes : '';
  const tags = Array.isArray(body.tags) ? body.tags : [];

  // --- Metadata Scraping (Requirement 3.2 / 3.3 / 3.4) ---
  let finalTitle = title; // may be empty if not provided in body
  let favicon = null;

  if (!finalTitle) {
    try {
      const meta = await fetchMetadata(url);
      if (meta.title) finalTitle = meta.title;
      if (meta.imageUrl) favicon = meta.imageUrl;
    } catch (e) {
      // Requirement 3.4 — scraper failure is non-fatal
      console.warn('MetadataScraper failed (non-fatal):', e?.message ?? e);
    }
  }

  // Requirement 3.2 — final title fallback: url string
  if (!finalTitle) finalTitle = url;

  // --- Link Insertion (Requirement 3.1 / 3.5 / 3.6) ---
  const { data: insertedLink, error: insertError } = await supabaseAdmin
    .from('links')
    .insert({
      user_id: user.id,
      url,
      title: finalTitle,
      favicon,
      notes,
      tags,
      starred: false,
    })
    .select('id, url, title')
    .single();

  if (insertError) {
    console.error('Link insertion error:', insertError.message);
    return json({ error: 'Failed to save link' }, 500);
  }

  // Requirement 3.5 — success response
  return json({
    success: true,
    link: {
      id: insertedLink.id,
      url: insertedLink.url,
      title: insertedLink.title,
    },
  }, 200);
}
