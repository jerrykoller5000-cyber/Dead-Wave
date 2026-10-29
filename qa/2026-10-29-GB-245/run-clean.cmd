@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 clean after-numbers: nine guns, six frames, warm-up frame discarded per gun" --minutes 60 -- node qa/2026-10-29-GB-245/rfocus2c.mjs m4,ak,aa12,shotgun,sniper,launcher,pistol,revolver,uzi 0.1,0.25,0.4,0.55,0.7,0.85 qa/2026-10-29-GB-245/landeduzi.json clean > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\clean-px.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-clean.txt"
