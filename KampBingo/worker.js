const squaresList = [
  "An old photo with Anneke",
  "A photo from a past birthday or braai",
  "The oldest selfie you have together",
  "Anneke walking barefoot (bonus: dirty feet)",
  "Anneke drinking beer (bonus: a cheers moment)",
  "Someone borrowing something from Anneke",
  "Oliver playing ball with someone",
  "The baby with a new 'aunt' or 'uncle'",
  "Everyone gathered around the fire",
  "Anneke reading a book in peace",
  "Morning coffee in a mug that’s not yours",
  "Oliver 'helping' with something (e.g., pouring tea, fixing, or cooking)",
  "A photo of the sunset or campfire glow",
  "Someone with muddy or sandy feet",
  "Anneke’s laugh caught in a candid photo",
  "A camp game or activity moment",
  "A creative photo of beer or tea (bonus: both)",
  "Oliver on his bike",
  "A group photo of everyone",
  "Someone looking for their lost item (e.g., phone, shoe, drink)",
  "A photo showing borrowed camping gear",
  "Oliver dunking something in tea",
  "Anneke relaxing with a book and drink",
  "The baby smiling",
  "Everyone waving goodnight at the fire"
];

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Handle photo upload
    if (request.method === "POST") {
      const form = await request.formData();
      const file = form.get("file");
      const player = form.get("player");
      const square = form.get("square");

      if (!file || !player || !square) {
        return new Response("Missing fields", { status: 400, headers: corsHeaders });
      }

      const safePlayer = player.replace(/\s+/g, "_");
      const safeSquare = square.replace(/\s+/g, "_");
      const timestamp = Date.now();
      const filename = `${safePlayer}_${safeSquare}_${timestamp}_${file.name}`;

      await env.KampBingoProgress.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      const proxyUrl = `https://rapid-hill-7b92.reinier-olivier.workers.dev/${filename}`;
      const urlKey = `${safePlayer}_${safeSquare}`;
      
      console.log(`Storing photo URL: ${urlKey} -> ${proxyUrl}`);
      await env.KampBingoProgress.put(urlKey, proxyUrl);
      
      // Verify storage
      const storedUrl = await env.KampBingoProgress.get(urlKey);
      console.log(`Verification - stored URL: ${storedUrl}, type: ${typeof storedUrl}`);

      return new Response(JSON.stringify({ url: proxyUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Test endpoint to check environment
    if (request.method === "GET" && url.pathname === "/test") {
      try {
        const testResult = {
          message: "Worker is running",
          hasEnv: !!env.KampBingoProgress,
          timestamp: new Date().toISOString()
        };
        
        return new Response(JSON.stringify(testResult), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Serve image proxy
    if (request.method === "GET" && !["/player", "/players", "/leader", "/test"].includes(url.pathname)) {
      const key = url.pathname.slice(1);
      const object = await env.KampBingoProgress.get(key);

      if (!object || !object.body) {
        return new Response("Image not found", { status: 404, headers: corsHeaders });
      }

      return new Response(object.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
        },
      });
    }

    // Return all photo URLs for a player
    if (request.method === "GET" && url.pathname === "/player") {
      try {
        const player = url.searchParams.get("name");
        if (!player) {
          return new Response("Missing player name", { status: 400, headers: corsHeaders });
        }

        console.log(`Fetching photos for player: ${player}`);
        const safePlayer = player.replace(/\s+/g, "_");
        const results = {};

        for (const square of squaresList) {
          const safeSquare = square.replace(/\s+/g, "_");
          const key = `${safePlayer}_${safeSquare}`;
          const photoUrl = await env.KampBingoProgress.get(key);
          console.log(`Key: ${key}, PhotoUrl: ${photoUrl}, Type: ${typeof photoUrl}`);
          
          if (photoUrl) {
            // Handle both string URLs and object responses
            const url = typeof photoUrl === 'string' ? photoUrl : photoUrl.toString();
            results[square] = url;
            console.log(`Added to results: ${square} -> ${url}`);
          }
        }

        console.log(`Final results for ${player}:`, results);
        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error in /player endpoint:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Return sorted list of players
    if (request.method === "GET" && url.pathname === "/players") {
      try {
        console.log("Fetching players list...");
        console.log("Environment variable exists:", !!env.KampBingoProgress);
        
        const list = await env.KampBingoProgress.list();
        console.log("List object:", list);
        console.log("List keys:", list.keys);
        console.log("Raw list keys:", list.keys ? list.keys.map(k => k.name) : "No keys");
        
        const names = new Set();

        if (list.keys && list.keys.length > 0) {
          for (const item of list.keys) {
            const [name, square] = item.name.split("_");
            console.log(`Processing item: ${item.name} -> name: ${name}, square: ${square}`);
            if (name && square && squaresList.some(s => square === s.replace(/\s+/g, "_"))) {
              names.add(name.replace(/_/g, " "));
            }
          }
        } else {
          console.log("No keys found in storage");
        }

        const result = [...names].sort();
        console.log("Final player names:", result);
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error in /players endpoint:", error);
        console.error("Error stack:", error.stack);
        return new Response(JSON.stringify({ 
          error: error.message,
          stack: error.stack,
          type: error.constructor.name
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Return leaderboard
    if (request.method === "GET" && url.pathname === "/leader") {
      try {
        console.log("Fetching leaderboard...");
        const list = await env.KampBingoProgress.list();
        const counts = {};

        for (const item of list.keys) {
          const [name, square] = item.name.split("_");
          if (name && square && squaresList.some(s => square === s.replace(/\s+/g, "_"))) {
            const cleanName = name.replace(/_/g, " ");
            counts[cleanName] = (counts[cleanName] || 0) + 1;
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

        const result = { name: leader, count: max };
        console.log("Leaderboard result:", result);

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error in /leader endpoint:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Default fallback
    return new Response("KampBingo Worker is running.", {
      status: 200,
      headers: corsHeaders,
    });
  },
};
