// EventBingo Cloudflare Worker

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

function getEventCode(request) {
  const url = new URL(request.url);
  const eventCode = url.searchParams.get('event') || 'default';
  return eventCode;
}

function validateSquares(squares) {
  const errors = [];
  
  if (!Array.isArray(squares)) {
    errors.push("Squares must be provided as an array");
    return { isValid: false, errors };
  }
  
  if (squares.length !== 25) {
    errors.push(`Must provide exactly 25 squares (found ${squares.length})`);
  }
  
  const seenSquares = new Set();
  const duplicates = new Set();
  
  squares.forEach((square, index) => {
    if (typeof square !== 'string' || square.trim().length === 0) {
      errors.push(`Square ${index + 1} cannot be empty`);
      return;
    }
    
    if (square.trim().length > 200) {
      errors.push(`Square ${index + 1} is too long (maximum 200 characters)`);
    }
    
    const trimmedSquare = square.trim().toLowerCase();
    if (seenSquares.has(trimmedSquare)) {
      duplicates.add(square.trim());
    } else {
      seenSquares.add(trimmedSquare);
    }
  });
  
  if (duplicates.size > 0) {
    errors.push(`Duplicate squares found: ${Array.from(duplicates).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function handleAdminRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "POST" && path === "/admin/create-event") {
    const data = await request.json();
    const { title, description, code, adminUser, squares, aiContext, isLocked, lockedAt, lockReason } = data;

    if (!title || !description || !adminUser) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    let finalSquares = defaultSquaresList;
    if (squares && Array.isArray(squares)) {
      const validation = validateSquares(squares);
      if (validation.isValid) {
        finalSquares = squares;
      } else {
        return new Response(`Invalid squares: ${validation.errors.join(', ')}`, { 
          status: 400, 
          headers: corsHeaders 
        });
      }
    }

    const eventData = {
      title,
      description,
      code,
      adminUser,
      squares: finalSquares,
      createdAt: new Date().toISOString(),
      isLocked: isLocked || false,
      lockedAt: lockedAt || null,
      lockReason: lockReason || null,
      eventContext: aiContext || {
        names: [],
        theme: '',
        activities: '',
        location: ''
      }
    };

    await env.EventBingoProgress.put(`event_${code}`, JSON.stringify(eventData));
    
    return new Response(JSON.stringify({ success: true, event: eventData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  if (request.method === "POST" && path === "/admin/delete-event") {
    try {
      const data = await request.json();
      const { code } = data;

      if (!code) {
        return new Response("Event code is required", { status: 400, headers: corsHeaders });
      }

      const eventData = await env.EventBingoProgress.get(`event_${code}`);
      if (!eventData) {
        return new Response("Event not found", { status: 404, headers: corsHeaders });
      }

      await env.EventBingoProgress.delete(`event_${code}`);

      try {
        const photosList = await env.EventBingoPhotos.list();
        for (const item of photosList.objects || []) {
          const keyName = item.key;
          if (keyName.startsWith(`${code}_`)) {
            await env.EventBingoPhotos.delete(keyName);
          }
        }
      } catch (photoError) {
        // Photo deletion is non-critical
      }

      try {
        const kvList = await env.EventBingoProgress.list();
        for (const item of kvList.keys || []) {
          const keyName = item.key || item.name;
          if (keyName.startsWith(`${code}_`)) {
            await env.EventBingoProgress.delete(keyName);
          }
        }
      } catch (kvError) {
        // KV cleanup is non-critical
      }

      return new Response(JSON.stringify({ success: true, message: `Event ${code} deleted` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Admin endpoint not found", { status: 404, headers: corsHeaders });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (path.startsWith("/admin/")) {
      return await handleAdminRequest(request, env, corsHeaders);
    }

    if (request.method === "GET" && path === "/event-info") {
      const eventCode = getEventCode(request);
      
      try {
        const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
        
        if (eventData) {
          const event = JSON.parse(eventData);
          return new Response(JSON.stringify(event), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          const defaultEvent = {
            title: "EventBingo",
            description: "A fun photo challenge game!",
            code: eventCode,
            squares: defaultSquaresList,
            isLocked: false,
            eventContext: {
              names: [],
              theme: '',
              activities: '',
              location: ''
            }
          };
          
          return new Response(JSON.stringify(defaultEvent), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        return new Response("Internal server error", { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === "POST" && path === "/upload") {
      const formData = await request.formData();
      const file = formData.get("photo");
      const player = formData.get("player");
      const square = formData.get("square");
      const eventCode = formData.get("eventCode") || 'default';

      if (!file || !player || !square) {
        return new Response("Missing required fields", { status: 400, headers: corsHeaders });
      }

      try {
        const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
        let event = null;
        
        if (eventData) {
          event = JSON.parse(eventData);
          
          if (!event.isLocked) {
            event.isLocked = true;
            event.lockedAt = new Date().toISOString();
            event.lockReason = 'first_photo';
            await env.EventBingoProgress.put(`event_${eventCode}`, JSON.stringify(event));
          }
        }

        const timestamp = Date.now();
        const key = `${eventCode}_${player.replace(/\s+/g, '_')}_${square}_${timestamp}`;

        await env.EventBingoPhotos.put(key, file);

        const progressKey = `${eventCode}_${player}`;
        let progress = await env.EventBingoProgress.get(progressKey);
        
        if (progress) {
          progress = JSON.parse(progress);
        } else {
          progress = { completedSquares: [], photos: {} };
        }

        const squareIndex = parseInt(square);
        if (!progress.completedSquares.includes(squareIndex)) {
          progress.completedSquares.push(squareIndex);
        }
        progress.photos[squareIndex] = key;

        await env.EventBingoProgress.put(progressKey, JSON.stringify(progress));

        return new Response(JSON.stringify({ success: true, key }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response("Upload failed", { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === "GET" && path === "/progress") {
      const eventCode = getEventCode(request);
      const player = url.searchParams.get('player');
      
      if (!player) {
        return new Response("Player parameter required", { status: 400, headers: corsHeaders });
      }

      const progressKey = `${eventCode}_${player}`;
      const progress = await env.EventBingoProgress.get(progressKey);

      if (progress) {
        return new Response(progress, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        return new Response(JSON.stringify({ completedSquares: [], photos: {} }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (request.method === "GET" && path === "/players") {
      const eventCode = getEventCode(request);
      const list = await env.EventBingoProgress.list({ prefix: `${eventCode}_` });
      const players = [];

      for (const item of list.keys || []) {
        const keyName = item.name || item.key;
        if (!keyName.startsWith('event_')) {
          const playerName = keyName.replace(`${eventCode}_`, '');
          if (playerName && !players.includes(playerName)) {
            players.push(playerName);
          }
        }
      }

      return new Response(JSON.stringify(players), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path.startsWith("/photo/")) {
      const key = path.substring(7);
      const photo = await env.EventBingoPhotos.get(key);

      if (photo) {
        return new Response(photo.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": photo.httpMetadata?.contentType || "image/jpeg",
          },
        });
      } else {
        return new Response("Photo not found", { status: 404, headers: corsHeaders });
      }
    }

    if (request.method === "GET" && path === "/photos") {
      const eventCode = getEventCode(request);
      const list = await env.EventBingoPhotos.list();
      const photos = [];

      for (const item of list.objects || []) {
        const keyName = item.key;
        if (keyName.startsWith(`${eventCode}_`) && keyName.match(/\d{13}/)) {
          const parts = keyName.split('_');
          const player = parts[1];
          const square = parts.slice(2, -1).join('_');
          
          photos.push({
            key: keyName,
            player: player.replace(/_/g, ' '),
            square: square,
            uploaded: new Date(parseInt(parts[parts.length - 1])).toISOString()
          });
        }
      }

      photos.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

      return new Response(JSON.stringify(photos), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  }
};

