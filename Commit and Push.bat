@echo off
cd /d "%~dp0"
git add -A
git commit -m "cp32: volume sliders, marine field cap + harness; cp31: armor gear, machete, soundtrack director, ambience" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01FUxuGzwtjkHXAcQjZehrQc"
git push origin main
pause
