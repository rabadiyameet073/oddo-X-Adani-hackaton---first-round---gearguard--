@echo off
setlocal
set REPO=https://github.com/rabadiyameet073/oddo-X-Adani-hackaton---first-round---gearguard--.git
cd /d "%~dp0"

where git >nul 2>nul || (
    echo Git not found. Install from https://git-scm.com/download/win then run this again.
    pause
    exit /b 1
)

if not exist .git (
    git init
    git remote add origin %REPO%
) else (
    git remote remove origin 2>nul
    git remote add origin %REPO%
)

git add .
git status
git commit -m "Vercel-ready: serverless backend, DATABASE_URL, CORS, production base URL" || git commit -m "Update: Vercel deploy config and scripts" || echo No changes to commit.
git branch -M main 2>nul
git push -u origin main
if errorlevel 1 (
    echo.
    echo If push failed: try "git pull origin main --rebase" then run this again, or use "git push -u origin main --force" if you own the repo.
)
pause
