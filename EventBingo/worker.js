// Default squares for events without custom squares
const defaultSquaresList = [
  "'n Ou foto saam met Anneke",
  "'n Foto van 'n vorige verjaarsdag of braai",
  "Die oudste selfie wat julle saam het",
  "Anneke wat kaalvoet loop (bonus: vuil voete)",
  "Anneke wat 'n bier drink (bonus: cheers oomblik)",
  "Iemand wat iets by Anneke leen",
  "Oliver wat saam met iemand bal speel",
  "Kesia saam met 'n 'tannie' of 'oom'",
  "Almal bymekaar om die kampvuur",
  "Anneke wat in vrede sit en lees",
  "Oggendkoffie in 'n beker wat nie aan jou behoort nie",
  "Oliver wat 'help' met iets",
  "'n Foto van die sonsondergang",
  "Iemand wat sukkel met kamp opslaan",
  "Anneke se lag vasgevang in 'n spontane foto",
  "'n Kamp speletjie of aktiwiteit",
  "'n Kreatiewe foto van bier of koffie (bonus: albei)",
  "Oliver op sy fiets",
  "'n Groepsfoto van almal",
  "Iemand wat iets soek wat verlore is (bv. foon, skoen, drankie)",
  "'n Foto wat gewys iets is geleen vir kamp",
  "Oliver wat iets in tee doop",
  "Anneke wat ontspan met 'n boek",
  "Kesia wat glimlag",
  "Almal wat totsiens waai by die vuir"
];

// Helper function to get event code from request
function getEventCode(request) {
  const url = new URL(request.url);
  const eventCode = url.searchParams.get('event') || 'default';
  return eventCode;
}

