/**
 * contact-form.js — Enquiry form validation and POPIA consent
 * ES module. Requirements: 10.5, 10.6, 10.7, 10.8, 13.1, 13.2, 13.3, 13.4
 *
 * Property 11: VALIDATORS accept/reject correctly
 * Property 12: blocked: true + error keys + valid values retained
 * Property 16: consentAppointment: false always blocks
 */

/** Validators — all pure functions for easy property testing */
export const VALIDATORS = {
  name:    value => typeof value === 'string' && value.trim().length > 0,
  email:   value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  phone:   value => typeof value === 'string' && /^(\+27|0)[0-9]{9}$/.test(value.replace(/\s/g, '')),
  message: value => typeof value === 'string' && value.trim().length <= 500,
  consentAppointment: value => value === true
};

/**
 * @typedef {{ name: string, email: string, phone: string, reason: string,
 *             preferredContact: string, consentAppointment: boolean, consentMarketing: boolean }} FormPayload
 * @typedef {{ blocked: boolean, errors?: Record<string,string> }} SubmitResult
 */

/**
 * @param {FormPayload} payload
 * @returns {SubmitResult}
 */
export function submitForm(payload) {
  const errors = {};

  if (!VALIDATORS.name(payload.name))                       errors.name = 'Please enter your full name.';
  if (!VALIDATORS.email(payload.email))                     errors.email = 'Please enter a valid email address.';
  if (!VALIDATORS.phone(payload.phone))                     errors.phone = 'Please enter a valid South African phone number (e.g. 0XX XXX XXXX).';
  if (!VALIDATORS.message(payload.reason))                  errors.reason = 'Your message may not exceed 500 characters.';
  if (!VALIDATORS.consentAppointment(payload.consentAppointment))
    errors.consentAppointment = 'Please consent to appointment communication to proceed.';

  if (Object.keys(errors).length > 0) {
    return { blocked: true, errors };
  }

  return { blocked: false };
}

// ── DOM wiring ───────────────────────────────────────────────────

const FIELD_IDS = {
  name:  'full-name',
  email: 'email',
  phone: 'phone',
  reason: 'reason',
  consentAppointment: 'consent-appointment'
};

function clearErrors(form) {
  form.querySelectorAll('[role="alert"].field-error').forEach(el => el.remove());
}

function showError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  const span = document.createElement('span');
  span.setAttribute('role', 'alert');
  span.className = 'field-error';
  span.style.cssText = 'display:block;color:#c0392b;font-size:0.875rem;margin-top:4px;';
  span.textContent = message;
  field.insertAdjacentElement('afterend', span);
  field.setAttribute('aria-invalid', 'true');
}

function clearFieldState(form) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
}

function getPayload(form) {
  const data = new FormData(form);
  return {
    name:               data.get('fullName') || '',
    email:              data.get('email') || '',
    phone:              data.get('phone') || '',
    reason:             data.get('reason') || '',
    preferredContact:   data.get('preferredContact') || '',
    consentAppointment: form.querySelector('#consent-appointment')?.checked === true,
    consentMarketing:   form.querySelector('#consent-marketing')?.checked === true
  };
}

function initContactForm() {
  const form = document.getElementById('enquiry-form');
  const confirmation = document.getElementById('form-confirmation');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    clearErrors(form);
    clearFieldState(form);

    const payload = getPayload(form);
    const result = submitForm(payload);

    if (result.blocked) {
      Object.entries(result.errors).forEach(([field, msg]) => {
        const id = FIELD_IDS[field];
        if (id) showError(id, msg);
      });
      // Focus first errored field
      const firstErrorId = FIELD_IDS[Object.keys(result.errors)[0]];
      if (firstErrorId) document.getElementById(firstErrorId)?.focus();
      return;
    }

    // Success
    form.hidden = true;
    if (confirmation) {
      confirmation.removeAttribute('hidden');
      confirmation.focus();
    }
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initContactForm);
}
