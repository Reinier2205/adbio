const squaresList = [
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
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

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

      await env.EventBingoProgress.put(filename, file.stream(), {
        httpMetadata: { contentType: file.type },
      });

      const proxyUrl = `https://shy-recipe-5fb1.reinier-olivier.workers.dev/${filename}`;
      const urlKey = `${safePlayer}_${safeSquare}`;

      await env.EventBingoProgress.put(urlKey, proxyUrl, {
        httpMetadata: { contentType: "text/plain" }
      });

      return new Response(JSON.stringify({ url: proxyUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && path === "/test") {
      const testResult = {
        message: "Worker is running",
        hasEnv: !!env.EventBingoProgress,
        timestamp: new Date().toISOString()
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
         const key = `${safePlayer}_${safeSquare}`;
         console.log("Looking for photo with key:", key);
         const photoUrl = await env.EventBingoProgress.get(key);

         if (photoUrl) {
           let url;
           if (typeof photoUrl === 'string') {
             url = photoUrl;
           } else if (photoUrl && typeof photoUrl === 'object') {
             url = await photoUrl.text();
           } else {
             url = photoUrl.toString();
           }
           console.log("Found photo URL for", square, ":", url);
           results[square] = url;
         } else {
           console.log("No photo found for", square);
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

        const match = normalizedSquares.find(square => keyName.endsWith(`_${square}`));
        if (match) {
          const playerName = keyName.slice(0, keyName.length - match.length - 1);
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

      return new Response(JSON.stringify({ name: leader, count: max }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.method === "GET" && (path === "/" || path === "")) {
      return new Response("EventBingo Worker is running.", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

     if (request.method === "GET") {
       const key = path.slice(1);
       console.log("Trying to serve image with key:", key);
       const object = await env.EventBingoProgress.get(key);

       if (!object || !object.body) {
         console.log("Image not found for key:", key);
         return new Response("Image not found", { status: 404, headers: corsHeaders });
       }

       console.log("Serving image for key:", key);
       return new Response(object.body, {
         status: 200,
         headers: {
           ...corsHeaders,
           "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
         },
       });
     }

    return new Response("EventBingo Worker is running.", {
      status: 200,
      headers: corsHeaders,
    });
  },
};
