# Portfolio Pulse — Cloudflare D1 Setup Guide

This guide walks you through deploying Portfolio Pulse with Cloudflare D1 (SQLite) as the backend database, using Cloudflare Pages Functions as the API layer.

## Prerequisites

- A Cloudflare account
- Node.js 18+
- Wrangler CLI

## Step 1 — Install Wrangler

```bash
npm install -g wrangler
```

## Step 2 — Authenticate with Cloudflare

```bash
wrangler login
```

This opens a browser window to authorise Wrangler with your Cloudflare account.

## Step 3 — Create the D1 database

```bash
wrangler d1 create portfolio-pulse-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

## Step 4 — Run migrations

Create the schema:
```bash
wrangler d1 execute portfolio-pulse-db --file=migrations/0001_initial.sql
```

Seed the historical data:
```bash
wrangler d1 execute portfolio-pulse-db --file=migrations/0002_seed.sql
```

## Step 5 — Build the app

```bash
npm run build
```

This produces the static assets in `../portfolio-pulse-cloudflare`.

## Step 6 — Deploy to Cloudflare Pages

```bash
wrangler pages deploy ../portfolio-pulse-cloudflare
```

On first deploy, Wrangler will ask you to create a new Pages project. Name it `portfolio-pulse`.

## Step 7 — Bind the D1 database to the Pages project

In the Cloudflare dashboard:
1. Go to **Workers & Pages** → your `portfolio-pulse` project
2. Click **Settings** → **Functions**
3. Under **D1 database bindings**, click **Add binding**
4. Variable name: `DB`
5. D1 database: `portfolio-pulse-db`
6. Click **Save**

Redeploy after adding the binding:
```bash
wrangler pages deploy ../portfolio-pulse-cloudflare
```

## Step 8 — Protect the API with Cloudflare Access

The API endpoints (`/api/*`) should be protected so only you can write data.

1. In the Cloudflare dashboard, go to **Zero Trust** → **Access** → **Applications**
2. Click **Add an application** → **Self-hosted**
3. Application name: `Portfolio Pulse API`
4. Application domain: your Pages URL, e.g. `portfolio-pulse.pages.dev`
5. Path: `/api/*`
6. Under **Policies**, add an Allow policy with your email address as the condition
7. Save

After this, any request to `/api/*` will require authentication via Cloudflare Access SSO. The Workers API trusts the `CF-Access-Authenticated-User-Email` header injected by Access.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/records` | Fetch all portfolio records |
| POST | `/api/records` | Create or update a record |
| DELETE | `/api/records/:date` | Delete a record by date |

## Local development

To run locally with a local D1 database:
```bash
wrangler pages dev ../portfolio-pulse-cloudflare --d1 DB=portfolio-pulse-db
```

This starts a local dev server at `http://localhost:8788` with the Pages Functions and D1 wired up.
