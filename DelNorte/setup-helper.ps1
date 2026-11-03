# DelNorte Setup Helper Script
# This script helps you set up the DelNorte Camino Training Tracker

Write-Host "🥾 DelNorte Camino Training Tracker - Setup Helper" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# Function to check if a command exists
function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Step 1: Check prerequisites
Write-Host "📋 Step 1: Checking prerequisites..." -ForegroundColor Cyan
Write-Host ""

$allGood = $true

if (Test-Command "node") {
    $nodeVersion = node --version
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org" -ForegroundColor Red
    $allGood = $false
}

if (Test-Command "npm") {
    $npmVersion = npm --version
    Write-Host "✅ npm installed: v$npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

if (-not $allGood) {
    Write-Host "❌ Please install missing prerequisites and run this script again." -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host "📦 Step 2: Installing dependencies..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "node_modules") {
    Write-Host "Dependencies already installed." -ForegroundColor Yellow
} else {
    npm install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Step 3: Check for .dev.vars
Write-Host "🔑 Step 3: Checking local environment configuration..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path ".dev.vars") {
    Write-Host "✅ .dev.vars file exists" -ForegroundColor Green
    Write-Host ""
    Write-Host "Current configuration:" -ForegroundColor Yellow
    Get-Content ".dev.vars" | ForEach-Object {
        if ($_ -match "^SUPABASE_URL=(.+)$") {
            $url = $matches[1]
            if ($url -like "https://*supabase.co") {
                Write-Host "  SUPABASE_URL: ✅ Configured" -ForegroundColor Green
            } else {
                Write-Host "  SUPABASE_URL: ⚠️  Needs updating (currently: $url)" -ForegroundColor Yellow
            }
        }
        if ($_ -match "^SUPABASE_ANON_KEY=(.+)$") {
            $key = $matches[1]
            if ($key.Length -gt 100) {
                Write-Host "  SUPABASE_ANON_KEY: ✅ Configured" -ForegroundColor Green
            } else {
                Write-Host "  SUPABASE_ANON_KEY: ⚠️  Needs updating" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "⚠️  .dev.vars file not found" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Creating .dev.vars from example..." -ForegroundColor Cyan
    
    if (Test-Path ".dev.vars.example") {
        Copy-Item ".dev.vars.example" ".dev.vars"
        Write-Host "✅ .dev.vars created" -ForegroundColor Green
    } else {
        @"
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
"@ | Out-File -FilePath ".dev.vars" -Encoding UTF8
        Write-Host "✅ .dev.vars created" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "⚠️  You need to update .dev.vars with your actual Supabase credentials!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get your credentials:" -ForegroundColor Cyan
    Write-Host "1. Go to https://supabase.com/dashboard" -ForegroundColor White
    Write-Host "2. Open your 'delnorte-camino' project" -ForegroundColor White
    Write-Host "3. Go to Project Settings → API" -ForegroundColor White
    Write-Host "4. Copy the 'Project URL' and 'anon public' key" -ForegroundColor White
    Write-Host "5. Update .dev.vars with these values" -ForegroundColor White
    Write-Host ""
    
    $openFile = Read-Host "Open .dev.vars now? (y/n)"
    if ($openFile -eq "y" -or $openFile -eq "Y") {
        notepad ".dev.vars"
    }
}

Write-Host ""

# Step 4: Database setup
Write-Host "🗄️  Step 4: Database setup instructions" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need to run the database migration in Supabase." -ForegroundColor Yellow
Write-Host ""
Write-Host "Option A - Via Supabase Dashboard (Recommended):" -ForegroundColor Cyan
Write-Host "1. Go to https://supabase.com/dashboard" -ForegroundColor White
Write-Host "2. Open your project → SQL Editor" -ForegroundColor White
Write-Host "3. Click 'New Query'" -ForegroundColor White
Write-Host "4. Copy contents of: migrations/001_initial_schema.sql" -ForegroundColor White
Write-Host "5. Paste and click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "Option B - Via Supabase CLI:" -ForegroundColor Cyan
Write-Host "1. Link project: npx supabase link --project-ref <your-project-ref>" -ForegroundColor White
Write-Host "2. Push migration: npx supabase db push" -ForegroundColor White
Write-Host ""

$migrationPath = "migrations\001_initial_schema.sql"
if (Test-Path $migrationPath) {
    $openMigration = Read-Host "Open migration file to copy? (y/n)"
    if ($openMigration -eq "y" -or $openMigration -eq "Y") {
        notepad $migrationPath
    }
}

Write-Host ""

# Step 5: Wrangler setup
Write-Host "☁️  Step 5: Cloudflare Wrangler setup" -ForegroundColor Cyan
Write-Host ""

$wranglerSetup = Read-Host "Have you logged into Wrangler? (y/n)"
if ($wranglerSetup -ne "y" -and $wranglerSetup -ne "Y") {
    Write-Host ""
    Write-Host "Running: npx wrangler login" -ForegroundColor Cyan
    npx wrangler login
    Write-Host ""
}

Write-Host ""

# Step 6: Test local development
Write-Host "🚀 Step 6: Ready to test!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start local development server:" -ForegroundColor Yellow
Write-Host "  npx wrangler dev" -ForegroundColor White
Write-Host ""
Write-Host "Then visit: http://localhost:8787" -ForegroundColor Yellow
Write-Host ""

$startNow = Read-Host "Start development server now? (y/n)"
if ($startNow -eq "y" -or $startNow -eq "Y") {
    Write-Host ""
    Write-Host "Starting Wrangler dev server..." -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    npx wrangler dev
} else {
    Write-Host ""
    Write-Host "✅ Setup helper complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Update .dev.vars with your Supabase credentials" -ForegroundColor White
    Write-Host "2. Run database migration in Supabase" -ForegroundColor White
    Write-Host "3. Run: npx wrangler dev" -ForegroundColor White
    Write-Host "4. Visit: http://localhost:8787" -ForegroundColor White
    Write-Host ""
}
