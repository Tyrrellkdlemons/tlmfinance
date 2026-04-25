@echo off
REM Push the local project to github.com/Tyrrellkdlemons/tlmfinance.
REM Uses Git Credential Manager — a browser dialog opens for first-time auth.
cd /d "%~dp0"
title Push to GitHub - tlmfinance
echo.
echo ============================================
echo   Pushing to github.com/Tyrrellkdlemons/tlmfinance
echo ============================================
echo.

where git >nul 2>nul || (
  echo [X] git is not installed. Install Git for Windows: https://git-scm.com/downloads
  pause
  exit /b 1
)

REM 0. Clear any stale git lock files that block staging
if exist ".git\index.lock" (
  echo [i] Removing stale .git\index.lock
  del /q /f ".git\index.lock" 2>nul
)
if exist ".git\HEAD.lock" del /q /f ".git\HEAD.lock" 2>nul
if exist ".git\refs\heads\main.lock" del /q /f ".git\refs\heads\main.lock" 2>nul

REM 1. Make sure all current files are committed locally
echo --- Staging local files ---
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "Sync project files to GitHub" >nul
  echo [i] Local commit created.
) else (
  echo [i] No local changes to commit.
)

REM 2. Set the remote
echo.
echo --- Setting remote 'origin' ---
git remote remove origin 2>nul
git remote add origin https://github.com/Tyrrellkdlemons/tlmfinance.git
git remote -v

REM 3. Pull GitHub's README commit and merge with our history
echo.
echo --- Merging GitHub's README commit ---
git fetch origin main
git merge origin/main --allow-unrelated-histories --no-edit
if errorlevel 1 (
  echo [!] Merge had conflicts. Aborting and forcing push instead.
  git merge --abort 2>nul
  set FORCE=1
)

REM 4. Push
echo.
echo --- Pushing to origin/main ---
if defined FORCE (
  git push -u --force origin main
) else (
  git push -u origin main
)

if errorlevel 1 (
  echo.
  echo [X] Push failed. If a credential dialog opened, complete the sign-in and run this script again.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Push complete.
echo   Repo: https://github.com/Tyrrellkdlemons/tlmfinance
echo   Netlify will auto-deploy from this push if continuous deploys are enabled.
echo ============================================
pause
