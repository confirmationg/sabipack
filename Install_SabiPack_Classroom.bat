@echo off
setlocal
cd /d "%~dp0"
title Install SabiPack Classroom Helper
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install_SabiPack_Classroom.ps1"
if errorlevel 1 (
  echo.
  echo Installation did not complete. Read the message above and try again.
) else (
  echo.
  echo SabiPack classroom helper is ready. Open SabiPack and choose Teacher, then Start My Local Classroom.
)
echo.
pause
endlocal
