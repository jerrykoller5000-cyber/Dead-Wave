@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 22 or newer is required to play Dead Wave.
  pause
  exit /b 1
)
rem Jerry's manual game has queue priority. This tracks only the Edge process it starts,
rem waits for that window to close, then releases the machine-wide game-test slot.
node tools\game-test-slot.mjs run jerry MANUAL-GAME --checks "Jerry manual game" --minutes 0 -- node tools\play-launch.mjs
if errorlevel 1 (
  echo Dead Wave did not open, or its queued launch failed. See the error above.
  pause
  exit /b 1
)
exit /b 0
