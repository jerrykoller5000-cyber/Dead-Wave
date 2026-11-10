#!/bin/bash
cd /home/claude/handfit-work/gun
run() { for k in "$@"; do for h in r l; do [ -f out/$k-$h.bin ] && continue; T0=$(date +%s); python3 -I sdf.py /home/claude/fpshot/g1/c/$k.json $h out/$k-$h 0.0008 > out/$k-$h.log 2>&1; echo "$k $h $(( $(date +%s) - T0 ))s $(tail -c 300 out/$k-$h.log)" >> out/all.log; done; done; }
rm -f out/pistol-r.bin
run pistol uzi aa12 m4 shotgun launcher &
run revolver sniper ak minigun flamer chainsaw &
wait
echo ALLDONE >> out/all.log
