$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$targetRoot = Join-Path $env:LOCALAPPDATA 'SabiPack'
$target = Join-Path $targetRoot 'app'
$launcher = Join-Path $targetRoot 'Start-SabiPack-Classroom.cmd'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js LTS is required. Install it from https://nodejs.org/, then run this installer again.' -ForegroundColor Yellow
  Start-Process 'https://nodejs.org/'
  exit 1
}
if (-not (Test-Path (Join-Path $source 'classroom\server.mjs'))) {
  throw 'Run this installer from the extracted SabiPack project folder, beside classroom\server.mjs.'
}
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null
New-Item -ItemType Directory -Force -Path $target | Out-Null
& robocopy $source $target /E /R:1 /W:1 /XD '.git' 'node_modules' 'classroom\uploads' /XF '.env' '.env.*' 'settings.bat' | Out-Null
$copyCode = $LASTEXITCODE
if ($copyCode -ge 8) { throw "Could not copy SabiPack files (robocopy code $copyCode)." }
$uploads = Join-Path $target 'classroom\uploads'
New-Item -ItemType Directory -Force -Path $uploads | Out-Null
$index = Join-Path $uploads 'resources.json'
if (-not (Test-Path $index)) { Set-Content -Path $index -Value '[]' -Encoding UTF8 }
@"
@echo off
cd /d "$target"
call START_SABIPACK_CLASSROOM.bat
"@ | Set-Content -Path $launcher -Encoding ASCII
$key = 'HKCU:\Software\Classes\sabipack-classroom'
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value 'URL:SabiPack Classroom Protocol'
New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$commandKey = Join-Path $key 'shell\open\command'
New-Item -Path $commandKey -Force | Out-Null
Set-Item -Path $commandKey -Value ('"' + $launcher + '" "%1"')
Write-Host ''
Write-Host 'SabiPack Classroom Helper installed successfully.' -ForegroundColor Green
Write-Host 'The Teacher page can now start the local classroom helper.'
Write-Host "Installed at: $target"
Write-Host 'For each class: connect Wi-Fi or turn on Mobile Hotspot, then click Start My Local Classroom.'
