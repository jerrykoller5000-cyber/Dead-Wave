@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot CU-188 --checks "Claude's ask: t76 and t80 alone on the real renderer, current tree (with GB-251)" --minutes 40 -- node tools/realtest.mjs t76 t80 --all > "qa\2026-10-31-CU-188-grokbot\real.log" 2>&1
echo DONE > "qa\2026-10-31-CU-188-grokbot\real.done"
