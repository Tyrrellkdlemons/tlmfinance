@echo off
REM ============================================================
REM   The Last Mile · Finance — first-time setup
REM   Links the local folder to the EXISTING repo + Netlify project.
REM   - GitHub repo:  https://github.com/Tyrrellkdlemons/tlmfinance
REM   - Netlify site: https://tlmfinance.netlify.app
REM   Idempotent — safe to run again. Does NOT create new projects.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
title The Last Mile - Finance setup

set "REPO_OWNER=Tyrrellkdlemons"
set "REPO_NAME=tlmfinance"
set "SITE_NAME=tlmfinance"
set "DEFAULT_BRANCH=main"
set "REPO_URL=https://github.com/%REPO_OWNER%/%REPO_NAME%.git"

echo.
echo ============================================
echo   The Last Mile - Finance setup
echo ============================================
echo.
echo   GitHub repo : %REPO_URL%
echo   Netlify site: https://%SITE_NAME%.netlify.app
echo.

REM ---- 1. Check tools ----
where git >nul 2>nul
if errorlevel 1 (
  echo [X] git is not installed. Install Git for Windows: https://git-scm.com/downloads
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js not found. Install Node 20 LTS: https://nodejs.org/
  echo     Skipping Netlify CLI step.
  set "NO_NODE=1"
)

REM ---- 2. Run validator (skips if no node) ----
if not defined NO_NODE (
  if exist ".\scripts\validate.mjs" (
    echo --- Validating files ---
    call node .\scripts\validate.mjs
    if errorlevel 1 (
      echo [X] Validator failed. Fix the issues above and re-run setup.bat
      goto :fail
    )
  )
)

REM ---- 3. Initialize git if missing, then point origin to the existing repo ----
echo.
echo --- Git: ensure local repo and remote ---
if not exist ".git" (
  git init -b %DEFAULT_BRANCH%
  echo [i] git initialized.
)
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git remote -v

REM ---- 4. Stage and commit any local changes ----
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "setup: sync project files" >nul
  echo [i] Local changes committed.
) else (
  echo [i] No new local changes.
)

REM ---- 5. Pull GitHub history and merge (handles existing README commit) ----
echo.
echo --- Merging with remote main ---
git fetch origin %DEFAULT_BRANCH% 2>nul
git merge origin/%DEFAULT_BRANCH% --allow-unrelated-histories --no-edit 2>nul
if errorlevel 1 (
  echo [!] Merge had a conflict. Aborting and falling back to a force push.
  git merge --abort 2>nul
  set "DO_FORCE=1"
)

REM ---- 6. Push (Git Credential Manager handles auth in the browser) ----
echo.
echo --- Pushing to %REPO_URL% (branch %DEFAULT_BRANCH%) ---
echo If a sign-in window opens, complete it once and this push will succeed.
if defined DO_FORCE (
  git push -u --force origin %DEFAULT_BRANCH%
) else (
  git push -u origin %DEFAULT_BRANCH%
)
if errorlevel 1 (
  echo [X] git push failed. Sign in via the credential dialog, then re-run setup.bat
  goto :fail
)

REM ---- 7. Netlify CLI: link to EXISTING site (does NOT create a new one) ----
if not defined NO_NODE (
  echo.
  echo --- Netlify: link to existing site '%SITE_NAME%' ---
  REM Clear any stale link first so we always bind to the right site
  if exist ".netlify\state.json" (
    echo {} > .netlify\state.json
  )
  call npx -y netlify-cli@latest login
  call npx -y netlify-cli@latest link --name %SITE_NAME%
  if errorlevel 1 (
    echo [X] Could not link to '%SITE_NAME%'. Make sure you signed into the right Netlify team.
    goto :fail
  )

  echo.
  echo --- Optional: deploy directly via CLI now ---
  echo   (Press Ctrl+C to skip and rely only on GitHub-driven auto-deploys.)
  call npx -y netlify-cli@latest deploy --prod --dir=. --message "setup deploy %DATE% %TIME%"
)

echo.
echo ============================================
echo   Setup complete.
echo   - Repo : https://github.com/%REPO_OWNER%/%REPO_NAME%
echo   - Site : https://%SITE_NAME%.netlify.app
echo   For everyday updates: deploy.bat "your message"
echo ============================================
echo.
goto :end

:fail
echo.
echo Setup did not finish.
endlocal
exit /b 1

:end
endlocal
pause
