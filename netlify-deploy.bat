@echo off
REM One-shot Netlify deploy — login → link → deploy. Browser opens for auth.
cd /d "%~dp0"
title Netlify deploy - tlmfinance
echo.
echo ========================================
echo   Deploying to Netlify (project: tlmfinance)
echo ========================================
echo.
echo Step 1: install netlify-cli (first run only, ~30s).
echo Step 2: open browser for Netlify login if you aren't signed in.
echo Step 3: link this folder to the tlmfinance site.
echo Step 4: deploy to production.
echo.
where node >nul 2>nul || (
  echo [X] Node.js is required. Install Node 20 LTS: https://nodejs.org/
  pause
  exit /b 1
)

echo --- Login ---
call npx -y netlify-cli@latest login
if errorlevel 1 (
  echo [!] Login command exited non-zero. If you were already logged in, this is fine.
)

echo.
echo --- Link to existing site 'tlmfinance' ---
call npx -y netlify-cli@latest link --name tlmfinance
if errorlevel 1 (
  echo [X] Could not link to site 'tlmfinance'. Make sure you signed into the right Netlify team.
  pause
  exit /b 1
)

echo.
echo --- Deploy to production ---
call npx -y netlify-cli@latest deploy --prod --dir=. --message="auto-deploy %DATE% %TIME%"

echo.
echo Done. Live site: https://tlmfinance.netlify.app
pause
