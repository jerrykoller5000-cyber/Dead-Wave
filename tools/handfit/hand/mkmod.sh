#!/bin/sh
D=/home/claude/handfit-work/hand
cp /home/claude/gs306/studio/marine-hand-bake.js $D/marine-hand-bake.js
{ cat /home/claude/gs306/studio/marine-hand.js; echo; echo 'export { boneFrames as _bf, fingerProf as _fp, thumbProf as _tp, JOINT_LIMITS as _J };'; } > $D/mh-tool.mjs
echo 'export { handField as _hf, handSurface as _hs, BUILD as _BUILD, mul as _mul, inv as _inv, ap as _ap };' >> $D/mh-tool.mjs
