#!/bin/bash
# from the best so far: the thumb's grid, then gungrip3 from that place with moves to 20 mm -> res3/<name>.txt
cd /home/claude/handfit-work/gun; mkdir -p res3
for n in "$@"; do
  [ -f res3/$n.txt ] && continue
  R0=$(grep '^RESULT' best/$n.txt | sed 's/^RESULT //')
  T=$(node touch.mjs $n 2>/dev/null)
  R2=$(node thumbgun.mjs out/$n "$R0" 2>/dev/null | grep '^RESULT' | sed 's/^RESULT //')
  P2=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1]).pose))" "$R2")
  OUT=$(START="$R2" node gungrip3.mjs out/$n "$P2" "$T" 20 2>/dev/null)
  { echo "TOUCH $T"; echo "R2 $R2"; echo "$OUT" | grep -E '^step 0.0125|^SELF|^RESULT'; } > res3/$n.txt
done
