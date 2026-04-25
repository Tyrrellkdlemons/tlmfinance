@echo off
REM ============================================================
REM   Paving the Road - first-time setup
REM   Initializes git, creates the GitHub repo via gh CLI, links
REM   Netlify, and pushes the first commit.
REM ============================================================
setlocal enabledelayedexpansion
cd /d "%~dp0"
title Paving the Road - First-time setup

set "REPO_NAME=paving-the-road"
set "SITE_NAME=paving-the-road"
set "DEFAULT_BRANCH=main"

echo.
echo ============================================
echo   Paving the Road - first-time setup
echo ============================================
echo.

REM ---- 1. Check tools ----
where git >nul 2>nul
if errorlevel 1 (
  echo [X] git is not installed. Install Git for Windows: https://git-scm.com/downloads
  goto :fail
)

where gh >nul 2>nul
if errorlevel 1 (
  echo [!] GitHub CLI not found. Install it from: https://cli.github.com/  (winget install --id GitHub.cli)
  set "NO_GH=1"
)

where node >nul 2>nul
if errorlevel 1 (
  echo [!] Node.js not found. Install Node 20 LTS: https://nodejs.org/
  echo     Skipping Netlify CLI setup.
  set "NO_NODE=1"
)

REM ---- 2. Validate ----
if not defined NO_NODE (
  echo.
  echo --- Running validator ---
  call node .\scripts\validate.mjs
  if errorlevel 1 (
    echo [X] Validator failed. Fix the issues above and re-run setup.bat
    goto :fail
  )
)

REM ---- 3. Git init ----
echo.
echo --- Initializing git ---
if not exist ".git" (
  git init -b %DEFAULT_BRANCH%
  git add .
  git commit -m "Initial commit - Paving the Road"
) else (
  echo [i] git already initialized.
)

REM ---- 4. GitHub repo ----
if not defined NO_GH (
  echo.
  echo --- Creating GitHub repo ---
  echo You may be prompted to authenticate with: gh auth login
  gh auth status >nul 2>nul
  if errorlevel 1 (
    gh auth login
  )
  gh repo view %REPO_NAME% >nul 2>nul
  if errorlevel 1 (
    gh repo create %REPO_NAME% --public --source=. --remote=origin --push --description "A reentry planning companion inspired by The Last Mile"
  ) else (
    echo [i] Repo %REPO_NAME% already exists - skipping create.
    git remote -v | findstr origin >nul || git remote add origin https://github.com/%USERNAME%/%REPO_NAME%.git
    git push -u origin %DEFAULT_BRANCH%
  )
) else (
  echo.
  echo [!] Skipping GitHub repo creation - install GitHub CLI ^(winget install --id GitHub.cli^) then re-run.
)

REM ---- 5. Netlify CLI ----
if not defined NO_NODE (
  echo.
  echo --- Linking Netlify ---
  call npx -y netlify-cli@latest --version >nul 2>nul
  echo You may be prompted to log in to Netlify in your browser.
  call npx -y netlify-cli@latest login
  call npx -y netlify-cli@latest sites:create --name %SITE_NAME% --with-ci
  call npx -y netlify-cli@latest link --name %SITE_NAME%
  echo.
  echo --- First production deploy ---
  call npx -y netlify-cli@latest deploy --prod --dir=. --message "Initial deploy - %DATE% %TIME%"
)

echo.
echo ============================================
echo   Setup complete.
echo   - Repo: https://github.com/^<your-username^>/%REPO_NAME%
echo   - Site: https://%SITE_NAME%.netlify.app
echo   For everyday deploys, run: deploy.bat "your message"
echo ============================================
echo.
goto :end

:fail
echo.
echo Setup did not finish.
exit /b 1

:end
endlocal
pause
