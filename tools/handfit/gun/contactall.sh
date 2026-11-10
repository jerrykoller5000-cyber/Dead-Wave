#!/bin/bash
cd /home/claude/handfit-work/gun; mkdir -p cont
for f in out3/*.bin; do n=$(basename $f .bin); [ -f cont/$n.json ] && continue
  P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out3/$n');console.log(JSON.stringify(g.H.hand.pose))})")
  echo "$n $(OUT=cont/$n.json node contact.mjs out3/$n "$P" 2>&1 | grep -v stale)" >> cont/all.log
done
