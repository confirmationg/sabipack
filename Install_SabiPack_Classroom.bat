@echo off
setlocal
cd /d "%~dp0"
title Install SabiPack Classroom
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install_SabiPack_Classroom.ps1"
if errorlevel 1 (
  echo.
  echo Setup did not finish. Check the message above and try again while connected to the internet.
) else (
  echo.
  echo SabiPack Classroom is ready. Open SabiPack, choose Teacher, then Start My Local Classroom.
)
echo.
pause
endlocal