// Helper function to get squares for an event
async function getSquaresForEvent(env, eventCode) {
  if (eventCode === 'default') {
    return defaultSquaresList;
  }
  
  const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
  if (eventData) {
    const event = JSON.parse(eventData);
    return event.squares || defaultSquaresList;
  }
  
  return defaultSquaresList;
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (path.startsWith("/admin/")) {
      return await handleAdminRequest(request, env, corsHeaders);
    }

    // Test endpoint to see all keys in bucket
    if (request.method === "GET" && path === "/debug/keys") {
      const list = await env.EventBingoProgress.list();
      const keys = (list.keys || []).map(item => item.key || item.name);
      
      return new Response(JSON.stringify(keys), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For POST requests, extract event code from form data if present
    let eventCode = getEventCode(request);
    let squaresList = await getSquaresForEvent(env, eventCode);
    
    if (request.method === "POST") {
      const form = await request.formData();
      const eventCodeFromForm = form.get("event");
      if (eventCodeFromForm) {
        eventCode = eventCodeFromForm;
      }
      
      const file = form.get("file");
      const player = form.get("player");
      const square = form.get("square");

      if (!file || !player || !square) {
        return new Response("Missing fields", { status: 400, headers: corsHeaders });
      }

      // Get squares list for the correct event
      squaresList = await getSquaresForEvent(env, eventCode);
      
      const safePlayer = player.replace(/\s+/g, "_");
      const safeSquare = square.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const filename = `${eventCode}_${safePlayer}_${safeSquare}_${timestamp}_${file.name}`;

      // Store photo in R2
      await env.EventBingoPhotos.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      const proxyUrl = `https://shy-recipe-5fb1.reinier-olivier.workers.dev/${filename}`;
      const urlKey = `${eventCode}_${safePlayer}_${safeSquare}`;

      // Store URL reference in KV
      await env.EventBingoProgress.put(urlKey, proxyUrl);

      return new Response(JSON.stringify({ url: proxyUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/test") {
      const testResult = {
        message: "Worker is running",
        hasEnv: !!env.EventBingoProgress,
        timestamp: new Date().toISOString(),
        eventCode: eventCode
      };
      return new Response(JSON.stringify(testResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/player") {
      const player = url.searchParams.get("name");
      if (!player) {
        return new Response("Missing player name", { status: 400, headers: corsHeaders });
      }

      const safePlayer = player.replace(/\s+/g, "_");
      const results = {};

      for (const square of squaresList) {
        const safeSquare = square.replace(/\s+/g, "_");
        const key = `${eventCode}_${safePlayer}_${safeSquare}`;
        console.log("Looking for photo with key:", key);
        
        try {
          const photoUrl = await env.EventBingoProgress.get(key);
          console.log("KV get result type:", typeof photoUrl);
          console.log("KV get result value:", photoUrl);

          if (photoUrl) {
            // photoUrl from KV is a string
            const url = typeof photoUrl === 'string' ? photoUrl : String(photoUrl);
            console.log("Found photo URL for", square, ":", url);
            results[square] = url;
          } else {
            console.log("No photo found for", square);
          }
        } catch (err) {
          console.error("Error getting photo URL:", err);
        }
      }

      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/players") {
      const list = await env.EventBingoProgress.list();
      const items = list.keys || list.objects || [];
      const playerCounts = {};
      const normalizedSquares = squaresList.map(s => s.replace(/\s+/g, "_"));

      for (const item of items) {
        const keyName = item.key || item.name;
        if (keyName.match(/\d{13}/) || keyName.includes('.')) continue;

        // Check if this key belongs to the current event
        if (!keyName.startsWith(`${eventCode}_`)) continue;

        const match = normalizedSquares.find(square => keyName.endsWith(`_${square}`));
        if (match) {
          const playerName = keyName.slice(eventCode.length + 1, keyName.length - match.length - 1);
          playerCounts[playerName] = (playerCounts[playerName] || 0) + 1;
        }
      }

      const result = Object.keys(playerCounts).sort().map(name => ({
        name,
        count: playerCounts[name]
      }));

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/leader") {
      const list = await env.EventBingoProgress.list();
      const counts = {};

      for (const item of list.keys || []) {
        const keyName = item.key || item.name;
        if (!keyName.startsWith(`${eventCode}_`)) continue;
        
        const parts = keyName.split("_");
        if (parts.length >= 3) {
          const playerName = parts.slice(1, -1).join("_");
          const square = parts[parts.length - 1];
          
          if (squaresList.some(s => square === s.replace(/\s+/g, "_"))) {
            const cleanName = playerName.replace(/_/g, " ");
            counts[cleanName] = (counts[cleanName] || 0) + 1;
          }
        }
      }

      let leader = "";
      let max = 0;
      for (const [name, count] of Object.entries(counts)) {
        if (count > max) {
          max = count;
          leader = name;
        }
      }

      return new Response(JSON.stringify({ name: leader, count: max }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/event-info") {
      if (eventCode === 'default') {
        return new Response(JSON.stringify({
          title: "Default EventBingo",
          description: "A fun photo challenge game!",
          code: "default"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
      if (eventData) {
        const event = JSON.parse(eventData);
        return new Response(JSON.stringify({
          title: event.title,
          description: event.description,
          code: event.code,
          squares: event.squares || defaultSquaresList
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    if (request.method === "GET" && (path === "/" || path === "")) {
      return new Response("EventBingo Worker is running.", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (request.method === "GET") {
      const rawKey = path.slice(1);
      // Decode URL-encoded characters (e.g., %20) so it matches the exact R2 object key
      let key = rawKey;
      try {
        key = decodeURIComponent(rawKey);
      } catch (_) {
        // Keep rawKey if decode fails
      }
      console.log("Trying to serve image with key:", key, "(raw:", rawKey, ")");
      const object = await env.EventBingoPhotos.get(key);

      if (!object || !object.body) {
        console.log("Image not found for key:", key);
        return new Response("Image not found", { status: 404, headers: corsHeaders });
      }

      // Derive a safe content type if missing
      let contentType = object.httpMetadata?.contentType;
      if (!contentType || contentType === "application/octet-stream") {
        const lower = key.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) contentType = "image/jpeg";
        else if (lower.endsWith(".png")) contentType = "image/png";
        else if (lower.endsWith(".gif")) contentType = "image/gif";
        else if (lower.endsWith(".webp")) contentType = "image/webp";
        else if (lower.endsWith(".bmp")) contentType = "image/bmp";
        else if (lower.endsWith(".svg")) contentType = "image/svg+xml";
        else contentType = "application/octet-stream";
      }

      // Ensure inline display and basic caching
      const headers = {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(key.split('/').pop() || 'image')}` + `"`,
        "Cache-Control": "public, max-age=3600",
      };

      console.log("Serving image for key:", key, "with type:", headers["Content-Type"]);
      return new Response(object.body, { status: 200, headers });
    }

    return new Response("EventBingo Worker is running.", {
      status: 200,
      headers: corsHeaders,
    });
  },
};

// Admin request handler
async function handleAdminRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Create new event
  if (request.method === "POST" && path === "/admin/create-event") {
    const data = await request.json();
    const { title, description, code, adminUser } = data;

    if (!title || !description || !adminUser) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const eventData = {
      title,
      description,
      code,
      adminUser,
      squares: defaultSquaresList,
      createdAt: new Date().toISOString()
    };

    await env.EventBingoProgress.put(`event_${code}`, JSON.stringify(eventData));
    
    return new Response(JSON.stringify({ success: true, event: eventData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get all events
  if (request.method === "GET" && path === "/admin/events") {
    const list = await env.EventBingoProgress.list({ prefix: "event_" });
    const events = [];
  
    for (const item of list.keys || []) {
      const keyName = item.name || item.key;
      const eventData = await env.EventBingoProgress.get(keyName);
      if (eventData) {
        events.push(JSON.parse(eventData));
      }
    }
  
    return new Response(JSON.stringify(events), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  
  // Get specific event
  if (request.method === "GET" && path.startsWith("/admin/event/")) {
    const eventCode = path.split('/')[3];
    const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
    
    if (!eventData) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    return new Response(eventData, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete event
  if (request.method === "POST" && path === "/admin/delete-event") {
    const data = await request.json();
    const { code, adminUser } = data;

    const eventData = await env.EventBingoProgress.get(`event_${code}`);
    if (!eventData) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    const event = JSON.parse(eventData);
    if (event.adminUser !== adminUser) {
      return new Response("Unauthorized", { status: 403, headers: corsHeaders });
    }

    // Delete event data from KV
    await env.EventBingoProgress.delete(`event_${code}`);

    // Delete all photos for this event from R2
    const photosList = await env.EventBingoPhotos.list();
    for (const item of photosList.objects || []) {
      const keyName = item.key;
      if (keyName.startsWith(`${code}_`)) {
        await env.EventBingoPhotos.delete(keyName);
      }
    }

    // Delete all URL references from KV
    const kvList = await env.EventBingoProgress.list();
    for (const item of kvList.keys || []) {
      const keyName = item.key || item.name;
      if (keyName.startsWith(`${code}_`)) {
        await env.EventBingoProgress.delete(keyName);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get photos for event
  if (request.method === "GET" && path.startsWith("/admin/photos/")) {
    const eventCode = path.split('/')[3];
    const list = await env.EventBingoPhotos.list();
    const photos = [];

    for (const item of list.objects || []) {
      const keyName = item.key;
      if (keyName.startsWith(`${eventCode}_`) && keyName.match(/\d{13}/)) {
        // This is a photo file
        const parts = keyName.split('_');
        const player = parts[1];
        const square = parts.slice(2, -2).join('_');
        
        photos.push({
          key: keyName,
          player: player.replace(/_/g, ' '),
          square: square.replace(/_/g, ' '),
          url: `https://shy-recipe-5fb1.reinier-olivier.workers.dev/${keyName}`
        });
      }
    }

    return new Response(JSON.stringify(photos), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Delete photo
  if (request.method === "POST" && path === "/admin/delete-photo") {
    const data = await request.json();
    const { key, eventCode } = data;

    // Verify this photo belongs to the event
    if (!key.startsWith(`${eventCode}_`)) {
      return new Response("Photo not found for this event", { status: 404, headers: corsHeaders });
    }

    // Delete the photo file from R2
    await env.EventBingoPhotos.delete(key);

    // Delete the URL reference from KV
    const urlKey = key.replace(/_\d{13}_[^_]+$/, '');
    await env.EventBingoProgress.delete(urlKey);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Admin endpoint not found", { status: 404, headers: corsHeaders });
}
