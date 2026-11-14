#!/bin/bash
# capture.sh <phase> <cfgname> <cfgjson> [views] [lights]
phase=$1; cname=$2; cjson=$3; views=${4:-game,gz,back,sideP,sideN,front,top}; lights=${5:-noon,overcast,dusk,night}
out=/home/claude/cap/$phase; mkdir -p $out
[ -n "$NOCFG" ] || echo "window.__cfg($cjson)" | MAXC=200 /home/claude/rq.sh cfg-$cname - >/dev/null
declare -A V
V[game]='"cam":[0,9.91,-8.36],"look":[0,0.9,0],"fov":60'
V[gz]='"cam":[0,9.91,-8.36],"look":[0,0.9,0],"fov":9'
V[back]='"cam":[0,1.35,-2.6],"look":[0,0.92,0],"fov":32'
V[sideP]='"cam":[2.6,1.2,-0.1],"look":[0,0.9,-0.1],"fov":32'
V[sideN]='"cam":[-2.6,1.2,-0.1],"look":[0,0.9,-0.1],"fov":32'
V[front]='"cam":[0,1.35,2.6],"look":[0,0.92,0],"fov":32'
V[top]='"cam":[0,3.3,-0.35],"look":[0,0.9,-0.05],"fov":32'
V[q34]='"cam":[1.6,1.6,-1.9],"look":[0,0.95,-0.05],"fov":32'
V[q34n]='"cam":[-1.6,1.6,-1.9],"look":[0,0.95,-0.05],"fov":32'
V[cs]='"cam":[1.5,1.05,-0.25],"look":[0,1.0,-0.25],"fov":30'
V[csn]='"cam":[-1.5,1.05,-0.25],"look":[0,1.0,-0.25],"fov":30'
V[cb]='"cam":[0.5,1.15,-1.6],"look":[0,0.98,-0.2],"fov":34'
for l in ${lights//,/ }; do for v in ${views//,/ }; do
  echo "{${V[$v]},\"light\":\"$l\",\"wait\":300}" | /home/claude/rq.sh shot-x - >/dev/null
  mv /home/claude/repl/out/shot-x.png $out/$cname-$v-$l.png
done; done
echo done $cname
