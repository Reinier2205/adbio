/**
 * worker/whatsapp.js
 * Encapsulates all Meta WhatsApp webhook and messaging logic.
 */

import { generateWithGemini } from './gemini.js';

/**
 * Fill a prompt template by replacing {{input_text}} with the actual input.
 * @param {string} template
 * @param {string} inputText
 * @returns {string}
 */
function fillPrompt(template, inputText) {
  return String(template || '').replaceAll('{{input_text}}', inputText || '(no text provided)');
}

/**
 * Extract the first text message from a Meta webhook payload.
 * Returns null for non-message events (status updates, etc.).
 * @param {object} body - Parsed JSON webhook body
 * @returns {{ from: string, text: string, waMessageId: string } | null}
 */
export function parseWebhookBody(body) {
  // Defensively navigate Meta's nested envelope using optional chaining.
  // Any missing or empty level returns null — never throws.

  const entries = body?.entry;
  if (!entries || entries.length === 0) return null;

  const changes = entries[0]?.changes;
  if (!changes || changes.length === 0) return null;

  const value = changes[0]?.value;
  const messages = value?.messages;
  if (!messages || messages.length === 0) return null;

  const msg = messages[0];
  if (msg?.type !== 'text') return null;

  return {
    from: msg.from,
    text: msg.text?.body,
    waMessageId: msg.id,
  };
}

/**
 * Handle Meta webhook verification (GET handshake).
 * @param {URL} url - Request URL with hub.* query params
 * @param {string} verifyToken - Expected token from env.WA_VERIFY_TOKEN
 * @returns {Response} 200 with hub.challenge, 400 if challenge absent, 403 otherwise
 */
export function verifyWebhook(url, verifyToken) {
  const mode      = url.searchParams.get('hub.mode');
  const token     = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // Treat absent/falsy verifyToken as a non-matching token → 403.
  if (!verifyToken || mode !== 'subscribe' || token !== verifyToken) {
    return new Response('Forbidden', { status: 403 });
  }

  // Mode matches and token matches — check for challenge presence.
  if (!challenge) {
    return new Response('Bad Request', { status: 400 });
  }

  return new Response(challenge, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * Send a WhatsApp text message via Meta Cloud API.
 * @param {{ phoneNumberId: string, to: string, body: string, accessToken: string }} opts
 * @returns {Promise<void>}
 * @throws {Error} When Meta returns a non-2xx response
 */
export async function sendWhatsAppMessage({ phoneNumberId, to, body, accessToken }) {
  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!response.ok) {
    throw new Error(`Meta API returned status ${response.status}`);
  }
}

/**
 * Handle inbound WhatsApp message (POST).
 * @param {Request} request
 * @param {object} env - Worker env bindings (DB, GEMINI_API_KEY, WA_ACCESS_TOKEN, etc.)
 * @param {object} solution - Catalog entry: { manifest, prompt, schema, autoReply }
 * @returns {Promise<Response>} Always 200 — Meta requires fast ACK
 */
export async function handleIncoming(request, env, solution) {
  // Step 1: Parse request body — if it fails return 200 immediately.
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Step 2: Extract message from webhook envelope — null means non-message event.
  const message = parseWebhookBody(body);
  if (!message) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  // Step 3: Call Gemini.
  let geminiOutput = null;
  try {
    geminiOutput = await generateWithGemini({
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL || 'gemini-2.5-flash',
      prompt: fillPrompt(solution.prompt, message.text),
      schema: solution.schema,
      imageBase64: null,
      mimeType: null,
    });
  } catch (err) {
    console.error(JSON.stringify({ event: 'gemini_error', message: err.message }));
    geminiOutput = null;
  }

  // Step 4: Insert inbound row into D1.
  try {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO whatsapp_messages
        (solution_id, from_number, direction, body, gemini_output, wa_message_id, timestamp)
       VALUES (?1, ?2, 'in', ?3, ?4, ?5, ?6)`
    )
      .bind(
        solution.manifest.id,
        message.from,
        message.text,
        JSON.stringify(geminiOutput),
        message.waMessageId,
        new Date().toISOString()
      )
      .run();
  } catch (err) {
    console.error(JSON.stringify({ event: 'db_error', message: err.message }));
    // Do not rethrow — continue processing.
  }

  // Step 5: Check for access token before attempting send.
  if (!env.WA_ACCESS_TOKEN) {
    console.error(JSON.stringify({ event: 'missing_token', message: 'WA_ACCESS_TOKEN is not set' }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  // Step 6: Get reply text from solution.
  const replyText = solution.autoReply(geminiOutput, message);

  // Step 7: Send outbound message if reply is non-empty.
  if (replyText && typeof replyText === 'string') {
    try {
      await sendWhatsAppMessage({
        phoneNumberId: solution.manifest.phone_number_id,
        to: message.from,
        body: replyText,
        accessToken: env.WA_ACCESS_TOKEN,
      });

      // Insert outbound row on success.
      try {
        await env.DB.prepare(
          `INSERT INTO whatsapp_messages
            (solution_id, from_number, direction, body, gemini_output, wa_message_id, timestamp)
           VALUES (?1, ?2, 'out', ?3, null, 'out-' || ?4, ?5)`
        )
          .bind(
            solution.manifest.id,
            message.from,
            replyText,
            message.waMessageId,
            new Date().toISOString()
          )
          .run();
      } catch (err) {
        console.error(JSON.stringify({ event: 'db_outbound_error', message: err.message }));
      }
    } catch (err) {
      // Send failed — log and skip outbound insert.
      console.error(JSON.stringify({ event: 'send_error', message: err.message }));
    }
  }

  // Step 8: Always return 200.
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
