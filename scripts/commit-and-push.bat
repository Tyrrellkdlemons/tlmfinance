@echo off
REM Safe commit and push script for TLM Finance
REM Prompts for commit message and shows changes before committing
REM Never force pushes - follows Git best practices

setlocal enabledelayedexpansion
cd /d "%~dp0\.."
title Git Commit & Push - tlmfinance

echo.
echo ============================================
echo   TLM Finance - Git Commit and Push
echo ============================================
echo.

REM Check if git is installed
where git >nul 2>nul || (
  echo [X] Git is not installed.
  echo     Install from: https://git-scm.com/downloads
  pause
  exit /b 1
)

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>nul || (
  echo [X] Not a git repository.
  echo     Run this from the project root.
  pause
  exit /b 1
)

REM Show current status
echo --- Current Status ---
git status --short
echo.

REM Check if there are any changes
git diff --quiet && git diff --cached --quiet
if %errorlevel% equ 0 (
  echo [i] No changes to commit.
  echo.
  pause
  exit /b 0
)

REM Show what will be committed
echo --- Changes to be committed ---
echo.
git status
echo.

REM Ask user to confirm
set /p CONFIRM="Do you want to commit these changes? (y/n): "
if /i not "%CONFIRM%"=="y" (
  echo.
  echo [i] Commit cancelled.
  pause
  exit /b 0
)

REM Prompt for commit message
echo.
echo --- Enter Commit Message ---
echo (Press Enter for default message, or type your custom message)
echo.
set /p COMMIT_MSG="Commit message: "

REM Use default message if empty
if "%COMMIT_MSG%"=="" (
  for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set TODAY=%%c-%%a-%%b)
  for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set NOW=%%a:%%b)
  set COMMIT_MSG=update %TODAY% %NOW%
)

REM Stage all changes
echo.
echo --- Staging changes ---
git add -A
if errorlevel 1 (
  echo [X] Failed to stage changes.
  pause
  exit /b 1
)

REM Create commit
echo.
echo --- Creating commit ---
git commit -m "!COMMIT_MSG!"
if errorlevel 1 (
  echo [X] Commit failed.
  pause
  exit /b 1
)

echo [✓] Commit created successfully.

REM Ask if user wants to push
echo.
set /p PUSH="Push to GitHub? (y/n): "
if /i not "%PUSH%"=="y" (
  echo.
  echo [i] Changes committed locally but not pushed.
  echo     Run 'git push' when ready to push to GitHub.
  pause
  exit /b 0
)

REM Push to remote
echo.
echo --- Pushing to GitHub ---
git push origin main
if errorlevel 1 (
  echo.
  echo [X] Push failed.
  echo     This might be because:
  echo     - You need to pull changes first (git pull)
  echo     - Authentication failed
  echo     - No internet connection
  echo.
  echo     Try running: git pull --rebase
  echo     Then run this script again.
  pause
  exit /b 1
)

echo.
echo ============================================
echo   ✓ Success!
echo   Changes committed and pushed to GitHub.
echo   Repository: github.com/Tyrrellkdlemons/tlmfinance
echo ============================================
echo.

REM Show the commit that was just created
echo --- Latest commit ---
git log -1 --oneline
echo.

pause
