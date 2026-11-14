# CC-350 p2 (claude3): the bulky pairs in index.html's carry part: seat order (bulky first), the upright second, pair limits.
# Usage: python3 cc350p2_pairs.py <index.html>   (CRLF kept; refuses unless each old text is found exactly once)
import sys
p = sys.argv[1]
s = open(p, encoding='utf-8', newline='').read()
R = [
("import { BACK_CARRY, seatOnBack, fitBackSling } from './studio/marine-carry.js';",
 "import { BACK_CARRY, PAIR_CARRY, carryOrder, seatOnBack, fitBackSling } from './studio/marine-carry.js';"),
("""      {let under=null;\r
       rig.slings.forEach((s,i)=>{fitCarriedGun(s,'sling');\r
        if(!s.gun){s.sling.visible=false;s.sling.userData.signature=null;s.seatKey=null;s.seat=null;return;}\r
        const side=i?-1:1,tp=s.sling.userData.torsoPivotY||0.865,key=s.token+'|'+!!rig.slingVest+'|'+(i?rig.slings[0].seatKey:'');\r
        if(s.seatKey!==key||!s.seat){s.seat=seatOnBack(THREE,s,side,tp,!!rig.slingVest,BACK_CARRY,under);s.seatKey=key;}\r
        else s.gun.position.set(0,0,0);\r
        under=s.seat&&s.seat.pts;\r
""",
"""      // CC-350 p2 (D-182): with a bulky gun, a thin one goes on first, flat on the pack, the bulky one on it; two bulky: the\r
      // longer across the pack, the other straight on it, tight (marine-carry.js carryOrder, PAIR_CARRY.mode); nothing below mid-thigh.\r
      {let under=null,prev='';rig.slings.forEach((s)=>fitCarriedGun(s,'sling'));\r
       const ord=carryOrder(rig.slings.map((s)=>s.gun?s.kind:null));\r
       (ord.first?[1,0]:[0,1]).forEach((i)=>{const s=rig.slings[i];if(!s)return;\r
        if(!s.gun){s.sling.visible=false;s.sling.userData.signature=null;s.seatKey=null;s.seat=null;return;}\r
        const side=i?-1:1,tp=s.sling.userData.torsoPivotY||0.865,key=s.token+'|'+!!rig.slingVest+'|'+prev+'|'+(ord.bulky?(ord.upright===i?'u':'b')+PAIR_CARRY.mode:'');\r
        if(s.seatKey!==key||!s.seat){s.seat=seatOnBack(THREE,s,side,tp,!!rig.slingVest,BACK_CARRY,under,ord.bulky?{lowest:PAIR_CARRY.lowest,pair:true,upright:ord.upright===i}:{});s.seatKey=key;}\r
        else s.gun.position.set(0,0,0);\r
        under=s.seat&&s.seat.pts;prev=s.seatKey;\r
"""),
("      const HIP_FIT = { x: 0.135, z: -0.1, n: [0.3, -0.954], y: 0.85, clear: 0.004, splay: 0.12 };",
 "      // CC-350 p2: the pistol grew (GT-20106's magazine): 2 cm higher, 1 deg less splay, its face turned 3.5 deg further out\r\n"
 "      // (tcc347, cloud: its lowest third 4.0-4.2 -> 2.5 cm at 4 o'clock, 3.7 at 8; legs 6.6 mm clear walking to jumping).\r\n"
 "      const HIP_FIT = { x: 0.135, z: -0.1, n: [0.36, -0.933], y: 0.87, clear: 0.004, splay: 0.1 };"),
]
for a, b in R:
    n = s.count(a)
    if n != 1: sys.exit('found %d times: %r' % (n, a[:80]))
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8', newline='').write(s)
print('patched', p)
