#!/bin/bash
# runsweep.sh <outfile> : 13 configs x 6 stances, one call each
out=$1; echo '{' > $out; first=1
for i in $(seq 0 12); do for st in stand walk run crouch crouchwalk aim; do
  echo "window.__CF=[window.__CF0[$i]]; window.__ST=['$st']; 1" | /home/claude/rq.sh x - >/dev/null
  r=$(WAITS=600 /home/claude/rq.sh sw sweep.js | sed "s/\"C0\//\"C$i\//g; s/^{//; s/}$//")
  [ $first = 0 ] && echo ',' >> $out; first=0; echo "$r" >> $out
done; done
echo '}' >> $out; echo DONE
