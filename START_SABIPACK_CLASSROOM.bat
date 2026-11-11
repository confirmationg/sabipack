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

if not exist "node_modules\@libsql\client" (
  echo First-time setup: installing SabiPack components. Internet is needed once.
  call npm install
  if errorlevel 1 (
    echo.
    echo Setup did not complete. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

REM Start the classroom server in its own window so the teacher can see status messages.
start "SabiPack Classroom Server" cmd /k "cd /d ""%CD%"" && node classroom\server.mjs"

echo Waiting for SabiPack to start...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; for($i=0;$i -lt 30;$i++){try{$r=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8080/classroom/teacher' -TimeoutSec 2; if($r.StatusCode -eq 200){$ready=$true;break}}catch{}; Start-Sleep -Seconds 1}; if($ready){Start-Process 'http://127.0.0.1:8080/classroom/teacher'; exit 0}else{Write-Host 'SabiPack did not respond on port 8080. Check the server window for an error.'; exit 1}"
if errorlevel 1 (
  echo.
  echo The dashboard did not open. Check the SabiPack Classroom Server window.
  pause
)
endlocal
