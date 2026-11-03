/**
 * DelNorte Camino Training Tracker
 * Cloudflare Worker Entry Point
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API Routes
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleAPI(request, env, corsHeaders);
      } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: error.message }, 500, corsHeaders);
      }
    }

    // Serve static files using new Assets binding
    try {
      if (env.ASSETS) {
        console.log('Serving asset via ASSETS binding:', url.pathname);
        return await env.ASSETS.fetch(request);
      } else {
        console.error('ASSETS binding not available');
        return new Response(getIndexHTML(), {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    } catch (e) {
      console.error('Asset serving error:', e);
      // Fallback to inline HTML
      return new Response(getIndexHTML(), {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  },
};

/**
 * Supabase REST API Helper
 */
async function supabaseRequest(env, endpoint, options = {}) {
  const url = `${env.SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': env.SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase error: ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

/**
 * API Route Handler
 */
async function handleAPI(request, env, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const method = request.method;

  // Authentication: Simple name-based lookup
  const authHeader = request.headers.get('Authorization');
  let currentUser = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const userName = authHeader.replace('Bearer ', '');
    try {
      const travelers = await supabaseRequest(env, `travelers?name=eq.${encodeURIComponent(userName)}`);
      if (travelers && travelers.length > 0) {
        currentUser = travelers[0];
      }
    } catch (e) {
      console.error('Auth error:', e);
    }
  }

  // Routes
  switch (path) {
    case '/login':
      return handleLogin(request, env, corsHeaders);
    
    case '/travelers':
      return handleTravelers(method, env, corsHeaders);
    
    case '/dashboard':
      return handleDashboard(env, corsHeaders);
    
    case '/activities':
      return handleActivities(method, request, currentUser, env, corsHeaders);
    
    case '/weight':
      return handleWeight(method, request, currentUser, env, corsHeaders);
    
    case '/gear':
      return handleGear(method, request, currentUser, env, corsHeaders);
    
    case '/videos':
      return handleVideos(method, request, env, corsHeaders);
    
    case '/progress/weekly':
      return handleWeeklyProgress(env, corsHeaders);
    
    default:
      return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
  }
}

/**
 * Login Handler
 */
async function handleLogin(request, env, corsHeaders) {
  const { name } = await request.json();
  const travelers = await supabaseRequest(env, `travelers?name=eq.${encodeURIComponent(name)}`);
  
  if (!travelers || travelers.length === 0) {
    return jsonResponse({ error: 'Traveler not found' }, 404, corsHeaders);
  }
  
  return jsonResponse({ 
    success: true, 
    user: travelers[0],
    token: name
  }, 200, corsHeaders);
}

/**
 * Travelers Handler
 */
async function handleTravelers(method, env, corsHeaders) {
  if (method === 'GET') {
    const data = await supabaseRequest(env, 'travelers?order=name.asc');
    return jsonResponse(data, 200, corsHeaders);
  }
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Dashboard Handler
 */
async function handleDashboard(env, corsHeaders) {
  const weekStart = getMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const startStr = weekStart.toISOString().split('T')[0];
  const endStr = weekEnd.toISOString().split('T')[0];
  
  const activities = await supabaseRequest(
    env, 
    `activities?activity_date=gte.${startStr}&activity_date=lte.${endStr}&select=*,travelers(name)`
  );
  
  const userStats = {};
  activities.forEach(act => {
    const userName = act.travelers?.name || 'Unknown';
    if (!userStats[userName]) {
      userStats[userName] = {
        walking_km: 0,
        walking_count: 0,
        pilates_count: 0,
        other_activities: 0
      };
    }
    
    if (act.activity_type === 'walk') {
      userStats[userName].walking_km += parseFloat(act.distance_km || 0);
      userStats[userName].walking_count++;
    } else if (act.activity_type === 'pilates') {
      userStats[userName].pilates_count++;
    } else {
      userStats[userName].other_activities++;
    }
  });
  
  return jsonResponse({ weekStart, weekEnd, userStats }, 200, corsHeaders);
}

/**
 * Activities Handler
 */
async function handleActivities(method, request, currentUser, env, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    let endpoint = 'activities?select=*,travelers(name)&order=activity_date.desc&limit=50';
    if (userId) {
      endpoint = `activities?user_id=eq.${userId}&select=*,travelers(name)&order=activity_date.desc&limit=50`;
    }
    
    const data = await supabaseRequest(env, endpoint);
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const activity = await request.json();
    activity.user_id = currentUser.id;
    
    const data = await supabaseRequest(env, 'activities', {
      method: 'POST',
      body: JSON.stringify(activity)
    });
    
    // Update gear if boots were worn
    if (activity.wore_camino_boots && activity.distance_km) {
      await updateGearKm(currentUser.id, activity.distance_km, env);
    }
    
    return jsonResponse(data[0], 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Weight Handler
 */
async function handleWeight(method, request, currentUser, env, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      return jsonResponse({ error: 'user_id required' }, 400, corsHeaders);
    }
    
    const data = await supabaseRequest(
      env, 
      `weight_entries?user_id=eq.${userId}&order=entry_date.desc`
    );
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const entry = await request.json();
    entry.user_id = currentUser.id;
    
    const data = await supabaseRequest(env, 'weight_entries', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
    
    return jsonResponse(data[0], 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Gear Handler
 */
async function handleGear(method, request, currentUser, env, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id') || currentUser?.id;
    
    if (!userId) {
      return jsonResponse({ error: 'user_id required' }, 400, corsHeaders);
    }
    
    const data = await supabaseRequest(
      env,
      `gear_items?user_id=eq.${userId}&order=created_at.desc`
    );
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const gear = await request.json();
    gear.user_id = currentUser.id;
    
    const data = await supabaseRequest(env, 'gear_items', {
      method: 'POST',
      body: JSON.stringify(gear)
    });
    
    return jsonResponse(data[0], 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Videos Handler
 */
async function handleVideos(method, request, env, corsHeaders) {
  if (method === 'GET') {
    const data = await supabaseRequest(env, 'pilates_videos?order=slot_number.asc');
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'PUT') {
    const video = await request.json();
    const data = await supabaseRequest(
      env,
      `pilates_videos?slot_number=eq.${video.slot_number}`,
      {
        method: 'PATCH',
        body: JSON.stringify(video)
      }
    );
    return jsonResponse(data[0], 200, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Weekly Progress Handler
 */
async function handleWeeklyProgress(env, corsHeaders) {
  const today = new Date();
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  
  const data = await supabaseRequest(
    env,
    `activities?activity_date=gte.${eightWeeksAgo.toISOString().split('T')[0]}&select=*,travelers(name)&order=activity_date.desc`
  );
  
  return jsonResponse(data, 200, corsHeaders);
}

/**
 * Helper Functions
 */
function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

async function updateGearKm(userId, distanceKm, env) {
  try {
    const boots = await supabaseRequest(
      env,
      `gear_items?user_id=eq.${userId}&item_type=eq.boots`
    );
    
    if (boots && boots.length > 0) {
      const boot = boots[0];
      const newTotalKm = parseFloat(boot.total_km || 0) + parseFloat(distanceKm);
      const isReady = newTotalKm >= 100;
      
      await supabaseRequest(
        env,
        `gear_items?id=eq.${boot.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            total_km: newTotalKm,
            is_trail_ready: isReady,
            last_used: new Date().toISOString().split('T')[0]
          })
        }
      );
    }
  } catch (error) {
    console.error('Error updating gear km:', error);
  }
}

