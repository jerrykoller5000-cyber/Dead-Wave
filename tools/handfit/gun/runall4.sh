#!/bin/bash
cd /home/claude/handfit-work/gun
run() { for kh in "$@"; do k=${kh%-*}; h=${kh##*-}; [ -f out4/$kh.bin ] && continue; T0=$(date +%s); python3 -I sdf_fast.py /home/claude/fpshot/g3/shots/$k.json $h out4/$kh 0.001 > out4/$kh.log 2>&1; echo "$kh $(( $(date +%s) - T0 ))s" >> out4/all.log; done; }
run "${@:1:$(( ($#+1)/2 ))}" &
run "${@:$(( ($#+1)/2 + 1 ))}" &
wait; echo ALLDONE >> out4/all.log
