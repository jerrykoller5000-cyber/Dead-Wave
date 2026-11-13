#!/bin/bash
# cont13.sh (CD-13, Claude 1, 13 Nov): cont12.sh on an sdf_c6 field (OPENSIGN: the big open shells signed, so the give also keeps the
# glove out of a grip's open side panel, J151 note 3). cont13.sh <gun-side> <export.json> [SKIPB]  -> cont13/<gun-side>.json
cd /home/claude/handfit-work/gun; mkdir -p out13c cont13
n=$1; src=$2; h=${n##*-}
[ -f out13c/$n.bin ] || OPENSIGN=1 PAD=0.012 BAND=0.015 python3 -I ../c4/sdf_c6.py $src $h out13c/$n 0.001 > out13c/$n.log 2>&1
P=$(node -e "import('./grid.mjs').then(G=>{const g=G.loadGrid('out13c/$n');console.log(JSON.stringify(g.H.hand.pose))})")
echo "$n $(SKIPB=${3:-[]} OUT=cont13/$n.json node contact.mjs out13c/$n "$P" 2>&1 | grep -v stale | tail -1 | cut -c1-200)" >> cont13/all.log
