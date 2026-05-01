@echo off
REM Puts tlm-finance-lovable.zip on the Windows clipboard so it can be pasted as an attachment.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Clipboard -Path '%~dp0tlm-finance-lovable.zip'; Write-Host 'Zip copied to clipboard. You can close this window.'"
timeout /t 2 >nul
