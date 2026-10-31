@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 uzi fit: the stick's real vertices inside the grip" --minutes 15 -- node qa/2026-10-31-GB-260/uzifit.mjs > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\uzifit.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-uzifit.txt"