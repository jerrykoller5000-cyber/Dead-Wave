@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 before: t93 on GB-248's index.before.html (real renderer, t93 unchanged)" --minutes 30 -- node qa/2026-10-29-GB-249/realtest-page.mjs --html qa/2026-10-29-GB-248/index.before.html t93 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\before-page-old-t93.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 before: t93 unchanged on the current index.html (real renderer)" --minutes 30 -- node tools/realtest.mjs t93 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\current-old-t93.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\ran1.txt"
