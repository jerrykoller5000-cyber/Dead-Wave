@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-248 --checks "GB-248 landed (v3): t215 t95 page load + t198 t205 t247 t75 and the colossus tests on the real renderer" --minutes 120 -- node tools/realtest.mjs t215 t95 t198 t205 t247 t75 t23 t42 t43 t53 t77 t78 t93 t137 t143 t168 t249 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-248\tests1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-248 --checks "GB-248 after capture (v3)" --minutes 20 -- node qa/2026-10-29-GB-248/probe.mjs after > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-248\after.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-248\ran1.txt"
