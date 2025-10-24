const squaresList = [
  "'n Ou foto saam met Anneke",
  "'n Foto van 'n vorige verjaarsdag of braai",
  "Die oudste selfie wat julle saam het",
  "Anneke wat kaalvoet loop (bonus: vuil voete)",
  "Anneke wat 'n bier drink (bonus: cheers oomblik)",
  "Iemand wat iets by Anneke leen",
  "Oliver wat saam met iemand bal speel",
  "Die baba saam met 'n 'tannie' of 'oom'",
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
  "Die baba wat glimlag",
  "Almal wat totsiens waai by die vuur"
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
      
      await env.KampBingoProgress.put(urlKey, proxyUrl, {
        httpMetadata: { contentType: "text/plain" }
      });

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

        const safePlayer = player.replace(/\s+/g, "_");
        const results = {};

        for (const square of squaresList) {
          const safeSquare = square.replace(/\s+/g, "_");
          const key = `${safePlayer}_${safeSquare}`;
          const photoUrl = await env.KampBingoProgress.get(key);
          
          if (photoUrl) {
            // Handle GetResult object from Cloudflare Workers R2
            let url;
            if (typeof photoUrl === 'string') {
              url = photoUrl;
            } else if (photoUrl && typeof photoUrl === 'object') {
              // For GetResult objects, we need to get the actual value
              url = await photoUrl.text();
            } else {
              url = photoUrl.toString();
            }
            results[square] = url;
          }
        }
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

    // Return sorted list of players with counts
    if (request.method === "GET" && url.pathname === "/players") {
      try {
        const list = await env.KampBingoProgress.list();
        const items = list.objects || list.keys || [];
        const playerCounts = {};
        
        // Process all items to get player counts
        for (const item of items) {
          const keyName = item.key || item.name;
          
          // Skip image files (they have timestamps and file extensions)
          if (keyName.match(/\d{13}/) || keyName.includes('.')) {
            continue;
          }
          
          // Look for URL keys (player_square format)
          const parts = keyName.split("_");
          if (parts.length >= 2) {
            const playerName = parts[0];
            const squarePart = parts.slice(1).join("_");
            
            // Check if this matches any of our squares
            const matchingSquare = squaresList.find(s => 
              squarePart === s.replace(/\s+/g, "_")
            );
            
            if (matchingSquare) {
              playerCounts[playerName] = (playerCounts[playerName] || 0) + 1;
            }
          }
        }

        // Return both player names and their counts
        const result = Object.keys(playerCounts).sort().map(name => ({
          name: name,
          count: playerCounts[name]
        }));
        
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error in /players endpoint:", error);
        return new Response(JSON.stringify({ error: error.message }), {
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
