@echo off
REM ============================================================
REM   Paving the Road - everyday deploy
REM   Validates, commits, pushes to GitHub (which triggers
REM   Netlify via Actions) and also deploys directly to Netlify
REM   so prod updates the moment this finishes.
REM
REM   Usage: deploy.bat "your commit message"
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Paving the Road - Deploy

set "MSG=%~1"
if "%MSG%"=="" set "MSG=update %DATE% %TIME%"

echo.
echo ============================================
echo   Paving the Road - deploy
echo   Message: %MSG%
echo ============================================
echo.

where git >nul 2>nul || ( echo [X] git missing & exit /b 1 )

REM ---- 1. Validate ----
where node >nul 2>nul
if not errorlevel 1 (
  echo --- Running validator ---
  call node .\scripts\validate.mjs
  if errorlevel 1 (
    echo [X] Validator failed - aborting deploy.
    exit /b 1
  )
)

REM ---- 2. Commit + push ----
echo.
echo --- Committing changes ---
git add .
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "%MSG%"
  git push origin HEAD
) else (
  echo [i] Nothing to commit. Will still trigger a Netlify deploy.
)

REM ---- 3. Direct Netlify deploy (fast path) ----
where node >nul 2>nul
if not errorlevel 1 (
  echo.
  echo --- Deploying to Netlify (production) ---
  call npx -y netlify-cli@latest deploy --prod --dir=. --message "%MSG%"
)

echo.
echo ============================================
echo   Deploy complete.
echo ============================================
echo.
endlocal
pause
