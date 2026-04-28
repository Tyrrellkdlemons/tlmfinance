# make-lovable-zip.ps1
# Creates a clean tlm-finance-lovable.zip from this project folder.
# Excludes: .git, .netlify, node_modules, prior zip artifacts.

$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

$zipPath = Join-Path $root "tlm-finance-lovable.zip"

if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Removed old zip."
}

$exclude = @(
    ".git",
    ".netlify",
    "node_modules",
    "tlm-finance-deploy.zip",
    "tlm-finance-lovable.zip",
    "make-lovable-zip.ps1",
    "make-lovable-zip.bat"
)

$items = Get-ChildItem -Path $root -Force | Where-Object { $exclude -notcontains $_.Name }

if (-not $items -or $items.Count -eq 0) {
    Write-Host "No files to zip. Aborting."
    exit 1
}

Write-Host "Zipping $($items.Count) top-level items..."

Compress-Archive -Path $items.FullName -DestinationPath $zipPath -CompressionLevel Optimal

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)

Write-Host ""
Write-Host "Done. Created: $zipPath"
Write-Host "Size: $sizeMB MB"
Write-Host ""
Write-Host "You can close this window."
Read-Host "Press Enter to exit"
