@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
:waitrun2
if exist "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249c\run2.done" goto go
timeout /t 30 /nobreak >nul
goto waitrun2
:go
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up run 3: t76 and t222 (Claude's FYI) unchanged, test page, run A" --minutes 15 -- node tools/tests/run-all.mjs t76 t222 --jobs 1 --all-fails --no-retry --agent grokbot --task GB-249 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249d\page-A.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up run 3: t76 and t222 unchanged, test page, run B" --minutes 15 -- node tools/tests/run-all.mjs t76 t222 --jobs 1 --all-fails --no-retry --agent grokbot --task GB-249 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249d\page-B.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 follow-up run 3: t76 and t222 unchanged, real renderer" --minutes 20 -- node tools/realtest.mjs t76 t222 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249d\real.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-30-GB-249d\run3.done"
