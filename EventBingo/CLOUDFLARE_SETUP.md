# Cloudflare EventBingo Worker Setup Guide

## Overview
This worker uses **two storage bindings**:
- **R2** (`EventBingoPhotos`) - For storing photo files (binary data)
- **KV** (`EventBingoProgress`) - For storing event metadata and photo URL references

## Step-by-Step Setup

### 1. Add R2 Bucket to Cloudflare

1. Go to Cloudflare Dashboard: https://dash.cloudflare.com
2. Click on **"R2 object storage"** in the left sidebar
3. If bucket doesn't exist, click **"Create bucket"**
4. Name it: `eventbingophotos`
5. Click **"Create bucket"**

### 2. Link R2 to Your Worker

1. Go to **Workers & Pages**
2. Click on your worker: `shy-recipe-5fb1`
3. Click **"Settings"** tab
4. Scroll down to **"Triggers"** section
5. Find **"R2 bucket bindings"** section
6. Click **"Add binding"**
7. Fill in:
   - **Variable name**: `EventBingoPhotos`
   - **R2 bucket**: Select `eventbingophotos`
8. Click **"Save"**

### 3. Update Worker Code

You have two options:

#### Option A: Upload via Cloudflare Dashboard (Easiest)
1. Go to **Workers & Pages** → `shy-recipe-5fb1`
2. Click **"</> Edit code"** button (top right)
3. Delete all existing code
4. Copy entire content from `worker.js` file (the updated one in your repo)
5. Paste into the Cloudflare editor
6. Click **"Save and deploy"**

#### Option B: Deploy via CLI
```bash
cd EventBingo
npx wrangler deploy
```

## What Changed

### Storage Architecture:
- **Photos** → Stored in R2 as binary files
- **Metadata** → Stored in KV (event data, URL references)

### Key Changes in worker.js:
- `env.EventBingoPhotos` → For photo file operations (R2)
- `env.EventBingoProgress` → For metadata operations (KV)

### File Naming:
Photos are saved as: `{eventCode}_{player}_{square}_{timestamp}_{filename}`
Example: `ddddffff_Reinier_'n_Foto_van_1234567890_photo.jpg`

## Testing

After deployment, test by:
1. Upload a photo to event `ddddffff`
2. Check it shows correctly
3. Verify it's stored in R2 bucket (not KV)

## Troubleshooting

### Photos not displaying
- Verify R2 bucket exists: `eventbingophotos`
- Check binding name matches: `EventBingoPhotos`
- Check worker has permissions to read R2

### "Missing binding" error
- Make sure R2 binding is added in Worker settings
- Variable name must be exactly: `EventBingoPhotos`

### Old photos not showing
- Old photos were stored in KV (doesn't work well for binaries)
- New uploads will work correctly in R2
- You may need to re-upload photos for the new system

