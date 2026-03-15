# Push GearGuard to GitHub (run in PowerShell)
$ErrorActionPreference = "Stop"
$repo = "https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--.git"
Set-Location $PSScriptRoot

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git not found. Install from https://git-scm.com/download/win then run this again."
    exit 1
}

if (-not (Test-Path .git)) {
    git init
    git remote add origin $repo
} else {
    git remote remove origin 2>$null
    git remote add origin $repo
}

git add .
git status
git commit -m "Vercel-ready: serverless backend, DATABASE_URL, CORS, production base URL"
if ($LASTEXITCODE -ne 0) { git commit -m "Update: Vercel deploy config and scripts" }
git branch -M main 2>$null
git push -u origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nIf push failed: try 'git pull origin main --rebase' then run again, or 'git push -u origin main --force' if you own the repo."
}
