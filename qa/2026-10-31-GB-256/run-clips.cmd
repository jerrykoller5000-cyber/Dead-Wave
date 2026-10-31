@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
:wait
if exist "qa\2026-10-31-GB-256\after.done" goto go
timeout /t 20 /nobreak > nul
goto wait
:go
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 clips, after: 120 frame-stepped frames, m4 zoom-move + pistol near-move, Training Ground" --minutes 20 -- node qa\2026-10-31-GB-256\clip.mjs after > "qa\2026-10-31-GB-256\clip-after.log" 2>&1
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 clips, before: the same on the before page (index.html swapped for the run, restored after)" --minutes 20 -- cmd /c "copy /y qa\2026-10-31-GB-256\index.before.html index.html > nul && node qa\2026-10-31-GB-256\clip.mjs before > qa\2026-10-31-GB-256\clip-before.log 2>&1 & copy /y qa\2026-10-31-GB-256\index.after.html index.html > nul" > "qa\2026-10-31-GB-256\clip-before.slot.log" 2>&1
copy /y qa\2026-10-31-GB-256\index.after.html index.html > nul
fc /b index.html qa\2026-10-31-GB-256\index.after.html > nul && echo RESTORED-OK > "qa\2026-10-31-GB-256\clips.done" || echo RESTORE-MISMATCH > "qa\2026-10-31-GB-256\clips.done"
