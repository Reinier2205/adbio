# DelNorte - Camino Training Tracker

A Cloudflare Workers + Supabase application for tracking Camino del Norte training progress for a group of 4 friends.

## Overview

**Training Period**: November 1, 2026 → June 1, 2027 (7 months)
**Departure Date**: June 1, 2027
**Route**: Camino del Norte

## Features

### Core Tracking
- **Activity Logging**: Walk, Pilates, Cycle, Swim sessions
- **Weight Goals**: Optional weight loss tracking per person
- **Group Dashboard**: View all participants' progress
- **Endurance Indicator**: 2-hour conversation benchmark
- **Gear Audit**: Boot break-in tracker (100km target)
- **Nutrition Guide**: "Camino Superfoods" reference

### Training Plan Phases
1. **Foundation** (Nov-Dec 2026): Build walking habit, 5-7.5km walks
2. **Expansion** (Jan-Mar 2027): Increase time on feet, add hills
3. **Trek Readiness** (Apr-May 2027): Practice consecutive days with trail pack

## Tech Stack

- **Backend**: Cloudflare Workers
- **Database**: Supabase (PostgreSQL)
- **Frontend**: Vanilla JS (mobile-first)
- **Auth**: Simple name-based login
- **Deployment**: Cloudflare Pages

## Database Schema

### Users Table
- id, name, email (optional), weight_goal_kg, created_at

### Activities Table
- id, user_id, activity_type, distance_km, duration_min, elevation_gain_m, date, stretched, conversation_test, wore_boots, notes

### Weight Entries Table
- id, user_id, weight_kg, date

### Gear Table
- id, user_id, item_name, total_km, comfort_rating, last_used

### Video Links Table (Pilates)
- id, slot_number, title, url, category

## Design Theme

**Colors**:
- Primary: Forest Green (#2C5F4F)
- Secondary: Slate Gray (#475569)
- Accent: Camino Yellow (#F4C753)
- Background: Warm Cream (#FAF9F6)

**Typography**: Clean, legible sans-serif for mobile-first

## Setup Instructions

1. Set up Supabase project
2. Configure Wrangler for Cloudflare Workers
3. Deploy database schema
4. Set environment variables
5. Deploy worker and frontend

## Project Structure

```
DelNorte/
├── worker/          # Cloudflare Worker backend
├── frontend/        # Static HTML/CSS/JS
├── migrations/      # Supabase database migrations
├── docs/           # Additional documentation
└── README.md
```
