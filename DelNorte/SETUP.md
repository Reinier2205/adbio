# DelNorte Setup Guide

## Prerequisites

- Node.js 18+ installed
- Cloudflare account
- Supabase account
- Git (for version control)

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Project Name**: delnorte-camino
   - **Database Password**: (generate a strong password and save it)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Migration

1. In your Supabase project dashboard, click "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `migrations/001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click "Run"
6. Verify success (should see "Success. No rows returned")

### 1.3 Get Supabase Credentials

1. Go to Project Settings → API
2. Copy these values (you'll need them later):
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 2: Cloudflare Setup

### 2.1 Install Wrangler CLI

```bash
cd DelNorte
npm install
```

### 2.2 Login to Cloudflare

```bash
npx wrangler login
```

This will open a browser window to authenticate.

### 2.3 Set Environment Secrets

```bash
# Set Supabase URL
npx wrangler secret put SUPABASE_URL
# When prompted, paste your Supabase Project URL

# Set Supabase Anon Key
npx wrangler secret put SUPABASE_ANON_KEY
# When prompted, paste your Supabase anon/public key
```

## Step 3: Deploy Worker

```bash
npx wrangler deploy
```

You should see output like:
```
✨ Deployment complete
🌎 https://delnorte.<your-subdomain>.workers.dev
```

Save this URL - this is your API endpoint!

## Step 4: Update Frontend Configuration

1. Open `public/scripts/config.js`
2. If you deployed to a custom domain or want to use relative URLs, update `API_BASE_URL`:
   ```javascript
   const CONFIG = {
       API_BASE_URL: '/api', // For same-origin deployment
       // OR
       API_BASE_URL: 'https://delnorte.your-subdomain.workers.dev/api', // For CORS
       // ...
   };
   ```

## Step 5: Deploy Static Assets

The static files (HTML, CSS, JS) are automatically deployed with your Worker thanks to the `[site]` configuration in `wrangler.toml`.

After running `npx wrangler deploy`, your app is live!

## Step 6: Verify Setup

1. Visit your Worker URL: `https://delnorte.<your-subdomain>.workers.dev`
2. You should see the login screen
3. Try logging in as:
   - Reinier
   - Annelié
   - Drikkie
   - Lettie

## Step 7: Customize Travelers (Optional)

If you need to change traveler names:

1. Go to Supabase Dashboard → Table Editor → `travelers`
2. Click on a row to edit
3. Update the `name` field
4. Save changes

## Development Mode

To run locally for development:

```bash
# Terminal 1: Run the worker locally
npx wrangler dev

# The app will be available at http://localhost:8787
```

### Local Development Notes:

- Wrangler dev creates a local environment
- Still connects to your production Supabase database
- Changes to code auto-reload
- Perfect for testing before deploying

## Monitoring & Debugging

### View Live Logs

```bash
npx wrangler tail
```

This streams real-time logs from your deployed Worker.

### Check Deployment Status

```bash
npx wrangler deployments list
```

### Analytics

Visit your Cloudflare Dashboard → Workers & Pages → delnorte to see:
- Request counts
- Error rates
- Response times

## Common Issues

### Issue: "Unable to find Supabase credentials"

**Solution**: Make sure you ran the `wrangler secret put` commands in Step 2.3

### Issue: Login not working

**Solutions**:
1. Check browser console for errors
2. Verify Supabase is running: visit your Supabase Project URL
3. Check that traveler names match exactly (case-sensitive)

### Issue: CORS errors in browser

**Solution**: If frontend is on different domain than API:
1. Update `corsHeaders` in `src/index.js` to allow your frontend domain
2. Redeploy: `npx wrangler deploy`

### Issue: Changes not appearing

**Solutions**:
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Clear browser cache
3. Verify deployment: `npx wrangler deployments list`

## Database Backup

### Export Data

1. Go to Supabase Dashboard
2. Click "Database" → "Backups"
3. Enable daily backups (recommended)
4. Can also export manually via SQL:

```sql
-- Export all activities
COPY (SELECT * FROM activities) TO STDOUT WITH CSV HEADER;
```

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Cloudflare Dashboard
2. Workers & Pages → delnorte → Settings → Domains & Routes
3. Click "Add Custom Domain"
4. Enter: `camino.yourdomain.com`
5. Follow DNS setup instructions

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |

## Next Steps

1. **Add Custom Travelers**: Update the `travelers` table in Supabase
2. **Customize Training Phases**: Edit dates in `public/scripts/config.js`
3. **Add Pilates Videos**: Update via the Strength & Stretch page
4. **Start Logging Activities**: Begin tracking walks, Pilates, etc!

## Support

- Supabase Docs: https://supabase.com/docs
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- Cloudflare Workers: https://developers.cloudflare.com/workers/

## Deployment Checklist

- [ ] Supabase project created
- [ ] Database migration run successfully
- [ ] Supabase credentials copied
- [ ] Wrangler logged in
- [ ] Secrets set (SUPABASE_URL, SUPABASE_ANON_KEY)
- [ ] Worker deployed
- [ ] App accessible at Worker URL
- [ ] Login working with all 4 travelers
- [ ] Can create activities
- [ ] Dashboard showing data

---

**Ready to train for Camino del Norte! 🥾⛰️**
