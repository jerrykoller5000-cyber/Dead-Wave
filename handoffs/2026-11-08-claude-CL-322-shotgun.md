# claude - CL-322 (D-122 second round) 1 of 14: the shotgun after ChatGPT's GP-20053 - 2026-11-08 06:05Z
Changed:          Claude outputs/cl322/patch322.py (anchored, idempotent) on:
                  studio/weapon-longarms.js makeShotgunModel: (1) the forend rests one stroke ahead of the receiver: its
                  root z 0.28 -> 0.375, so its rear sits 0.125 off the receiver's face (z 0.23) and the 0.12 stroke (9.5 cm,
                  a real pump's) brings it to the face; before, it went 9 cm into the receiver at full stroke (the reload's
                  rack) and 21 cm on the fire cycle. Between them, as on the real gun, the tube and the two action bars.
                  (2) GP-20053's separate bolt now rides back with the forend, per the Stevens 320 manual ("the forend then
                  travels straight back, opening the breech and ejecting through the right-side port. Driving it forward
                  chambers from the tube"). The receiver is solid and the port a recess drawn on its wall, so
                  gun.userData.pumpPoseHook() trims the bolt's bright side to the part still in the opening: closed it fills
                  the port to the face (0.137); the face retreats with the stroke and the dark chamber opens ahead of it;
                  past half the stroke the bolt has left the port (nothing ever drawn over the solid wall).
                  (3) gun.userData.ejectPort [HW+0.003, 0.018, 0.1]: the hull leaves from the port (CL-319's line in
                  spawnCasing reads it).
                  index.html: updateShotgunPump's travel 0.24 -> 0.12 (the reload's chamber rack was already 0.12); the hook
                  called (guarded) after the forend is posed: the fire cycle, the reload's rack, and the two resets.
                  game/viewmodel-poses.js: VM_SOCKETS.shotgun.support z 0.37 -> 0.465 (the palm under the forend's middle);
                  WEAPON_HOLD's fore:'pump' follows the forend's root by itself.
                  Kept from GP-20053: the safety's caps, the left slide-lock paddle (behind the guard, where the manual's
                  slide release is), the barrel's retaining lug over the tube; J29's port, J34's black one-piece stock.
Tests:            node --check; cloud tcl281 153/0, t281 33/0. t333: the shotgun's own parts 0 floats (tools/gunshot, the
                  three pump states); t333's 4 fails are the GP-20066 laser/light units in the tree (aa12 x 0.081-0.085,
                  shotgun x 0.084 z 0.804, m240) - ChatGPT's open card, told. FP strip p34 (cloud): fire -> s 0.09, 0.12
                  held, back to 0 by 0.2 s; the bolt hidden at full stroke, back in the port closed; the hand on the forend
                  throughout (handPlace 'fore').
Screenshots:      Claude outputs/cl322/shotgun.jpg (Jerry's sheet: side, quarter, close, other side), shotgun-pump.jpg
                  (forward / racked back, studio and first person).
Not verified:     the 5080 (AG): the stroke at 0.12 in the fire cycle reads as a full rack at speed; the hull's flight from
                  the port; third person with the forend 7.5 cm further out (the left arm's reach).
Requests:         AG: a 5080 still of the shotgun mid-rack in first and third person when the slot is free. ChatGPT: the
                  laser/light floats above (GP-20066).
Contract changes: gun.userData.pumpPoseHook, ejectPort (shotgun); the pump's base position (z 0.375); VM_SOCKETS.shotgun.
                  support.
