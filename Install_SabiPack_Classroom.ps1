$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$version = 'v26.13.0'
$archiveName = "node-$version-win-x64.zip"
$downloadUrl = "https://nodejs.org/dist/$version/$archiveName"
$installRoot = Join-Path $env:LOCALAPPDATA 'SabiPack'
$appTarget = Join-Path $installRoot 'app'
$runtimeTarget = Join-Path $installRoot 'runtime'
$appSource = Join-Path $PSScriptRoot 'SabiPack-App'
$tempRoot = Join-Path $env:TEMP ('SabiPack-Setup-' + [guid]::NewGuid().ToString('N'))

Write-Host ''
Write-Host '  SabiPack Classroom Setup' -ForegroundColor Green
Write-Host '  One-time setup for this Windows laptop' -ForegroundColor Green
Write-Host ''

if (-not [Environment]::Is64BitOperatingSystem) {
  throw 'This setup package currently supports 64-bit Windows only.'
}
if (-not (Test-Path (Join-Path $appSource 'classroom\server.mjs'))) {
  throw 'The SabiPack-App folder is missing. Extract the complete setup ZIP before running this installer.'
}
New-Item -ItemType Directory -Force -Path $installRoot, $runtimeTarget, $tempRoot | Out-Null

$runtimeExe = Join-Path $runtimeTarget 'node.exe'
$versionFile = Join-Path $runtimeTarget 'sabipack-node-version.txt'
$runtimeReady = (Test-Path $runtimeExe) -and (Test-Path $versionFile) -and ((Get-Content $versionFile -Raw).Trim() -eq $version)
if (-not $runtimeReady) {
  Write-Host "Downloading the official Node.js $version portable runtime..." -ForegroundColor Cyan
  Write-Host 'This step needs an internet connection. It is only required during setup.'
  $archivePath = Join-Path $tempRoot $archiveName
  Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath -UseBasicParsing
  $extractPath = Join-Path $tempRoot 'node'
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force
  $nodeSource = Join-Path $extractPath "node-$version-win-x64\node.exe"
  if (-not (Test-Path $nodeSource)) { throw 'The downloaded Node.js archive did not contain node.exe.' }
  Copy-Item -LiteralPath $nodeSource -Destination $runtimeExe -Force
  Set-Content -LiteralPath $versionFile -Value $version -Encoding ASCII
}

Write-Host 'Installing SabiPack classroom files...' -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $appTarget | Out-Null
& robocopy $appSource $appTarget /E /R:1 /W:1 /XD '.git' 'node_modules' 'classroom\uploads' 'public\downloads' /XF '.env' '.env.*' 'classroom\settings.bat' | Out-Null
$copyCode = $LASTEXITCODE
if ($copyCode -ge 8) { throw "Could not copy SabiPack files (robocopy code $copyCode)." }
$uploads = Join-Path $appTarget 'classroom\uploads'
New-Item -ItemType Directory -Force -Path $uploads | Out-Null
$index = Join-Path $uploads 'resources.json'
if (-not (Test-Path $index)) { Set-Content -Path $index -Value '[]' -Encoding UTF8 }

$launcher = Join-Path $installRoot 'Start-SabiPack-Classroom.cmd'
@"
@echo off
cd /d "$appTarget"
call START_SABIPACK_CLASSROOM.bat
"@ | Set-Content -Path $launcher -Encoding ASCII

# Register the local launch link used by the Teacher Dashboard.
$key = 'HKCU:\Software\Classes\sabipack-classroom'
New-Item -Path $key -Force | Out-Null
Set-Item -Path $key -Value 'URL:SabiPack Classroom Protocol'
New-ItemProperty -Path $key -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null
$commandKey = Join-Path $key 'shell\open\command'
New-Item -Path $commandKey -Force | Out-Null
Set-Item -Path $commandKey -Value ('"' + $launcher + '" "%1"')

# Add a desktop shortcut for teachers who prefer to start locally without the website.
try {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'SabiPack Classroom.lnk'))
  $shortcut.TargetPath = $launcher
  $shortcut.WorkingDirectory = $appTarget
  $shortcut.Description = 'Start the SabiPack offline classroom server'
  $shortcut.Save()
} catch { Write-Host 'Desktop shortcut could not be created; the Teacher Dashboard button will still work.' -ForegroundColor Yellow }

Remove-Item -LiteralPath $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'SabiPack Classroom is installed.' -ForegroundColor Green
Write-Host "App: $appTarget"
Write-Host "Portable Node.js: $runtimeExe"
Write-Host ''
Write-Host 'Next: open SabiPack > Teacher. Turn on Windows Mobile Hotspot or join classroom Wi-Fi, then select Start My Local Classroom.'
Write-Host 'After setup, the local classroom server does not need internet. Groq AI generation still needs internet.'
