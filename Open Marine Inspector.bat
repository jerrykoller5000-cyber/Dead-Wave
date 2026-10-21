@echo off
setlocal
rem Live game inspector; verified server reuse and readiness: tools\inspector-launch.mjs.
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or newer is required to open the Marine Inspector.
  echo Install Node.js and reopen this launcher. Guide: studio\inspector\README.md
  pause
  exit /b 1
)
node tools\inspector-launch.mjs
if errorlevel 1 (
  echo The inspector did not open. See the error above.
  pause
  exit /b 1
)
exit /b 0
