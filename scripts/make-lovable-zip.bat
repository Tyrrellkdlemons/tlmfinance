@echo off
REM Double-click this file to create tlm-finance-lovable.zip in the project folder.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-lovable-zip.ps1"
