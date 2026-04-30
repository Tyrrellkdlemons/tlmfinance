# build-presentation-zip.ps1
# Bundles the self-running presentation + all narration assets into a single zip.
# Drop the (optional) voiceover.mp3 next to this script before running.
#
# How to run:
#   1. Right-click → "Run with PowerShell"
#   OR
#   2. Open PowerShell here and:  powershell -ExecutionPolicy Bypass -File .\build-presentation-zip.ps1
#
# Output:
#   .\TLM-Finance-Presentation-Pack.zip   (placed alongside this script)

$ErrorActionPreference = 'Stop'

# Resolve paths relative to this script
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir  = $ScriptDir                                                   # The Last Mile (TLM)\
$PackDir     = Join-Path (Split-Path -Parent $ProjectDir) 'TLM-Finance-Presentation-Pack'
$StageDir    = Join-Path $env:TEMP ("TLM-Finance-Pack-" + [guid]::NewGuid().ToString('N'))
$ZipOut      = Join-Path $ProjectDir 'TLM-Finance-Presentation-Pack.zip'

Write-Host ""
Write-Host "TLM Finance — Presentation Pack Builder" -ForegroundColor Yellow
Write-Host ("=" * 60)
Write-Host ("Project dir : " + $ProjectDir)
Write-Host ("Pack source : " + $PackDir)
Write-Host ("Staging dir : " + $StageDir)
Write-Host ("Output zip  : " + $ZipOut)
Write-Host ""

# Build a fresh staging folder
if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }
New-Item -ItemType Directory -Path $StageDir | Out-Null

# Files to include (relative-to-source -> destination-name)
# NOTE: missing files are skipped with a warning, so you can run this even
# before you've generated voiceover.mp3.
$Items = @(
    # Self-contained player + editable script
    @{ Src = (Join-Path $ProjectDir 'self-running-presentation.html'); Dst = 'self-running-presentation.html' }
    @{ Src = (Join-Path $ProjectDir 'presentation-data.json');         Dst = 'presentation-data.json' }

    # Standalone pack (transcript / TTS-ready voice script / captions / readme)
    @{ Src = (Join-Path $PackDir 'README.md');                          Dst = 'README.md' }
    @{ Src = (Join-Path $PackDir 'transcript.md');                      Dst = 'transcript.md' }
    @{ Src = (Join-Path $PackDir 'voice-script.md');                    Dst = 'voice-script.md' }
    @{ Src = (Join-Path $PackDir 'captions.md');                        Dst = 'captions.md' }

    # Optional companion deck — included when present
    @{ Src = (Join-Path $ProjectDir 'TLM-Finance-Pitch-Today.pptx');    Dst = 'TLM-Finance-Pitch-Today.pptx' }
    @{ Src = (Join-Path $ProjectDir 'TLM-Finance-Presentation.pptx');   Dst = 'TLM-Finance-Presentation.pptx' }

    # Optional voiceover (drop your generated MP3 in the project dir before running)
    @{ Src = (Join-Path $ProjectDir 'voiceover.mp3');                   Dst = 'voiceover.mp3' }
    @{ Src = (Join-Path $PackDir    'voiceover.mp3');                   Dst = 'voiceover.mp3' }
)

$IncludedCount = 0
$SkippedCount  = 0
foreach ($it in $Items) {
    if (Test-Path $it.Src) {
        Copy-Item -LiteralPath $it.Src -Destination (Join-Path $StageDir $it.Dst) -Force
        Write-Host ("  + " + $it.Dst) -ForegroundColor Green
        $IncludedCount++
    } else {
        Write-Host ("  - skip " + $it.Dst + "  (not found)") -ForegroundColor DarkGray
        $SkippedCount++
    }
}

# Optional: include rendered slide PNGs if they exist (for video editors)
$SlidePngDir = Join-Path $ProjectDir 'pitch-slides-png'
if (Test-Path $SlidePngDir) {
    Write-Host "  + pitch-slides-png/  (rendered slide images)" -ForegroundColor Green
    Copy-Item -LiteralPath $SlidePngDir -Destination (Join-Path $StageDir 'pitch-slides-png') -Recurse -Force
    $IncludedCount++
}

# Drop a quickstart QUICKSTART.txt in the staging folder
$Quickstart = @'
TLM Finance — Presentation Pack
================================

WHAT'S IN HERE
--------------
self-running-presentation.html  ← Open this in any browser to run the show.
presentation-data.json          ← Edit this to change ANY slide text or narration.
README.md                       ← Full instructions.
transcript.md                   ← Read-aloud / teleprompter version.
voice-script.md                 ← TTS-ready (paste into ElevenLabs/Murf/Speechify).
captions.md                     ← Caption timing for video editors.
voiceover.mp3                   ← (optional) AI-generated voice. Put in same folder as the HTML.
TLM-Finance-Pitch-Today.pptx    ← (optional) PowerPoint version.
pitch-slides-png/               ← (optional) Rendered slide PNGs for video timeline.

QUICK START (60 seconds)
------------------------
1. Unzip this folder anywhere.
2. Double-click  self-running-presentation.html
3. Click "Auto-play with voice".
   - Browser TTS narrates each slide (male voice preferred).
   - To use a custom AI voice: drop voiceover.mp3 next to the HTML file.

EDIT THE PRESENTATION
---------------------
Open  presentation-data.json  in any text editor.
Change titles, bullets, narration, durations — refresh the HTML to see your edits.
No coding required.

CONTROLS
--------
Space      play / pause
← →        previous / next slide
F          fullscreen
C          captions on/off
M          mute voice
L          slide list
R          restart
'@
Set-Content -Path (Join-Path $StageDir 'QUICKSTART.txt') -Value $Quickstart -Encoding UTF8
Write-Host "  + QUICKSTART.txt" -ForegroundColor Green
$IncludedCount++

Write-Host ""
Write-Host ("Files staged: " + $IncludedCount + "  (skipped " + $SkippedCount + ")")

# Remove any stale zip and rebuild
if (Test-Path $ZipOut) { Remove-Item -Force $ZipOut }

Write-Host ""
Write-Host "Compressing ..." -ForegroundColor Yellow

# Use built-in Compress-Archive (PS 5+ on Win 10/11)
Compress-Archive -Path (Join-Path $StageDir '*') -DestinationPath $ZipOut -CompressionLevel Optimal

# Cleanup staging
Remove-Item -Recurse -Force $StageDir

Write-Host ""
Write-Host "Done." -ForegroundColor Green
Write-Host ("Created: " + $ZipOut)
$Size = (Get-Item $ZipOut).Length
$SizeKB = [math]::Round($Size / 1KB, 1)
Write-Host ("Size   : " + $SizeKB + " KB")
Write-Host ""
Write-Host "Open it with File Explorer (right-click → Extract all)." -ForegroundColor Cyan
Write-Host ""
