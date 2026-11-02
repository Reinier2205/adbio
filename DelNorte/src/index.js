/**
 * DelNorte Camino Training Tracker
 * Cloudflare Worker Entry Point
 */

import { createClient } from '@supabase/supabase-js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Initialize Supabase client
    const supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );

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
      return handleAPI(request, env, supabase, corsHeaders);
    }

    // Serve static files (frontend)
    return env.ASSETS.fetch(request);
  },
};

/**
 * API Route Handler
 */
async function handleAPI(request, env, supabase, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const method = request.method;

  try {
    // Authentication: Simple name-based lookup
    const authHeader = request.headers.get('Authorization');
    let currentUser = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const userName = authHeader.replace('Bearer ', '');
      const { data } = await supabase
        .from('travelers')
        .select('*')
        .eq('name', userName)
        .single();
      currentUser = data;
    }

    // Routes
    switch (path) {
      // Auth
      case '/login':
        return handleLogin(request, supabase, corsHeaders);
      
      // Travelers
      case '/travelers':
        return handleTravelers(method, supabase, corsHeaders);
      
      // Dashboard stats
      case '/dashboard':
        return handleDashboard(supabase, corsHeaders);
      
      // Activities
      case '/activities':
        return handleActivities(method, request, currentUser, supabase, corsHeaders);
      
      // Weight entries
      case '/weight':
        return handleWeight(method, request, currentUser, supabase, corsHeaders);
      
      // Gear items
      case '/gear':
        return handleGear(method, request, currentUser, supabase, corsHeaders);
      
      // Pilates videos
      case '/videos':
        return handleVideos(method, request, supabase, corsHeaders);
      
      // Weekly progress
      case '/progress/weekly':
        return handleWeeklyProgress(supabase, corsHeaders);
      
      default:
        return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
    }
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ error: error.message }, 500, corsHeaders);
  }
}

/**
 * Login Handler - Simple name-based authentication
 */
async function handleLogin(request, supabase, corsHeaders) {
  const { name } = await request.json();
  
  const { data, error } = await supabase
    .from('travelers')
    .select('*')
    .eq('name', name)
    .single();
  
  if (error || !data) {
    return jsonResponse({ error: 'Traveler not found' }, 404, corsHeaders);
  }
  
  return jsonResponse({ 
    success: true, 
    user: data,
    token: name // Simple token = name
  }, 200, corsHeaders);
}

/**
 * Travelers Handler
 */
async function handleTravelers(method, supabase, corsHeaders) {
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('travelers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Dashboard Handler - Group overview
 */
async function handleDashboard(supabase, corsHeaders) {
  // Get this week's activities for all users
  const weekStart = getMonday(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  const { data: activities, error } = await supabase
    .from('activities')
    .select('*, travelers(name)')
    .gte('activity_date', weekStart.toISOString().split('T')[0])
    .lte('activity_date', weekEnd.toISOString().split('T')[0]);
  
  if (error) throw error;
  
  // Group by user
  const userStats = {};
  activities.forEach(act => {
    const userName = act.travelers.name;
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
async function handleActivities(method, request, currentUser, supabase, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    let query = supabase
      .from('activities')
      .select('*, travelers(name)')
      .order('activity_date', { ascending: false })
      .limit(50);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const activity = await request.json();
    activity.user_id = currentUser.id;
    
    const { data, error } = await supabase
      .from('activities')
      .insert(activity)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update gear if boots were worn
    if (activity.wore_camino_boots && activity.distance_km) {
      await updateGearKm(currentUser.id, activity.distance_km, supabase);
    }
    
    return jsonResponse(data, 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Weight Handler
 */
async function handleWeight(method, request, currentUser, supabase, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (!userId) {
      return jsonResponse({ error: 'user_id required' }, 400, corsHeaders);
    }
    
    const { data, error } = await supabase
      .from('weight_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false });
    
    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const entry = await request.json();
    entry.user_id = currentUser.id;
    
    const { data, error } = await supabase
      .from('weight_entries')
      .insert(entry)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse(data, 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Gear Handler
 */
async function handleGear(method, request, currentUser, supabase, corsHeaders) {
  if (method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id') || currentUser?.id;
    
    if (!userId) {
      return jsonResponse({ error: 'user_id required' }, 400, corsHeaders);
    }
    
    const { data, error } = await supabase
      .from('gear_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }
    
    const gear = await request.json();
    gear.user_id = currentUser.id;
    
    const { data, error } = await supabase
      .from('gear_items')
      .insert(gear)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse(data, 201, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Videos Handler
 */
async function handleVideos(method, request, supabase, corsHeaders) {
  if (method === 'GET') {
    const { data, error } = await supabase
      .from('pilates_videos')
      .select('*')
      .order('slot_number');
    
    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }
  
  if (method === 'PUT') {
    const video = await request.json();
    
    const { data, error } = await supabase
      .from('pilates_videos')
      .update(video)
      .eq('slot_number', video.slot_number)
      .select()
      .single();
    
    if (error) throw error;
    return jsonResponse(data, 200, corsHeaders);
  }
  
  return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
}

/**
 * Weekly Progress Handler
 */
async function handleWeeklyProgress(supabase, corsHeaders) {
  // Get activities from last 8 weeks for trend analysis
  const today = new Date();
  const eightWeeksAgo = new Date(today);
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  
  const { data, error } = await supabase
    .from('activities')
    .select('*, travelers(name)')
    .gte('activity_date', eightWeeksAgo.toISOString().split('T')[0])
    .order('activity_date', { ascending: false });
  
  if (error) throw error;
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

async function updateGearKm(userId, distanceKm, supabase) {
  // Find user's boots
  const { data: boots } = await supabase
    .from('gear_items')
    .select('*')
    .eq('user_id', userId)
    .eq('item_type', 'boots')
    .single();
  
  if (boots) {
    const newTotalKm = parseFloat(boots.total_km || 0) + parseFloat(distanceKm);
    const isReady = newTotalKm >= 100;
    
    await supabase
      .from('gear_items')
      .update({
        total_km: newTotalKm,
        is_trail_ready: isReady,
        last_used: new Date().toISOString().split('T')[0]
      })
      .eq('id', boots.id);
  }
}
