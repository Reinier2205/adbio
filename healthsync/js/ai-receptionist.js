/**
 * ai-receptionist.js — AI chatbot embed with HPCSA content filter
 * ES module. Requirements: 12.1–12.8
 *
 * Property 13: every FAQ answer ≤500 chars
 * Property 14: unmatched query returns null
 * Property 15: blocked patterns return allowed:false; clean text returns allowed:true
 */

// ── HPCSA Content Filter ─────────────────────────────────────────

/** @type {RegExp[]} */
export const BLOCKED_PATTERNS = [
  /diagnos/i,
  /prescri/i,
  /you (should|must|need to) (take|use|try)/i,
  /guaranteed? (result|outcome|loss|improvement)/i,
  /\d+\s?(kg|lbs?|kilograms?)\s*(loss|reduction|drop)/i,
  /cure/i,
  /treat your/i
];

const FILTER_FALLBACK = "For medical guidance, please contact us directly — we'd love to help you in person.";

/**
 * @param {string} responseText
 * @returns {{ allowed: boolean, text: string }}
 */
export function filterResponse(responseText) {
  const isBlocked = BLOCKED_PATTERNS.some(p => p.test(responseText));
  if (isBlocked) {
    return { allowed: false, text: FILTER_FALLBACK };
  }
  return { allowed: true, text: responseText };
}

// ── FAQ Engine ────────────────────────────────────────────────────

/**
 * @type {{ keywords: string[], answer: string }[]}
 * Every answer must be ≤500 characters (Property 13).
 */
export const FAQ_ENTRIES = [
  {
    keywords: ['hours', 'open', 'operating', 'time', 'when'],
    answer: 'We are open Monday to Friday, 08:00–17:00. We are closed on weekends and public holidays. For after-hours enquiries, please leave a message and we will get back to you on the next business day.'
  },
  {
    keywords: ['location', 'address', 'where', 'find', 'directions'],
    answer: 'We are located at Irene Security Estate, Centurion, Gauteng. Access is via the main security gate. Please contact us for detailed directions or parking information.'
  },
  {
    keywords: ['book', 'appointment', 'schedule', 'reserve', 'booking'],
    answer: 'You can book a consultation via our website booking form, by calling us at +27 XX XXX XXXX, or by emailing info@healthsynchrony.co.za. We recommend booking in advance to secure your preferred time.'
  },
  {
    keywords: ['services', 'offer', 'treat', 'provide', 'available'],
    answer: 'We offer Aesthetics, Weight Loss, IV Therapy, Consultations, and a Dispensary. Each service begins with a medical consultation to ensure the best outcomes for you. Results may vary.'
  },
  {
    keywords: ['price', 'cost', 'fee', 'charge', 'rate'],
    answer: 'For pricing information, please contact us directly. We are happy to discuss treatment options and associated fees during your consultation.'
  },
  {
    keywords: ['doctor', 'dr', 'van dyk', 'practitioner', 'who'],
    answer: 'Health Synchrony is led by Dr. van Dyk, who holds an MBChB from the University of Pretoria and an Advanced Diploma in Aesthetics. All treatments are performed under medical supervision.'
  }
];

/**
 * Tokenise query and match against FAQ entries.
 * @param {string} query
 * @returns {string|null} answer string or null if no match
 */
export function matchFAQ(query) {
  if (typeof query !== 'string') return null;
  const tokens = query.toLowerCase().split(/\s+/);
  for (const entry of FAQ_ENTRIES) {
    if (entry.keywords.some(kw => tokens.includes(kw) || query.toLowerCase().includes(kw))) {
      return entry.answer;
    }
  }
  return null;
}

// ── Chat UI ───────────────────────────────────────────────────────

const OFFLINE_MSG = 'Our assistant is temporarily unavailable. Please call us at +27 XX XXX XXXX or email info@healthsynchrony.co.za.';
const UNMATCHED_MSG = 'I\'m not able to answer that right now. Please call us at +27 XX XXX XXXX or email info@healthsynchrony.co.za for assistance.';
const TIMEOUT_MS = 10000;

const PROMPT_OPTIONS = [
  { label: 'Book an appointment', query: 'book appointment' },
  { label: 'Learn about our services', query: 'services offer' },
  { label: 'Ask a question', query: null }
];

