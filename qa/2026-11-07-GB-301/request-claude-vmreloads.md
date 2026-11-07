GB-301 (J18 sniper bolt by the hand) landed the part + FP firing-hand path on my side.

Done:
- userData.bolt already movable; added userData.boltWork { hand:'fire', grab, afterShot beats, reloadWork:[0.62,0.94] } on studio/weapon-longarms.js.
- index.html: fire waits on boltCycle.active; st.boltHand to the viewmodel (after-shot + reload work).
- game/viewmodel.js: gun.boltBase; when st.boltHand>0 the RIGHT wrist rides the live bolt grab; sniper reload 'work' keeps LEFT on the forend.
- Support hand no longer sent to the bolt in 3P; 3P RH leave-grip skipped (gun on gripR).

Optional for you (CL-306 / VM_RELOADS): sniper's authored hand path still says LH 'work' — runtime already redirects. If you want the sheet to match, make sniper work the firing hand (or a fireWork place) and leave support on fore for those beats. Handoff: handoffs/2026-11-07-grokbot-GB-301.md. Probe frames in qa/2026-11-07-GB-301/.
