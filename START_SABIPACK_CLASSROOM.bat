@echo off
setlocal
cd /d "%~dp0"
title SabiPack Classroom Launcher

echo.
echo  ==========================================
echo       SabiPack - Start your classroom
echo  ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed on this computer.
  echo Please install the free Node.js LTS version from:
  echo https://nodejs.org/
  echo Choose the LTS download, install it, then double-click this file again.
  echo.
  pause
  start "" "https://nodejs.org/"
  exit /b 1
)

REM The local classroom server uses Node.js built-in modules only.
REM No npm install or internet connection is required to host files over local Wi-Fi.

REM Optional settings: copy classroom\settings.example.bat to classroom\settings.bat
REM and add your deployed SabiPack website address there for local AI requests.
if exist "classroom\settings.bat" call "classroom\settings.bat"

REM Use 8080 when free; if another SabiPack server already uses it, try 8081, 8082, etc.
set PORT=8080
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=8080; while($p -le 8090){$x=Get-NetTCPConnection -State Listen -LocalPort $p -ErrorAction SilentlyContinue; if(-not $x){Write-Output $p; exit 0}; $p++}; exit 1" > "%TEMP%\sabipack-port.txt"
set /p PORT=<"%TEMP%\sabipack-port.txt"
if not defined PORT set PORT=8080

echo Starting SabiPack classroom on port %PORT%...
start "SabiPack Classroom Server" cmd /k "cd /d ""%CD%"" && set PORT=%PORT% && node classroom\server.mjs"

echo Waiting for SabiPack to start...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$u='http://127.0.0.1:%PORT%/classroom/teacher'; $ready=$false; for($i=0;$i -lt 30;$i++){try{$r=Invoke-WebRequest -UseBasicParsing $u -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break}}catch{}; Start-Sleep -Seconds 1}; if($ready){Start-Process $u; exit 0}else{Write-Host 'SabiPack did not respond. Check the SabiPack Classroom Server window.'; exit 1}"
if errorlevel 1 (
  echo.
  echo The dashboard did not open. Check the SabiPack Classroom Server window.
  pause
)
endlocal