function buildChatUI() {
  // Trigger button
  const trigger = document.createElement('button');
  trigger.className = 'ai-chat-trigger';
  trigger.setAttribute('aria-label', 'Open AI receptionist chat');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: var(--z-chat, 400);
    min-width: 48px;
    min-height: 48px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background-color: var(--color-navy, #0A1F3C);
    color: var(--color-gold, #C9A84C);
    border: 2px solid var(--color-gold, #C9A84C);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 16px rgba(10,31,60,0.3);
  `;
  trigger.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
    <path d="M20 2H4C2.9 2 2 2.9 2 4v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
          stroke="currentColor" stroke-width="2" stroke-linejoin="round" fill="none"/>
  </svg>`;

  // Chat panel
  const panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'AI receptionist chat');
  panel.setAttribute('aria-modal', 'true');
  panel.hidden = true;
  panel.style.cssText = `
    position: fixed;
    bottom: 148px;
    right: 20px;
    z-index: var(--z-chat, 400);
    width: min(360px, calc(100vw - 40px));
    background: white;
    border-radius: var(--radius-lg, 16px);
    box-shadow: 0 8px 32px rgba(10,31,60,0.2);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    max-height: 480px;
    font-family: var(--font-body, system-ui, sans-serif);
  `;

  panel.innerHTML = `
    <div style="background:var(--color-navy,#0A1F3C);color:var(--color-ivory,#F5F0E8);padding:16px;font-weight:600;">
      Health Synchrony Assistant
      <button id="chat-close" aria-label="Close chat"
              style="float:right;background:transparent;border:none;color:inherit;cursor:pointer;font-size:1.25rem;line-height:1;">✕</button>
    </div>
    <div id="chat-messages" role="log" aria-live="polite" aria-label="Chat messages"
         style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;">
    </div>
    <div id="chat-input-area" style="padding:12px;border-top:1px solid #eee;display:flex;gap:8px;">
      <input id="chat-input" type="text" placeholder="Type a message…"
             aria-label="Chat message input"
             style="flex:1;padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:0.875rem;">
      <button id="chat-send" class="btn-primary"
              style="min-width:48px;min-height:48px;padding:0 12px;font-size:0.875rem;">Send</button>
    </div>`;

  document.body.appendChild(trigger);
  document.body.appendChild(panel);

  const messagesEl = panel.querySelector('#chat-messages');
  const inputEl = panel.querySelector('#chat-input');
  const sendBtn = panel.querySelector('#chat-send');
  const closeBtn = panel.querySelector('#chat-close');

  function addMessage(text, sender) {
    const div = document.createElement('div');
    div.style.cssText = sender === 'bot'
      ? 'background:var(--color-ivory,#F5F0E8);padding:10px 14px;border-radius:12px 12px 12px 2px;font-size:0.875rem;max-width:85%;'
      : 'background:var(--color-navy,#0A1F3C);color:var(--color-ivory,#F5F0E8);padding:10px 14px;border-radius:12px 12px 2px 12px;font-size:0.875rem;max-width:85%;align-self:flex-end;';
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function botReply(query) {
    const faqAnswer = matchFAQ(query);
    const rawResponse = faqAnswer || UNMATCHED_MSG;
    const filtered = filterResponse(rawResponse);
    addMessage(filtered.text, 'bot');
  }

  function handleSend() {
    const text = inputEl.value.trim();
    if (!text) return;
    addMessage(text, 'user');
    inputEl.value = '';

    // Simulate response with timeout guard
    let replied = false;
    const timer = setTimeout(() => {
      if (!replied) {
        replied = true;
        addMessage(OFFLINE_MSG, 'bot');
      }
    }, TIMEOUT_MS);

    // Immediate local FAQ response (no network needed)
    replied = true;
    clearTimeout(timer);
    botReply(text);
  }

  // Open/close
  trigger.addEventListener('click', () => {
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    trigger.setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) {
      // Show greeting and prompts on first open
      if (!messagesEl.children.length) {
        addMessage('Hello! Welcome to Health Synchrony. How can I help you today?', 'bot');

        // Prompt buttons
        const promptsDiv = document.createElement('div');
        promptsDiv.style.cssText = 'display:flex;flex-direction:column;gap:6px;';
        PROMPT_OPTIONS.forEach(opt => {
          const btn = document.createElement('button');
          btn.textContent = opt.label;
          btn.style.cssText = `
            background: var(--color-ivory, #F5F0E8);
            border: 1px solid var(--color-navy, #0A1F3C);
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 0.875rem;
            cursor: pointer;
            text-align: left;
          `;
          btn.addEventListener('click', () => {
            promptsDiv.remove();
            if (opt.query) {
              addMessage(opt.label, 'user');
              botReply(opt.query);
            } else {
              addMessage(opt.label, 'user');
              addMessage('Of course! Type your question below and I\'ll do my best to help.', 'bot');
            }
          });
          promptsDiv.appendChild(btn);
        });
        messagesEl.appendChild(promptsDiv);
      }
      inputEl.focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });

  sendBtn.addEventListener('click', handleSend);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
  });
}

document.addEventListener('DOMContentLoaded', buildChatUI);
