/**
 * Generate an automated reply based on Gemini's structured output.
 * Pure function — no side effects, no async.
 * @param {object|null} geminiOutput - Extracted intent object, or null if Gemini failed
 * @param {{ from: string, text: string, waMessageId: string }} message - Incoming message
 * @returns {string|null} Reply text, or null to skip sending a reply
 */
export function autoReply(geminiOutput, message) {
  if (!geminiOutput) {
    return "Thank you for your message. We'll get back to you shortly.";
  }
  return "Thank you for your message. We've received it and will respond soon.";
}
