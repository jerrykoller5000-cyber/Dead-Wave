@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot CU-188 --checks "t76 t80 real renderer: GB-251 before page, current tree again, before page again" --minutes 40 -- cmd /c "set TT_PAGE=zz-gb251-before.html&& node qa\2026-10-31-CU-188-grokbot\realpage.mjs t76 t80 --all > qa\2026-10-31-CU-188-grokbot\before-1.log 2>&1 & node tools/realtest.mjs t76 t80 --all > qa\2026-10-31-CU-188-grokbot\real-2.log 2>&1 & set TT_PAGE=zz-gb251-before.html&& node qa\2026-10-31-CU-188-grokbot\realpage.mjs t76 t80 --all > qa\2026-10-31-CU-188-grokbot\before-2.log 2>&1" > "qa\2026-10-31-CU-188-grokbot\run2.slot.log" 2>&1
echo DONE > "qa\2026-10-31-CU-188-grokbot\run2.done"
