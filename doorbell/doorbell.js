export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Security check for your QR code link
    if (url.searchParams.get("key") !== "gate2026") {
      return new Response("<h1>Access Denied</h1>", { 
        headers: { "Content-Type": "text/html" }, 
        status: 403 
      });
    }

    // ntfy.sh - free push notifications, no account needed
    const NTFY_TOPIC = "reinier-doorbell-2026"; // Change to your own unique topic name

    const response = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        "Title": "Doorbell",
        "Priority": "high",
        "Tags": "bell,door"
      },
      body: "Someone is at the door!"
    });

    if (response.ok) {
      return new Response("<h1>Ding Dong!</h1><p>The owner has been notified.</p>", {
        headers: { "Content-Type": "text/html" }
      });
    } else {
      const errorText = await response.text();
      return new Response("ntfy Error: " + errorText, { status: 500 });
    }
  }
}
