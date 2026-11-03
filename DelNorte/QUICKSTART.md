# DelNorte Quick Start Guide

## ⚡ Fast Setup (5 minutes)

### 1. Get Supabase Credentials

1. Go to: **https://supabase.com/dashboard**
2. Open your **delnorte-camino** project (or create one if you haven't)
3. Click: **Project Settings** (gear icon) → **API**
4. Copy these two values:

```
Project URL:     https://xxxxx.supabase.co
anon public key: eyJhbGci... (very long token)
```

### 2. Create `.dev.vars` File

Create a file named `.dev.vars` in the DelNorte folder with this content:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...your-actual-key...
```

**Replace** the values with what you copied from Supabase!

### 3. Run Database Migration

Go to Supabase Dashboard → **SQL Editor** → **New Query**

Copy the ENTIRE contents of `migrations/001_initial_schema.sql` and paste it, then click **Run**.

You should see: ✅ "Success. No rows returned"

### 4. Start Development Server

```powershell
npx wrangler dev
```

Visit: **http://localhost:8787**

You should see the login screen with 4 travelers:
- Reinier
- Annelié  
- Drikkie
- Lettie

---

## 🎯 That's it! You're ready to go!

### Testing the App

1. Select a traveler name from the dropdown
2. Click "Start training"
3. You should see the Overview page

### Common Issues

**Issue**: "Failed to load travelers"
- Check that `.dev.vars` has correct credentials
- Verify database migration ran successfully
- Restart wrangler dev

**Issue**: Empty database
- Run the migration again in Supabase SQL Editor
- Check Tables to confirm `travelers` table exists

---

## 📚 Need More Details?

See `SETUP.md` for the complete step-by-step guide.

---

## 🚀 Deploy to Production

When ready to deploy:

```powershell
# Set production secrets
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY

# Deploy
npx wrangler deploy
```

Your app will be live at: `https://delnorte.your-subdomain.workers.dev`

---

## 🛠️ Automated Setup Helper

Run the setup helper script:

```powershell
.\setup-helper.ps1
```

This will guide you through the entire setup process!
