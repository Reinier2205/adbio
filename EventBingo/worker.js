// EventBingo Cloudflare Worker

// Authentication questions list
const AUTHENTICATION_QUESTIONS = [
  "What is your go-to snack?",
  "Favourite song right now?",
  "Favourite colour?",
  "What time of day do you like most?",
  "Your comfort food?",
  "Your favourite drink?",
  "Your favourite cartoon growing up?",
  "Your happy place?",
  "What is your lucky number?",
  "Coffee or tea?",
  "Your favourite weekend activity?",
  "What animal do you like most?",
  "Your favourite season?",
  "Your favourite movie or series?",
  "Cats, dogs, or both?",
  "Sweet or savoury?",
  "Your favourite treat as a child?",
  "Your favourite pizza topping?",
  "A word that describes you today?"
];

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

// Helper function to get random question
function getRandomQuestion() {
  const randomIndex = Math.floor(Math.random() * AUTHENTICATION_QUESTIONS.length);
  return AUTHENTICATION_QUESTIONS[randomIndex];
}

// Helper function to normalize answer for comparison
function normalizeAnswer(answer) {
  if (typeof answer !== 'string') return '';
  return answer
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Replace multiple spaces with single space
}

// Helper function to validate answer length
function isValidAnswer(answer) {
  if (typeof answer !== 'string') return false;
  const trimmed = answer.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

// Helper function to get authentication key
function getAuthKey(eventCode, playerName) {
  return `auth_${eventCode}_${playerName}`;
}

// Helper function to get authentication key
function getProgessKey(eventCode, playerName) {
  return `${eventCode}_${playerName}`;
}


// Admin request handler
async function handleAdminRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Create new event
  if (request.method === "POST" && path === "/admin/create-event") {
    const data = await request.json();
    const { title, description, code, adminUser, squares, aiContext, isLocked, lockedAt, lockReason } = data;

    if (!title || !description || !adminUser) {
      return new Response("Missing required fields", { status: 400, headers: corsHeaders });
    }

    // Validate squares if provided
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
      const data = await request.json();
      const { code } = data;

      if (!code) {
        return new Response("Event code is required", { status: 400, headers: corsHeaders });
      }

      const eventData = await env.EventBingoProgress.get(`event_${code}`);
      if (!eventData) {
        return new Response("Event not found", { status: 404, headers: corsHeaders });
      }

      // Delete event data from KV
      await env.EventBingoProgress.delete(`event_${code}`);

      // Delete all photos for this event from R2
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

      // Delete all URL references from KV
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

  // Download individual original photo
  if (request.method === "GET" && path.startsWith("/admin/download-photo/")) {
    const pathParts = path.split('/');
    const eventCode = pathParts[3];
    const filename = decodeURIComponent(pathParts[4]);
    
    if (!eventCode || !filename) {
      return new Response("Event code and filename required", { status: 400, headers: corsHeaders });
    }

    try {
      // Find the photo by reconstructing the key from filename
      const list = await env.EventBingoPhotos.list();
      let photoKey = null;
      
      for (const item of list.objects || []) {
        const keyName = item.key;
        if (keyName.startsWith(`original_${eventCode}_`)) {
          // Parse key to create filename and match
          const parts = keyName.replace('original_', '').split('_');
          const event = parts[0];
          const player = parts[1];
          const squareInfo = parts.slice(2, -1).join('_');
          const timestamp = parts[parts.length - 1];
          const reconstructedFilename = `${eventCode}_${player.replace(/_/g, ' ')}_${squareInfo}_${timestamp}.jpg`;
          
          if (reconstructedFilename === filename) {
            photoKey = keyName;
            break;
          }
        }
      }

      if (!photoKey) {
        return new Response("Photo not found", { status: 404, headers: corsHeaders });
      }

      const photo = await env.EventBingoPhotos.get(photoKey);
      if (!photo) {
        return new Response("Photo not found", { status: 404, headers: corsHeaders });
      }

      return new Response(photo.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": photo.httpMetadata?.contentType || "image/jpeg",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });

    } catch (error) {
      return new Response("Failed to download photo", { status: 500, headers: corsHeaders });
    }
  }

  // Download all original photos as zip
  if (request.method === "GET" && path.startsWith("/admin/download-originals/")) {
    const eventCode = path.split('/')[3];
    
    if (!eventCode) {
      return new Response("Event code is required", { status: 400, headers: corsHeaders });
    }

    try {
      // Get all photos for this event (both original and thumbnails)
      const list = await env.EventBingoPhotos.list();
      const originalPhotos = [];
      const thumbnailMap = new Map(); // Map to store thumbnail keys by player and square
      
      // First pass: collect all thumbnails
      for (const item of list.objects || []) {
        const keyName = item.key;
        if (keyName.startsWith(`thumb_${eventCode}_`)) {
          // Parse thumbnail key: thumb_eventCode_player_squareX_timestamp
          const parts = keyName.split('_');
          if (parts.length >= 5) {
            const player = parts[2];
            const squareInfo = parts[3];
            const thumbnailKey = `${player}_${squareInfo}`;
            thumbnailMap.set(thumbnailKey, keyName);
          }
        }
      }
      
      // Second pass: collect original photos and match with thumbnails
      for (const item of list.objects || []) {
        const keyName = item.key;
        if (keyName.startsWith(`original_${eventCode}_`)) {
          const photo = await env.EventBingoPhotos.get(keyName);
          if (photo) {
            // Parse key to get player and square info
            const parts = keyName.replace('original_', '').split('_');
            const event = parts[0];
            const player = parts[1];
            const squareInfo = parts.slice(2, -1).join('_');
            const timestamp = parts[parts.length - 1];
            
            // Find matching thumbnail
            const thumbnailKey = `${player}_${squareInfo}`;
            const matchingThumbnail = thumbnailMap.get(thumbnailKey);
            
            // Create friendly filename
            const filename = `${eventCode}_${player.replace(/_/g, ' ')}_${squareInfo}_${timestamp}.jpg`;
            
            originalPhotos.push({
              filename: filename,
              originalKey: keyName,
              thumbnailKey: matchingThumbnail || null,
              data: await photo.arrayBuffer()
            });
          }
        }
      }

      if (originalPhotos.length === 0) {
        return new Response("No original photos found for this event", { 
          status: 404, 
          headers: corsHeaders 
        });
      }

      // Get squares for this event to create better filenames
      const squares = await getSquaresForEvent(env, eventCode);
      
      // Create enhanced photo data with better filenames and thumbnails
      const enhancedPhotos = originalPhotos.map(p => {
        // Parse the original R2 key to get the components
        // Original key format: original_eventCode_player_squareX_timestamp
        const keyParts = p.originalKey.split('_');
        
        let player = 'Unknown';
        let squareIndex = -1;
        let timestamp = '';
        let squareText = 'Unknown Square';
        
        if (keyParts.length >= 5) {
          // keyParts: ['original', eventCode, player, squareInfo, timestamp]
          player = keyParts[2];
          const squareInfo = keyParts[3];
          timestamp = keyParts[4];
          
          // Extract square index from squareX format
          const squareMatch = squareInfo.match(/^square(\d+)$/);
          if (squareMatch) {
            squareIndex = parseInt(squareMatch[1]);
            if (squareIndex >= 0 && squareIndex < squares.length) {
              squareText = squares[squareIndex];
            }
          }
        }
        
        // Create a better filename
        const cleanSquareText = squareText.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
        const betterFilename = `${eventCode}_${player.replace(/_/g, ' ')}_${cleanSquareText}.jpg`;
        
        // Use the actual thumbnail key if available
        const thumbnailUrl = p.thumbnailKey ? `${url.origin}/photo/${p.thumbnailKey}` : null;
        
        // Debug logging
        console.log(`Original key: ${p.originalKey}`);
        console.log(`Thumbnail key: ${p.thumbnailKey}`);
        console.log(`Better filename: ${betterFilename}`);
        console.log(`Thumbnail URL: ${thumbnailUrl}`);
        
        return {
          ...p,
          betterFilename,
          player: player.replace(/_/g, ' '),
          squareText,
          thumbnailUrl: thumbnailUrl,
          originalKey: p.originalKey
        };
      });

      const photoCards = enhancedPhotos.map((p, index) => 
        `<div class="photo-card">
          <div class="photo-header">
            <input type="checkbox" class="photo-checkbox" id="photo-${index}" data-filename="${p.betterFilename}" data-url="${url.origin}/admin/download-photo/${eventCode}/${encodeURIComponent(p.filename)}">
            <label for="photo-${index}" class="checkbox-label">Select</label>
          </div>
          <div class="photo-thumbnail">
            ${p.thumbnailUrl ? 
              `<img src="${p.thumbnailUrl}" alt="Thumbnail" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0zNSA0MEw2NSA0MFY2MEgzNVY0MFoiIGZpbGw9IiM5Y2EzYWYiLz4KPGNpcmNsZSBjeD0iNDUiIGN5PSI1MCIgcj0iMyIgZmlsbD0iIzljYTNhZiIvPgo8L3N2Zz4K'" />` :
              `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #9ca3af; font-size: 0.9rem;">No Preview</div>`
            }
          </div>
          <div class="photo-info">
            <div class="photo-title">${p.player}</div>
            <div class="photo-square">${p.squareText}</div>
            <div class="photo-size">${Math.round(p.data.byteLength / 1024)}KB</div>
          </div>
          <div class="photo-actions">
            <a href="${url.origin}/admin/download-photo/${eventCode}/${encodeURIComponent(p.filename)}" 
               download="${p.betterFilename}" 
               class="download-btn">
              Download
            </a>
          </div>
        </div>`
      ).join('');

      const totalSize = Math.round(originalPhotos.reduce((sum, p) => sum + p.data.byteLength, 0) / 1024 / 1024 * 100) / 100;
      
      const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Download Original Photos - ${eventCode}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f8fafc;
              color: #1f2937;
            }
            .container { max-width: 1200px; margin: 0 auto; }
            h1 { 
              color: #1f2937; 
              text-align: center; 
              margin-bottom: 30px;
              font-size: 2rem;
              font-weight: 700;
            }
            .summary { 
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              padding: 20px; 
              border-radius: 12px; 
              margin-bottom: 30px;
              text-align: center;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .summary strong { font-weight: 600; }
            .controls {
              display: flex;
              gap: 15px;
              margin-bottom: 30px;
              flex-wrap: wrap;
              justify-content: center;
            }
            .download-all, .download-selected, .select-folder { 
              background: linear-gradient(135deg, #10b981, #059669);
              color: white; 
              padding: 12px 24px; 
              border: none; 
              border-radius: 8px; 
              cursor: pointer;
              font-weight: 600;
              font-size: 1rem;
              transition: all 0.2s ease;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .download-all:hover, .download-selected:hover, .select-folder:hover { 
              transform: translateY(-1px);
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            .select-folder {
              background: linear-gradient(135deg, #8b5cf6, #7c3aed);
            }
            .download-selected {
              background: linear-gradient(135deg, #f59e0b, #d97706);
            }
            .photo-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 15px;
              padding: 10px;
              background: #f8fafc;
              border-radius: 8px;
            }
            .photo-checkbox {
              width: 18px;
              height: 18px;
              accent-color: #3b82f6;
            }
            .checkbox-label {
              font-weight: 600;
              color: #374151;
              cursor: pointer;
            }
            .selection-controls {
              display: flex;
              gap: 15px;
              align-items: center;
              justify-content: center;
              margin-bottom: 20px;
              padding: 15px;
              background: white;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .select-all-btn, .select-none-btn {
              background: #6b7280;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 6px;
              cursor: pointer;
              font-weight: 600;
              font-size: 0.9rem;
              transition: all 0.2s ease;
            }
            .select-all-btn:hover, .select-none-btn:hover {
              background: #4b5563;
              transform: translateY(-1px);
            }
            .selection-count {
              font-weight: 600;
              color: #374151;
            }
            .photo-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
              gap: 20px;
              margin-top: 20px;
            }
            .photo-card {
              background: white;
              border-radius: 12px;
              padding: 20px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              transition: all 0.2s ease;
              border: 1px solid #e5e7eb;
            }
            .photo-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }
            .photo-thumbnail {
              width: 100%;
              height: 200px;
              border-radius: 8px;
              overflow: hidden;
              margin-bottom: 15px;
              background: #f3f4f6;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .photo-thumbnail img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.2s ease;
            }
            .photo-card:hover .photo-thumbnail img {
              transform: scale(1.05);
            }
            .photo-info {
              margin-bottom: 15px;
            }
            .photo-title {
              font-weight: 600;
              font-size: 1.1rem;
              color: #1f2937;
              margin-bottom: 5px;
            }
            .photo-square {
              color: #6b7280;
              font-size: 0.9rem;
              line-height: 1.4;
              margin-bottom: 5px;
            }
            .photo-size {
              color: #9ca3af;
              font-size: 0.8rem;
              font-weight: 500;
            }
            .download-btn {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6, #2563eb);
              color: white;
              text-decoration: none;
              padding: 10px 20px;
              border-radius: 6px;
              font-weight: 600;
              font-size: 0.9rem;
              transition: all 0.2s ease;
              text-align: center;
              width: 100%;
            }
            .download-btn:hover {
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              transform: translateY(-1px);
            }
            .status {
              position: fixed;
              top: 20px;
              right: 20px;
              background: #10b981;
              color: white;
              padding: 10px 20px;
              border-radius: 8px;
              font-weight: 600;
              display: none;
              z-index: 1000;
            }
            @media (max-width: 768px) {
              .photo-grid { grid-template-columns: 1fr; }
              .controls { flex-direction: column; align-items: center; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Original Photos for Event: ${eventCode}</h1>
            
            <div class="summary">
              <div><strong>Total Photos:</strong> ${originalPhotos.length}</div>
              <div><strong>Total Size:</strong> ${totalSize}MB</div>
            </div>
            
            <div class="controls">
              <button class="select-folder" onclick="selectDownloadFolder()">Choose Download Folder</button>
              <button class="download-selected" onclick="downloadSelected()">Download Selected Photos</button>
              <button class="download-all" onclick="downloadAll()">Download All Photos</button>
            </div>
            
            <div class="selection-controls">
              <button class="select-all-btn" onclick="selectAll()">Select All</button>
              <button class="select-none-btn" onclick="selectNone()">Select None</button>
              <span class="selection-count">0 photos selected</span>
            </div>
            
            <div class="photo-grid">
              ${photoCards}
            </div>
          </div>
          
          <div class="status" id="status"></div>
          
          <script>
            let directoryHandle = null;
            
            const supportsFileSystemAccess = 'showDirectoryPicker' in window;
            
            if (!supportsFileSystemAccess) {
              document.querySelector('.select-folder').style.display = 'none';
            }
            
            function showStatus(message, duration = 3000) {
              const status = document.getElementById('status');
              status.textContent = message;
              status.style.display = 'block';
              setTimeout(() => {
                status.style.display = 'none';
              }, duration);
            }
            
            async function selectDownloadFolder() {
              if (!supportsFileSystemAccess) {
                showStatus('Folder selection not supported in this browser');
                return;
              }
              
              try {
                directoryHandle = await window.showDirectoryPicker();
                showStatus('Selected folder: ' + directoryHandle.name);
                document.querySelector('.select-folder').textContent = 'Folder: ' + directoryHandle.name;
              } catch (err) {
                if (err.name !== 'AbortError') {
                  showStatus('Failed to select folder');
                }
              }
            }
            
            async function downloadToFolder(url, filename) {
              if (!directoryHandle) {
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                return;
              }
              
              try {
                const response = await fetch(url);
                const blob = await response.blob();
                
                const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                
                showStatus('Downloaded: ' + filename);
              } catch (err) {
                console.error('Download failed:', err);
                showStatus('Failed to download: ' + filename);
              }
            }
            
            async function downloadSelected() {
              const checkboxes = document.querySelectorAll('.photo-checkbox:checked');
              
              if (checkboxes.length === 0) {
                showStatus('Please select photos to download');
                return;
              }
              
              showStatus('Starting download of ' + checkboxes.length + ' selected photos...', 5000);
              
              for (let i = 0; i < checkboxes.length; i++) {
                const checkbox = checkboxes[i];
                const url = checkbox.dataset.url;
                const filename = checkbox.dataset.filename;
                
                if (directoryHandle) {
                  await downloadToFolder(url, filename);
                } else {
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = filename;
                  a.click();
                }
                
                if (i < checkboxes.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
              
              showStatus('Selected downloads completed!');
            }

            async function downloadAll() {
              const links = document.querySelectorAll('.download-btn');
              showStatus('Starting download of ' + links.length + ' photos...', 5000);
              
              for (let i = 0; i < links.length; i++) {
                const link = links[i];
                const url = link.href;
                const filename = link.download;
                
                if (directoryHandle) {
                  await downloadToFolder(url, filename);
                } else {
                  link.click();
                }
                
                if (i < links.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
              }
              
              showStatus('All downloads completed!');
            }
            
            function selectAll() {
              const checkboxes = document.querySelectorAll('.photo-checkbox');
              checkboxes.forEach(cb => cb.checked = true);
              updateSelectionCount();
            }
            
            function selectNone() {
              const checkboxes = document.querySelectorAll('.photo-checkbox');
              checkboxes.forEach(cb => cb.checked = false);
              updateSelectionCount();
            }
            
            function updateSelectionCount() {
              const checkedCount = document.querySelectorAll('.photo-checkbox:checked').length;
              const totalCount = document.querySelectorAll('.photo-checkbox').length;
              document.querySelector('.selection-count').textContent = checkedCount + ' of ' + totalCount + ' photos selected';
            }

            document.querySelectorAll('.download-btn').forEach(btn => {
              btn.addEventListener('click', async (e) => {
                if (directoryHandle) {
                  e.preventDefault();
                  await downloadToFolder(btn.href, btn.download);
                }
              });
            });
            
            document.querySelectorAll('.photo-checkbox').forEach(cb => {
              cb.addEventListener('change', updateSelectionCount);
            });
            
            updateSelectionCount();
          </script>
        </body>
        </html>
      `;

      return new Response(htmlResponse, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Failed to retrieve original photos", 
        details: error.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  // Clean up corrupted progress data
  if (request.method === "POST" && path === "/admin/cleanup-progress") {
    const data = await request.json();
    const { eventCode } = data;

    if (!eventCode) {
      return new Response("Event code is required", { status: 400, headers: corsHeaders });
    }

    try {
      const list = await env.EventBingoProgress.list({ prefix: `${eventCode}_` });
      let cleanedCount = 0;

      for (const item of list.keys || []) {
        const keyName = item.name || item.key;
        if (!keyName.startsWith('event_')) {
          const progressData = await env.EventBingoProgress.get(keyName);
          
          if (progressData) {
            const progress = JSON.parse(progressData);
            let needsUpdate = false;
            
            // Clean up NaN keys in photos
            if (progress.photos && typeof progress.photos === 'object') {
              const cleanPhotos = {};
              for (const [key, value] of Object.entries(progress.photos)) {
                const index = parseInt(key);
                if (!isNaN(index) && index >= 0) {
                  cleanPhotos[index] = value;
                } else {
                  needsUpdate = true;
                }
              }
              progress.photos = cleanPhotos;
            }
            
            // Clean up null values in completedSquares
            if (progress.completedSquares && Array.isArray(progress.completedSquares)) {
              progress.completedSquares = progress.completedSquares.filter(
                item => item !== null && !isNaN(parseInt(item))
              );
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              await env.EventBingoProgress.put(keyName, JSON.stringify(progress));
              cleanedCount++;
            }
          }
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} progress entries` 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: "Cleanup failed", 
        details: error.message 
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Admin endpoint not found", { status: 404, headers: corsHeaders });
}

// Authentication request handler
async function handleAuthRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Register new player with authentication
  if (request.method === "POST" && path === "/auth/register") {
    try {
      const data = await request.json();
      const { eventCode, playerName, answer } = data;

      if (!eventCode || !playerName || !answer) {
        return new Response("Missing required fields", { status: 400, headers: corsHeaders });
      }

      // Validate answer
      if (!isValidAnswer(answer)) {
        return new Response("Answer must be between 1 and 100 characters", { 
          status: 400, 
          headers: corsHeaders 
        });
      }

      // Check if player already exists
      const authKey = getAuthKey(eventCode, playerName);
      const existingAuth = await env.EventBingoProgress.get(authKey);

      const progressKey = getProgessKey(eventCode, playerName);
      const progress = await env.EventBingoProgress.get(progressKey);

      if (existingAuth) {
        // Ensure each user when authenticated has progress if created
        if (!progress) {
          await env.EventBingoProgress.put(progressKey, JSON.stringify({ completedSquares: [], photos: {} }));
        }

        return new Response("Player already exists", { status: 409, headers: corsHeaders });
      }

      // Assign random question and store authentication data
      const question = getRandomQuestion();
      const normalizedAnswer = normalizeAnswer(answer);
      
      console.log(`Registering player ${playerName}: answer "${answer}" -> normalized "${normalizedAnswer}"`);
      
      const authData = {
        question: question,
        answer: normalizedAnswer,
        createdAt: new Date().toISOString(),
        lastVerified: new Date().toISOString()
      };

      await env.EventBingoProgress.put(authKey, JSON.stringify(authData));

      // Set empty progess on event for new player
      await env.EventBingoProgress.put(progressKey, JSON.stringify({ completedSquares: [], photos: {} }));

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Player registered successfully",
        question: question
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response("Registration failed", { status: 500, headers: corsHeaders });
    }
  }

  // Verify player authentication
  if (request.method === "POST" && path === "/auth/verify") {
    try {
      const data = await request.json();
      const { eventCode, playerName, answer } = data;

      if (!eventCode || !playerName || !answer) {
        return new Response("Missing required fields", { status: 400, headers: corsHeaders });
      }

      // Get stored authentication data
      const authKey = getAuthKey(eventCode, playerName);
      const authData = await env.EventBingoProgress.get(authKey);
      
      if (!authData) {
        return new Response(JSON.stringify({ 
          success: false, 
          authenticated: false,
          message: "Player not found"
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const auth = JSON.parse(authData);
      const normalizedAnswer = normalizeAnswer(answer);
      const isCorrect = auth.answer === normalizedAnswer;
      
      console.log(`Verifying player ${playerName}: stored "${auth.answer}" vs provided "${answer}" -> normalized "${normalizedAnswer}" -> match: ${isCorrect}`);

      // Update last verified timestamp if correct
      if (isCorrect) {
        auth.lastVerified = new Date().toISOString();
        await env.EventBingoProgress.put(authKey, JSON.stringify(auth));
      }

      return new Response(JSON.stringify({ 
        success: true, 
        authenticated: isCorrect,
        message: isCorrect ? "Authentication successful" : "Incorrect answer"
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response("Verification failed", { status: 500, headers: corsHeaders });
    }
  }

  // Get player's question
  if (request.method === "GET" && path.startsWith("/auth/question/")) {
    try {
      const pathParts = path.split('/');
      const eventCode = pathParts[3];
      const playerName = decodeURIComponent(pathParts[4]);

      if (!eventCode || !playerName) {
        return new Response("Missing event code or player name", { status: 400, headers: corsHeaders });
      }

      // Get stored authentication data
      const authKey = getAuthKey(eventCode, playerName);
      const authData = await env.EventBingoProgress.get(authKey);
      
      if (!authData) {
        return new Response("Player not found", { status: 404, headers: corsHeaders });
      }

      const auth = JSON.parse(authData);

      return new Response(JSON.stringify({ 
        question: auth.question
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (error) {
      return new Response("Failed to get question", { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Authentication endpoint not found", { status: 404, headers: corsHeaders });
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

    // Root endpoint - return available endpoints
    if (request.method === "GET" && path === "/") {
      return new Response(JSON.stringify({
        service: "EventBingo Worker",
        version: "1.0",
        endpoints: {
          "GET /event-info?event=<code>": "Get event information",
          "POST /upload": "Upload a photo",
          "GET /progress?event=<code>&player=<name>": "Get player progress",
          "GET /player?name=<name>&event=<code>": "Get player photos (legacy)",
          "GET /leader?event=<code>": "Get leaderboard (legacy)",
          "GET /players?event=<code>": "Get all players",
          "GET /photos?event=<code>": "Get all photos",
          "GET /photo/<key>": "Get specific photo",
          "POST /react": "Save a reaction to a photo",
          "GET /reactions?event=<code>&player=<name>": "Get all reactions for a player's photos",
          "POST /auth/register": "Register new player with authentication",
          "POST /auth/verify": "Verify player authentication",
          "GET /auth/question/<event>/<player>": "Get player's secret question",
          "POST /admin/create-event": "Create event",
          "GET /admin/events": "List events",
          "GET /admin/event/<code>": "Get event details",
          "GET /admin/download-originals/<code>": "Download original photos page",
          "GET /admin/download-photo/<code>/<filename>": "Download individual photo",
          "POST /admin/cleanup-progress": "Clean corrupted progress data"
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/admin/")) {
      return await handleAdminRequest(request, env, corsHeaders);
    }

    if (path.startsWith("/auth/")) {
      return await handleAuthRequest(request, env, corsHeaders);
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
      const type = formData.get("type") || 'compressed'; // 'compressed' or 'original'
      const secretAnswer = formData.get("secretAnswer");

      if (!file || !player || !square) {
        return new Response("Missing required fields", { status: 400, headers: corsHeaders });
      }

      // Verify authentication for compressed uploads (main uploads)
      if (type === 'compressed' && secretAnswer) {
        const authKey = getAuthKey(eventCode, player);
        const authData = await env.EventBingoProgress.get(authKey);
        
        if (authData) {
          const auth = JSON.parse(authData);
          const normalizedAnswer = normalizeAnswer(secretAnswer);
          
          if (auth.answer !== normalizedAnswer) {
            return new Response(JSON.stringify({ 
              success: false, 
              error: "Authentication failed",
              message: "You can only upload photos for yourself"
            }), { 
              status: 403, 
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
          // Update last verified timestamp
          auth.lastVerified = new Date().toISOString();
          await env.EventBingoProgress.put(authKey, JSON.stringify(auth));
        }
        // If no auth data exists, allow upload for backward compatibility
        // This will be tightened in future versions
      }

      try {
        // Check if event is locked (only for compressed uploads to avoid duplicate locks)
        if (type === 'compressed') {
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
        }

        const timestamp = Date.now();
        const baseKey = `${eventCode}_${player.replace(/\s+/g, '_')}_square${square}_${timestamp}`;
        
        // Use different prefixes for compressed vs original
        const key = type === 'original' ? `original_${baseKey}` : `thumb_${baseKey}`;

        await env.EventBingoPhotos.put(key, file);

        // Only update progress for compressed uploads (the main upload)
        if (type === 'compressed') {
          const progressKey = getProgessKey(eventCode, player);
          let progress = await env.EventBingoProgress.get(progressKey);
          
          if (progress) {
            progress = JSON.parse(progress);
          } else {
            progress = { completedSquares: [], photos: {} };
          }

          const squareIndex = parseInt(square);
          if (!isNaN(squareIndex)) {
            if (!progress.completedSquares.includes(squareIndex)) {
              progress.completedSquares.push(squareIndex);
            }
            // Store the compressed version key for display
            progress.photos[squareIndex] = key;
          }

          await env.EventBingoProgress.put(progressKey, JSON.stringify(progress));
        }

        return new Response(JSON.stringify({ success: true, key, type }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
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

    // Get player photos (legacy endpoint for compatibility)
    if (request.method === "GET" && path === "/player") {
      const eventCode = getEventCode(request);
      const player = url.searchParams.get('name');
      
      if (!player) {
        return new Response("Player name parameter required", { status: 400, headers: corsHeaders });
      }

      try {
        const progressKey = `${eventCode}_${player}`;
        const progress = await env.EventBingoProgress.get(progressKey);
        
        if (progress) {
          const playerData = JSON.parse(progress);
          const photos = playerData.photos || {};
          
          // Get squares for this event
          const squares = await getSquaresForEvent(env, eventCode);
          
          // Convert photo keys to URLs and map by square text
          const photosBySquare = {};
          for (const [squareIndex, photoKey] of Object.entries(photos)) {
            const index = parseInt(squareIndex);
            if (!isNaN(index) && index >= 0 && index < squares.length) {
              const squareText = squares[index];
              if (squareText && photoKey) {
                photosBySquare[squareText] = `${url.origin}/photo/${photoKey}`;
              }
            }
          }
          
          return new Response(JSON.stringify(photosBySquare), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({}), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (error) {
        return new Response("Internal server error", { status: 500, headers: corsHeaders });
      }
    }

    // Get leaderboard (legacy endpoint for compatibility)
    if (request.method === "GET" && path === "/leader") {
      const eventCode = getEventCode(request);
      
      try {
        const list = await env.EventBingoProgress.list({ prefix: `${eventCode}_` });
        let leader = { name: "", count: 0 };

        for (const item of list.keys || []) {
          const keyName = item.name || item.key;
          if (!keyName.startsWith('event_')) {
            const playerName = keyName.replace(`${eventCode}_`, '');
            const progressData = await env.EventBingoProgress.get(keyName);
            
            if (progressData) {
              const progress = JSON.parse(progressData);
              const count = progress.completedSquares ? progress.completedSquares.length : 0;
              
              if (count > leader.count) {
                leader = { name: playerName, count: count };
              }
            }
          }
        }

        return new Response(JSON.stringify(leader), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ name: "", count: 0 }), {
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
          if (playerName) {
            // Get player progress to count completed squares
            const progressData = await env.EventBingoProgress.get(keyName);
            let count = 0;
            
            if (progressData) {
              const progress = JSON.parse(progressData);
              count = progress.completedSquares ? progress.completedSquares.length : 0;
            }
            
            // Check if player already exists in array
            const existingPlayer = players.find(p => p.name === playerName);
            if (!existingPlayer) {
              players.push({ name: playerName, count: count });
            }
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
          const timestamp = parseInt(parts[parts.length - 1]);
          
          photos.push({
            key: keyName,
            player: player.replace(/_/g, ' '),
            square: square,
            uploaded: new Date(timestamp).toISOString()
          });
        }
      }

      photos.sort((a, b) => {
        const timeA = new Date(a.uploaded).getTime();
        const timeB = new Date(b.uploaded).getTime();
        return timeB - timeA;
      });

      return new Response(JSON.stringify(photos), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save a reaction
    if (request.method === "POST" && path === "/react") {
      try {
        const data = await request.json();
        const { eventCode, playerName, square, emoji } = data;

        if (!eventCode || !playerName || square === undefined || !emoji) {
          return new Response("Missing required fields", { status: 400, headers: corsHeaders });
        }

        // Validate emoji is one of the allowed ones
        const allowedEmojis = ['❤️', '😂', '🔥', '🙌'];
        if (!allowedEmojis.includes(emoji)) {
          return new Response("Invalid emoji", { status: 400, headers: corsHeaders });
        }

        // Get current reactions for this photo
        const reactionKey = `reactions:${eventCode}:${playerName}:${square}`;
        let reactions = {};
        
        const existingData = await env.EventBingoProgress.get(reactionKey);
        if (existingData) {
          reactions = JSON.parse(existingData);
        }

        // Initialize emoji count if it doesn't exist
        if (!reactions[emoji]) {
          reactions[emoji] = 0;
        }

        // Increment the count
        reactions[emoji]++;

        // Save back to KV
        await env.EventBingoProgress.put(reactionKey, JSON.stringify(reactions));

        return new Response(JSON.stringify({ 
          success: true, 
          reactions 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: "Failed to save reaction",
          details: error.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    // Get all reactions for a player's photos
    if (request.method === "GET" && path === "/reactions") {
      try {
        const eventCode = getEventCode(request);
        const playerName = url.searchParams.get('player');

        if (!playerName) {
          return new Response("Player parameter required", { status: 400, headers: corsHeaders });
        }

        // Get all reaction keys for this player
        const prefix = `reactions:${eventCode}:${playerName}:`;
        const list = await env.EventBingoProgress.list({ prefix });
        const allReactions = {};

        for (const item of list.keys || []) {
          const keyName = item.name || item.key;
          // Extract square number from key: reactions:eventCode:playerName:square
          const parts = keyName.split(':');
          if (parts.length === 4) {
            const square = parts[3];
            const reactionData = await env.EventBingoProgress.get(keyName);
            if (reactionData) {
              allReactions[square] = JSON.parse(reactionData);
            }
          }
        }

        return new Response(JSON.stringify(allReactions), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: "Failed to get reactions",
          details: error.message 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};