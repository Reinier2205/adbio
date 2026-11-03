# DelNorte Status Checker
# Quick script to verify your setup

Write-Host ""
Write-Host "🥾 DelNorte Setup Status Check" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host ""

$allGood = $true

# Check 1: .dev.vars file
Write-Host "1. Checking .dev.vars file..." -ForegroundColor Cyan
if (Test-Path ".dev.vars") {
    $content = Get-Content ".dev.vars" -Raw
    
    if ($content -match "supabase\.co") {
        Write-Host "   ✅ .dev.vars exists with Supabase URL" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .dev.vars exists but needs Supabase URL" -ForegroundColor Yellow
        $allGood = $false
    }
    
    if ($content -match "eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*") {
        Write-Host "   ✅ .dev.vars has anon key configured" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .dev.vars needs Supabase anon key" -ForegroundColor Yellow
        $allGood = $false
    }
} else {
    Write-Host "   ❌ .dev.vars file missing" -ForegroundColor Red
    Write-Host "      Create it from .dev.vars.example" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Check 2: Node modules
Write-Host "2. Checking dependencies..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules installed" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Dependencies not installed" -ForegroundColor Yellow
    Write-Host "      Run: npm install" -ForegroundColor Yellow
    $allGood = $false
}

Write-Host ""

# Check 3: Page scripts
Write-Host "3. Checking page scripts..." -ForegroundColor Cyan
$pages = @("overview", "log-progress", "training-plan", "strength-stretch", "gear-audit", "trail-fuel")
$missingPages = @()

foreach ($page in $pages) {
    if (Test-Path "public\scripts\pages\$page.js") {
        Write-Host "   ✅ $page.js exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $page.js missing" -ForegroundColor Red
        $missingPages += $page
        $allGood = $false
    }
}

Write-Host ""

# Check 4: Core scripts
Write-Host "4. Checking core scripts..." -ForegroundColor Cyan
$coreScripts = @("config.js", "api.js", "auth.js", "router.js", "app.js")
foreach ($script in $coreScripts) {
    if (Test-Path "public\scripts\$script") {
        Write-Host "   ✅ $script exists" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $script missing" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

# Check 5: Migration file
Write-Host "5. Checking database migration..." -ForegroundColor Cyan
if (Test-Path "migrations\001_initial_schema.sql") {
    Write-Host "   ✅ Migration file exists" -ForegroundColor Green
    Write-Host "      Remember to run this in Supabase SQL Editor!" -ForegroundColor Yellow
} else {
    Write-Host "   ❌ Migration file missing" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Green

if ($allGood) {
    Write-Host ""
    Write-Host "✅ Everything looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Make sure you've run the migration in Supabase" -ForegroundColor White
    Write-Host "2. Start the dev server: npx wrangler dev" -ForegroundColor White
    Write-Host "3. Open: http://localhost:8787" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "⚠️  Some issues found - see above" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For help, check:" -ForegroundColor Cyan
    Write-Host "- NEXT-STEPS.md (what to do)" -ForegroundColor White
    Write-Host "- QUICKSTART.md (fast setup)" -ForegroundColor White
    Write-Host "- SETUP.md (detailed guide)" -ForegroundColor White
    Write-Host ""
}

# Offer to open NEXT-STEPS.md
$openDocs = Read-Host "Open NEXT-STEPS.md for guidance? (y/n)"
if ($openDocs -eq "y" -or $openDocs -eq "Y") {
    notepad "NEXT-STEPS.md"
}