// Fallback HTML when Workers Sites assets aren't available
function getIndexHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DelNorte - Camino Training Tracker</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #2C5F4F 0%, #1F4438 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            text-align: center;
        }
        .logo { font-size: 48px; margin-bottom: 20px; }
        h1 { font-size: 32px; margin-bottom: 10px; }
        p { font-size: 18px; opacity: 0.9; line-height: 1.6; margin-bottom: 30px; }
        .error-box {
            background: rgba(255, 255, 255, 0.1);
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        .error-box h2 { font-size: 20px; margin-bottom: 10px; color: #F4C753; }
        .error-box p { font-size: 14px; opacity: 0.8; }
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🥾</div>
        <h1>DelNorte Camino Tracker</h1>
        <p>Your training companion for Camino del Norte</p>
        
        <div class="error-box">
            <h2>⚠️ Configuration Issue</h2>
            <p>Workers Sites assets are not properly configured.</p>
            <p style="margin-top: 15px;">
                The <code>__STATIC_CONTENT_MANIFEST</code> binding is missing.
                This usually means the site assets weren't uploaded correctly.
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
                Try redeploying with: <code>wrangler deploy</code>
            </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px;">
            Training Period: November 1, 2026 → June 1, 2027<br>
            <strong>Buen Camino!</strong>
        </p>
    </div>
</body>
</html>`;
}
