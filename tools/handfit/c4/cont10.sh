#!/bin/bash
# CD-1 pass 2: the glove's give for one refitted hand from its final export: cont10.sh <gun-side> <export.json>
cd /home/claude/handfit-work/gun; mkdir -p out10c cont10
n=$1; src=$2; h=${n##*-}
[ -f out10c/$n.bin ] || python3 -I ../c4/sdf_c4.py $src $h out10c/$n 0.001 > out10c/$n.log 2>&1
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out10c/$n');console.log(JSON.stringify(g.H.hand.pose))})")
echo "$n $(OUT=cont10/$n.json node contact.mjs out10c/$n "$P" 2>&1 | grep -v stale | tail -1 | cut -c1-200)" >> cont10/all.log
