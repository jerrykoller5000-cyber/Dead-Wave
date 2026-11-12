#!/bin/bash
# cont12.sh (12 Nov: sdf_c5). CD-1 pass 2: the glove's give for one refitted hand from its final export: cont12.sh <gun-side> <export.json>
cd /home/claude/handfit-work/gun; mkdir -p out12c cont12
n=$1; src=$2; h=${n##*-}
[ -f out12c/$n.bin ] || python3 -I ../c4/sdf_c5.py $src $h out12c/$n 0.001 > out12c/$n.log 2>&1
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out12c/$n');console.log(JSON.stringify(g.H.hand.pose))})")
echo "$n $(OUT=cont12/$n.json node contact.mjs out12c/$n "$P" 2>&1 | grep -v stale | tail -1 | cut -c1-200)" >> cont12/all.log
