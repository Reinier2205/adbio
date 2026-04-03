export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.searchParams.get("key") !== "gate2026") {
      return new Response("<h1>Access Denied</h1>", {
        headers: { "Content-Type": "text/html" },
        status: 403
      });
    }

    const BOT_TOKEN = "8647448174:AAFy_ro6ytcTK5c67AaY7lOuUyeD_vKMot0";
    const CHAT_ID = "5102293417";
    const AUDIO_URL = "https://raw.githubusercontent.com/Reinier2205/adbio/main/doorbell/mega-horn.mp3";

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendAudio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        audio: AUDIO_URL,
        caption: "🔔 Someone is at the door!"
      })
    });

    if (response.ok) {
      return new Response("<h1>Ding Dong!</h1><p>The owner has been notified.</p>", {
        headers: { "Content-Type": "text/html" }
      });
    } else {
      const errorText = await response.text();
      return new Response("Telegram Error: " + errorText, { status: 500 });
    }
  }
}
