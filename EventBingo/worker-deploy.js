// EventBingo Cloudflare Worker - Ready for Deployment

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

// Square validation function
function validateSquares(squares) {
  const errors = [];
  
  // Check if squares is an array
  if (!Array.isArray(squares)) {
    errors.push("Squares must be provided as an array");
    return { isValid: false, errors };
  }
  
  // Check count
  if (squares.length !== 25) {
    errors.push(`Must provide exactly 25 squares (found ${squares.length})`);
  }
  
  // Check for empty squares and collect duplicates
  const seenSquares = new Set();
  const duplicates = new Set();
  
  squares.forEach((square, index) => {
    // Check if square is empty or not a string
    if (typeof square !== 'string' || square.trim().length === 0) {
      errors.push(`Square ${index + 1} cannot be empty`);
      return;
    }
    
    // Check length
    if (square.trim().length > 200) {
      errors.push(`Square ${index + 1} is too long (maximum 200 characters)`);
    }
    
    // Check for duplicates
    const trimmedSquare = square.trim().toLowerCase();
    if (seenSquares.has(trimmedSquare)) {
      duplicates.add(square.trim());
    } else {
      seenSquares.add(trimmedSquare);
    }
  });
  
  // Add duplicate errors
  if (duplicates.size > 0) {
    errors.push(`Duplicate squares found: ${Array.from(duplicates).join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
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

// Main worker handler
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

    console.log('Request method:', request.method, 'Path:', path);

    if (path.startsWith("/admin/")) {
      return await handleAdminRequest(request, env, corsHeaders);
    }

    // Event info endpoint
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
          // Return default event structure for backward compatibility
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
        console.error('Error fetching event info:', error);
        return new Response("Internal server error", { status: 500, headers: corsHeaders });
      }
    }

    // Photo upload endpoint
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
        // Check if event is locked
        const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
        let event = null;
        
        if (eventData) {
          event = JSON.parse(eventData);
          
          // If this is the first photo and event is not locked, lock it
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
        console.error('Upload error:', error);
        return new Response("Upload failed", { status: 500, headers: corsHeaders });
      }
    }

    // Get player progress
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

    // Get all players for an event
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

    // Get photo
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

    // Get all photos for carousel
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
  },
};

// Admin request handler
async function handleAdminRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  console.log('handleAdminRequest - Method:', request.method, 'Path:', path);

  // Test endpoint for debugging
  if (request.method === "POST" && path === "/admin/test") {
    console.log('Test endpoint reached!');
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Test endpoint working",
      method: request.method,
      path: path 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create new event
  if (request.method === "POST" && path === "/admin/create-event") {
    const data = await request.json();
    const { title, description, code, adminUser, squares, aiContext, isLocked, lockedAt, lockReason } = data;

    console.log('Received create-event request:', data);
    console.log('Received squares:', squares);

    if (!title || !description || !adminUser) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    // Validate squares if provided
    let finalSquares = defaultSquaresList;
    if (squares && Array.isArray(squares)) {
      console.log('Validating squares:', squares);
      const validation = validateSquares(squares);
      console.log('Validation result:', validation);
      if (validation.isValid) {
        finalSquares = squares;
        console.log('Using custom squares');
      } else {
        console.log('Squares validation failed, using default');
        return new Response(`Invalid squares: ${validation.errors.join(', ')}`, { 
          status: 400, 
          headers: corsHeaders 
        });
      }
    } else {
      console.log('No squares provided or not array, using default');
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
    try {
      console.log('Delete event request received');
      const data = await request.json();
      console.log('Delete request data:', data);
      const { code } = data;

      if (!code) {
        return new Response("Event code is required", { status: 400, headers: corsHeaders });
      }

      console.log('Looking for event:', `event_${code}`);
      const eventData = await env.EventBingoProgress.get(`event_${code}`);
      if (!eventData) {
        console.log('Event not found:', code);
        return new Response("Event not found", { status: 404, headers: corsHeaders });
      }

      // Delete event data from KV
      console.log('Deleting event from KV:', `event_${code}`);
      await env.EventBingoProgress.delete(`event_${code}`);

      // Delete all photos for this event from R2
      try {
        console.log('Attempting to delete photos for event:', code);
        const photosList = await env.EventBingoPhotos.list();
        for (const item of photosList.objects || []) {
          const keyName = item.key;
          if (keyName.startsWith(`${code}_`)) {
            console.log('Deleting photo:', keyName);
            await env.EventBingoPhotos.delete(keyName);
          }
        }
      } catch (photoError) {
        console.log('Photo deletion error (non-critical):', photoError);
      }

      // Delete all URL references from KV
      try {
        console.log('Attempting to delete KV references for event:', code);
        const kvList = await env.EventBingoProgress.list();
        for (const item of kvList.keys || []) {
          const keyName = item.key || item.name;
          if (keyName.startsWith(`${code}_`)) {
            console.log('Deleting KV reference:', keyName);
            await env.EventBingoProgress.delete(keyName);
          }
        }
      } catch (kvError) {
        console.log('KV cleanup error (non-critical):', kvError);
      }

      console.log('Event deletion completed successfully');
      return new Response(JSON.stringify({ success: true, message: `Event ${code} deleted` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error('Error in delete event:', error);
      return new Response(JSON.stringify({ error: "Internal server error", details: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // Get photos for event
  if (request.method === "GET" && path.startsWith("/admin/photos/")) {
    const eventCode = path.split('/')[3];
    const list = await env.EventBingoPhotos.list();
    const photos = [];

    for (const item of list.objects || []) {
      const keyName = item.key;
      if (keyName.startsWith(`${eventCode}_`) && keyName.match(/\d{13}/)) {
        const parts = keyName.split('_');
        const player = parts[1];
        const square = parts.slice(2, -2).join('_');
        
        photos.push({
          key: keyName,
          player: player.replace(/_/g, ' '),
          square: square,
          uploaded: new Date(parseInt(parts[parts.length - 1])).toISOString()
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

    try {
      await env.EventBingoPhotos.delete(key);
      
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response("Failed to delete photo", { status: 500, headers: corsHeaders });
    }
  }

  // Update squares for an event
  if (request.method === "POST" && path === "/admin/update-squares") {
    const data = await request.json();
    const { eventCode, squares, adminUser } = data;

    if (!eventCode || !squares || !adminUser) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    // Validate squares
    const validation = validateSquares(squares);
    if (!validation.isValid) {
      return new Response(`Invalid squares: ${validation.errors.join(', ')}`, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
    if (!eventData) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    const event = JSON.parse(eventData);
    
    // Check if event is locked
    if (event.isLocked) {
      return new Response("Cannot modify squares: event is locked", { status: 403, headers: corsHeaders });
    }

    // Check admin authorization
    if (event.adminUser !== adminUser) {
      return new Response("Unauthorized", { status: 403, headers: corsHeaders });
    }

    // Update squares
    event.squares = squares;
    event.updatedAt = new Date().toISOString();

    await env.EventBingoProgress.put(`event_${eventCode}`, JSON.stringify(event));

    return new Response(JSON.stringify({ 
      success: true,
      squares: event.squares,
      updatedAt: event.updatedAt
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Get event status
  if (request.method === "GET" && path.startsWith("/admin/event-status/")) {
    const eventCode = path.split('/')[3];
    
    const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
    if (!eventData) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    const event = JSON.parse(eventData);
    
    // Get player count
    const list = await env.EventBingoProgress.list({ prefix: `${eventCode}_` });
    let playerCount = 0;
    
    for (const item of list.keys || []) {
      const keyName = item.name || item.key;
      if (!keyName.startsWith('event_')) {
        playerCount++;
      }
    }

    return new Response(JSON.stringify({
      eventCode: event.code,
      title: event.title,
      isLocked: event.isLocked,
      lockReason: event.lockReason,
      lockedAt: event.lockedAt,
      playerCount: playerCount,
      hasCustomSquares: event.squares && event.squares.length === 25,
      createdAt: event.createdAt
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Lock/unlock event manually
  if (request.method === "POST" && path === "/admin/lock-event") {
    const data = await request.json();
    const { eventCode, adminUser, lock, reason } = data;

    if (!eventCode || !adminUser || typeof lock !== 'boolean') {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    const eventData = await env.EventBingoProgress.get(`event_${eventCode}`);
    if (!eventData) {
      return new Response("Event not found", { status: 404, headers: corsHeaders });
    }

    const event = JSON.parse(eventData);
    
    // Check admin authorization
    if (event.adminUser !== adminUser) {
      return new Response("Unauthorized", { status: 403, headers: corsHeaders });
    }

    // Update lock status
    event.isLocked = lock;
    if (lock) {
      event.lockedAt = new Date().toISOString();
      event.lockReason = reason || 'manual';
    } else {
      event.lockedAt = null;
      event.lockReason = null;
    }

    await env.EventBingoProgress.put(`event_${eventCode}`, JSON.stringify(event));

    return new Response(JSON.stringify({ 
      success: true,
      isLocked: event.isLocked,
      lockReason: event.lockReason,
      lockedAt: event.lockedAt
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log('No matching admin endpoint found for:', request.method, path);
  return new Response("Admin endpoint not found", { status: 404, headers: corsHeaders });
}