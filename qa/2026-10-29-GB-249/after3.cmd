@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 after 3: roundInfoDbg reads the head's skin sources; t215 t95 page load and t93 (real renderer)" --minutes 30 -- node tools/realtest.mjs t215 t95 t93 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\after-t93-run3.log" 2>&1
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 after 4: t93 again (the demon's walking sole twice running)" --minutes 20 -- node tools/realtest.mjs t93 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\after-t93-run4.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\after3.done"
