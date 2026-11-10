#!/bin/bash
cd /home/claude/handfit-work/gun; mkdir -p out3
run() { for k in "$@"; do for h in r l; do [ -f out3/$k-$h.bin ] && continue; T0=$(date +%s); python3 -I sdf_small.py /home/claude/fpshot/g3/shots/$k.json $h out3/$k-$h 0.0008 > out3/$k-$h.log 2>&1; echo "$k $h $(( $(date +%s) - T0 ))s $(tail -c 200 out3/$k-$h.log)" >> out3/all.log; done; done; }
run pistol uzi aa12 m4 shotgun launcher &
run revolver sniper ak minigun flamer chainsaw &
wait
echo ALLDONE >> out3/all.log
