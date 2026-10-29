@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 where: glove screen positions per reload frame" --minutes 40 -- node qa/2026-10-29-GB-245/where.mjs where1 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\where1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-where1.txt"
