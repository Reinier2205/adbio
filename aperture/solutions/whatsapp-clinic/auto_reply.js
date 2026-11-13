/**
 * Generate an automated reply for clinic WhatsApp patients based on Gemini's structured output.
 * Pure function — no side effects, no async.
 * @param {object|null} geminiOutput - Extracted intake object, or null if Gemini failed
 * @param {{ from: string, text: string, waMessageId: string }} message - Incoming message
 * @returns {string} Reply text to send back to the patient
 */
export function autoReply(geminiOutput, message) {
  if (geminiOutput === null) {
    return "Thank you for contacting the clinic. We've received your message and a staff member will be in touch shortly.";
  }

  if (geminiOutput.urgency_level === 'high') {
    return "We've received your message and noted the urgency. A staff member will contact you as soon as possible. If this is a medical emergency, please call 112 immediately.";
  }

  if (geminiOutput.appointment_request === true) {
    const symptom = geminiOutput.symptom;
    return `Thanks for reaching out! We've noted your request${symptom ? ` regarding "${symptom}"` : ''}. We'll be in touch to confirm your appointment.`;
  }

  return "Thanks for your message. We'll review it and get back to you as soon as possible.";
}
