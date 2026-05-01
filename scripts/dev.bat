@echo off
REM TLM Finance - local dev server (http://localhost:8080)
cd /d "%~dp0"
title TLM Finance - dev http://localhost:8080
where node >nul 2>nul && (
  call npx -y serve@latest -l 8080 .
) || (
  where python >nul 2>nul && (
    python -m http.server 8080
  ) || (
    echo Install Node.js or Python to run a local server.
    pause
  )
)
