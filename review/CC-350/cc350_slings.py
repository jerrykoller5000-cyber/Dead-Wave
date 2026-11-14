# CC-350 (claude3): the slung guns flat on his back (index.html carry part). Usage: python3 cc350_slings.py <index.html>
import sys
p = sys.argv[1]
b = open(p, 'rb').read()
crlf = b'\r\n' in b
s = b.decode('utf-8')
nl = '\r\n' if crlf else '\n'
def rep(old, new, count=1):
    global s
    old = old.replace('\n', nl); new = new.replace('\n', nl)
    n = s.count(old)
    if n != count: raise SystemExit(f'expected {count} match(es), found {n}: {old[:80]!r}')
    s = s.replace(old, new)
rep("    import { fitWeaponSling } from './ui/weapon-sling.js';   // GP-156\n",
    "    import { fitWeaponSling } from './ui/weapon-sling.js';   // GP-156\n"
    "    import { BACK_CARRY, seatOnBack, fitBackSling } from './studio/marine-carry.js';   // CC-350: the slung guns flat on his back\n")
rep("      rig.slings.forEach(s=>{fitCarriedGun(s,'sling');clearCarryPack(THREE,s,true);fitWeaponSling(THREE,s,rig.slingVest,carryMats.mag);});\n",
    "      // CC-350 (J153 notes 20, 38, Jerry: \"the Magazine towards the player leaving a massive gap ... think about how weapons would\n"
    "      // actually be carried\"): a slung gun lies flat on his back across the pack, muzzle up behind a shoulder, magazine or drum out\n"
    "      // and down, on a sling over that shoulder and across his chest (studio/marine-carry.js); two cross in an X, the second resting\n"
    "      // on the first where both are thin. Seated only when what is slung or the carrier changes (an ammo count does not re-seat).\n"
    "      {let under=null;\n"
    "       rig.slings.forEach((s,i)=>{fitCarriedGun(s,'sling');\n"
    "        if(!s.gun){s.sling.visible=false;s.sling.userData.signature=null;s.seatKey=null;s.seat=null;return;}\n"
    "        const side=i?-1:1,tp=s.sling.userData.torsoPivotY||0.865,key=s.token+'|'+!!rig.slingVest+'|'+(i?rig.slings[0].seatKey:'');\n"
    "        if(s.seatKey!==key||!s.seat){s.seat=seatOnBack(THREE,s,side,tp,!!rig.slingVest,BACK_CARRY,under);s.seatKey=key;}\n"
    "        else s.gun.position.set(0,0,0);\n"
    "        under=s.seat&&s.seat.pts;\n"
    "        const band=side>0?!!rig.bandolier?.visible:!!rig.belt40?.visible;\n"
    "        fitBackSling(THREE,s,side,tp,!!rig.slingVest,carryMats.mag,(band?.012:0)+(i?.007:0));});}\n")
open(p, 'wb').write(s.encode('utf-8'))
print('patched', p, 'crlf' if crlf else 'lf')
