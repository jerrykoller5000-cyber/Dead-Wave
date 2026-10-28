import csv, json
R = r"F:\Sound_Effects\Guns\Real Firearms Sounds"
A = {r['file']: r for r in csv.DictReader(open(r"qa\2026-10-26-GB-239\pack-analysis.tsv", encoding='utf-8'), delimiter='\t')}
import re
N=lambda k: re.sub(r'SFX_|Wpn|Weapon','',k)
IDX={N(k):k for k in A}
def t(f, cap=None, why='', end=None, start=None, endk='end30', **kw):
    f = IDX[N(f)]; r = A[f]; on = float(r['onset']); s = start if start is not None else max(0.0, round(on - 0.005, 3))
    e = end if end is not None else float(r[endk]); 
    if cap: e = min(e, s + cap)
    d = {"src": R + "\\" + f, "start": round(s, 3), "end": round(e, 3), "why": why}; d.update(kw); return d
P = {}
def F(folder, hp, takes, note=None):
    P[folder] = {"hp": hp, "takes": takes}
    if note: P[folder]["note"] = note
S = 'impactful'
F("weapons/pistol", 90, [t(f"WeaponPistol005\\SFX_WpnPistol005_Shot_Single_0{i}.wav", 0.42, f"a dry, sharp 9mm crack, body and a short room; tail cut at -30 dB ({S}). Sits as Jerry's now") for i in (1,3,4)] + [t("WeaponPistol003\\SFX_WpnPistol003_Shot_Single_02.wav", 0.42, "a brighter crack for variety; a touch softer than the 005s")])
F("weapons/pistol-suppressed", 120, [t(f"WeaponPistol006\\SFX_WpnPistol006_Silenced Single Shot V0{i}.wav", 0.22, "a tight suppressed thump with the slide's clack, 0.2 s; softer than the pistol, as it should be") for i in (1,3,5)])
F("weapons/revolver", 80, [t(f"WeaponRevolver001\\SFX_WpnRevolver001_Single Shot V0{i}.wav", 0.62, "a heavy .357 boom with more low end than the pistol; tail cut at 0.6 s (the game adds the echo). Louder than the pistol") for i in (1,3,5)])
F("weapons/smg", 100, [t(f"WeaponSubMG008\\SFX_WpnSubMG008_Shot_Single_0{i}.wav", 0.3, "a fast snappy 9mm SMG crack, 0.3 s: it repeats at 900 rpm, so short. A touch softer than the carbine") for i in (1,2,4)] + [t("WeaponSubMG003\\SFX_WpnSubMG003_Shot_Single_01.wav", 0.3, "a brighter SMG crack for variety")])
F("weapons/carbine", 90, [t(f"WeaponARifle005\\SFX_WpnARifle005_Shot_Single_0{i}.wav", 0.38, "a punchy 5.56 crack with a short body, 0.38 s; the rolling echo is the game's. As Jerry's") for i in (1,2,4)] + [t("WeaponARifle007\\WeaponARifle007_Single Shot V01.wav".replace("WeaponARifle007\\WeaponARifle007_","WeaponARifle007\\ARifle007_"), 0.25, "a tighter 5.56 shot for variety")])
F("weapons/carbine-suppressed", 110, [t(f"WeaponARifle007\\ARifle007_Silenced Single Shot V0{i}.wav", 0.26, "a hard muffled crack with the bolt's clatter, 0.25 s; softer than the carbine") for i in (1,2,5)])
F("weapons/rifle", 70, [t(f"WeaponARifle001\\MA_ByMedartimus_AssaultRifle001_ShotSingle0{i}.wav", 0.55, "the darkest rifle in the pack (least top end): a deep heavy 7.62 crack, cut at 0.55 s. Louder than the carbine") for i in (1,2,3)] + [t("WeaponARifle004\\SFX_WpnARifle004_Shot_Single_01.wav", 0.55, "a second heavy rifle for variety")])
F("weapons/shotgun", 70, [t(f"WeaponShotgun001\\SFX_WpnShotgun001_Shot_0{i}.wav", 0.6, "a big deep 12-gauge boom, cut at 0.6 s; the loudest of the hand guns after the sniper") for i in (1,3,5)])
F("weapons/auto-shotgun", 70, [t(f"WeaponShotgun002\\SFX_WpnShotgun002_Shot_Single_0{i}.wav", 0.55, "a thick punchy boom, tighter than the pump's (it fires fast), 0.55 s; a little softer than the pump") for i in (1,2,4)])
F("weapons/sniper", 60, [t(f"WeaponSniperRifle001\\Sniper Rifle Single Shot V0{i}.wav", 0.95, "a massive crack with its first slap back, cut at 0.95 s (it's slow, so a little room is OK). The loudest gun") for i in (1,2,4)])
F("weapons/machine-gun", 70, [t(f"WeaponARifle007\\ARifle007_Burst Bullet Count3 V0{i}.wav", 0.5, "three heavy rhythmic shots in one take, cut at 0.5 s. The pack's MGs come only as single shots and loops; this is the rifle burst with the most weight") for i in (1,2,3)])
F("weapons/machine-gun-shot", 70, [t(f"WeaponMG002\\SFX_WpnMG002_Shot_Single_0{i}.wav", 0.42, "a heavy punchy 7.62 belt-fed shot with a short echo, 0.42 s: it repeats. Louder than the carbine") for i in (1,3,4)] + [t("WeaponMG003\\SFX_WpnMG003_Shot_Single_03.wav", 0.32, "a tighter MG shot for variety")])
F("weapons/rotary-gun-loop", 60, [
    t("WeaponGutlingMiniGunG002\\SFX_GutlingMiniGunG002_Firing_Loop.wav", None, "a steady ripping roar, made as made a seamless loop (3.6 s + 0.5 s crossfade); the pack's loudest file, so it sits loud: right for the minigun", start=0.0, end=4.258, loop=3.6, xfade=0.5),
    t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_Shot_Loop.wav", None, "the other minigun's roar, a loop (4.0 s), a little brighter", start=0.0, end=4.0, loop=3.4, xfade=0.5)])
F("weapons/rotary-gun", 60, [
    t("WeaponGutlingMiniGunG002\\SFX_GutlingMiniGunG002_Firing_Loop.wav", None, "two seconds of the roar from the loop", start=0.0, end=2.0),
    t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_Shot_Loop.wav", None, "two seconds of the other gun's roar", start=1.0, end=3.0)])
F("weapons/rotary-spin", 80, [
    t("WeaponGutlingMiniGunG002\\SFX_GutlingMiniGunG002_Rotation_Start.wav", None, "the barrels spinning up from rest, motor whine rising, 0.93 s, no shots (it replaces AudioSys.minigunSpin's start)", start=0.0, end=0.926),
    t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_Barrel_Rolling_Start_01.wav", None, "a slower spin-up, 1.2 s", start=0.012, end=1.203)])
F("weapons/rotary-spin-loop", 80, [
    t("WeaponGutlingMiniGunG002\\SFX_GutlingMiniGunG002_Rotation_Loop.wav", None, "the barrels at speed, not firing, a loop (1.9 s)", start=0.0, end=1.897, loop=1.3, xfade=0.5),
    t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_Barrel_Rolling.wav", None, "the other gun at speed, a loop (4.0 s)", start=0.0, end=4.0, loop=3.4, xfade=0.5)],
  note="NEW folder: the spin while held without firing (AudioSys.minigunSpin's hold); needs a tk() call")
F("weapons/rotary-spin-end", 80, [
    t("WeaponGutlingMiniGunG002\\SFX_GutlingMiniGunG002_Rotation_Finish.wav", None, "the barrels winding down to rest, 1.45 s", start=0.0, end=1.45),
    t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_Barrel_Rolling_End.wav", None, "a longer wind-down, 1.6 s", start=0.0, end=1.6)],
  note="NEW folder: the spin-down on release; needs a tk() call")
F("weapons/grenade-launcher", 70, [t(f"WeaponGrenadeLauncher003\\SFX_WpnGrenadeLauncher003_Fire_0{i}.wav", 0.5, "a hollow deep 40mm thump, 0.5 s. Softer than a rifle; the blast is the impact") for i in (1,3,5)] + [t("WeaponGrenadeLauncher002\\SFX_WpnGrenadeLauncher002_Fire_02.wav", 0.5, "a second thump for variety")])
F("weapons/explosion", 40, [t(f"WeaponGrenadeLauncher001\\SFX_WpnGrenadeLauncher001_Explosion_0{i}.wav", 1.3, "a sharp deep blast with the debris coming down, cut at 1.3 s. Impactful; as Jerry's") for i in (1,3,4)])
F("turrets/light-turret-shot", 100, [t(f"WeaponSubMG001\\SFX_WpnSubMG001_Shot_Single_0{i}.wav", 0.3, "a dry small-calibre crack, 0.3 s: the sentry fires fast. Softer than his own carbine, it's out on the wall") for i in (1,2,4)] + [t("WeaponSubMG005\\SFX_WpnSubMG005_Shot_Single_04.wav", 0.35, "a second sentry crack for variety")])
F("turrets/heavy-turret-shot", 70, [t(f"WeaponMG001\\SFX_WpnMG001_Shot_Single_0{i}.wav", 0.55, "a deep thumping heavy shot, 0.55 s; louder than the light turret") for i in (1,3,4)])
F("turrets/light-turret-fire", 100, [
    t("WeaponSubMG001\\SFX_WpnSubMG001_Shots_Loop.wav", None, "a short fast rattle from the loop", start=0.0, end=0.6),
    t("WeaponSubMG005\\SFX_WpnSubMG005_Shots_Loop.wav", None, "a second short rattle", start=0.3, end=0.9)])
# foley
F("weapon-foley/mag-out", 150, [
    t("WeaponARifle007\\ARifle007_Magazine Eject.wav", None, "a rifle mag pulled from the well: slide and click, 0.25 s"),
    t("WeaponARifle004\\SFX_WpnARifle004_Clip_Remove.wav", None, "a second mag out, a bit heavier"),
    t("WeaponARifle005\\SFX_WpnARifle005_Clip_Remove.wav", None, "a third mag out")])
F("weapon-foley/mag-in", 150, [
    t("WeaponARifle004\\SFX_WpnARifle004_Clip_Insert.wav", None, "a mag seated with a solid click, 0.32 s"),
    t("WeaponARifle006\\ARifle006_Magazine In.wav", None, "a second mag in"),
    t("WeaponARifle005\\SFX_WpnARifle005_Clip_Insert.wav", None, "a third mag in, louder click")])
F("weapon-foley/mag-release", 200, [t("WeaponPistol003\\SFX_WpnPistol003_Clip_Eject.wav", None, "a small sharp pistol release click and the mag sliding, 0.14 s")])
F("weapon-foley/charging-handle", 150, [t("WeaponARifle005\\SFX_WpnARifle005_Reload.wav", None, "the pack's rifle 'Reload' is the charging handle pulled and released: a springy clack, 0.35 s"), t("WeaponARifle003\\SFX_WpnARifle003_Reload.wav", None, "a second charging handle")])
F("weapon-foley/slide-forward", 150, [t("WeaponPistol002\\SFX_WpnPistol002_Reload.wav", None, "the pistol 'Reload': the slide racked and snapping home, 0.38 s (check by ear it's the slide, not the mag)"), t("WeaponPistol006\\Pistol006_Reload.wav".replace("Pistol006\\Pistol006_","Pistol006\\Pistol006_"), None, "a second slide")])
F("weapon-foley/bolt-cycle", 150, [t("WeaponSniperRifle001\\Sniper Rifle Reload.wav", None, "the sniper's bolt worked, crisp, 0.35 s: shorter than the prompt's four motions, so check by ear it isn't too quick")])
F("weapon-foley/shell-insert", 150, [t("WeaponShotgun002\\SFX_WpnShotgun002_Shell_Insert.wav", None, "a shell pushed into the port, brass and spring, 0.37 s")])
F("weapon-foley/cylinder-open", 150, [t("WeaponRevolver001\\Revolver001_Cylinder Chamber Release.wav", None, "the cylinder released and swung out, 0.19 s")])
F("weapon-foley/cylinder-spin", 150, [t("WeaponRevolver001\\Revolver001_Cylinder Rotation V01.wav", None, "a ratcheting spin, 0.6 s"), t("WeaponRevolver001\\Revolver001_Cylinder Rotation V02.wav", None, "a shorter spin"), t("WeaponRevolver001\\Revolver001_Cylinder Chamber Close.wav", None, "the snap closed alone")])
F("weapon-foley/drum-out", 120, [t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_AmmoMag_Eject.wav", 0.95, "a heavy box/drum unlatched and pulled, clunky, cut to 0.95 s")])
F("weapon-foley/drum-in", 120, [t("WeaponGutlingMiniGunG001\\SFX_GutlingMiniGunG001_AmmoMag_Insert.wav", 1.1, "a heavy drum seated with a deep clunk and latch")])
F("weapon-foley/launcher-open", 150, [t("WeaponGrenadeLauncher001\\SFX_WpnGrenadeLauncher001_Chamber_Open.wav", None, "a heavy breech hinge clack, 0.58 s")])
F("weapon-foley/launcher-shell", 150, [t("WeaponGrenadeLauncher001\\SFX_WpnGrenadeLauncher001_Cartridge_Insert.wav", None, "a 40mm round pushed in"), t("WeaponGrenadeLauncher001\\SFX_WpnGrenadeLauncher001_Chamber_Close.wav", None, "the breech snapped shut")])
F("weapon-foley/brass", 300, [t(f"Bullet Sound FX\\SFX_Shell_Fallings 0{i}.wav", None, "a spent case bouncing; small tinkle, sits soft (it's under every shot)", endk='end20') for i in (1,2,3,8)])
F("weapon-foley/brass-concrete", 300, [t(f"Bullet Sound FX\\SFX_Shell_Fallings 0{i}.wav", None, "the brightest falls (most top end): brass on a hard floor; soft", endk='end20') for i in (5,6,7)])
F("weapon-foley/weapon-switch", 150, [t("WeaponARifle002\\SFX_WpnARifle002_Equip.wav", None, "a rifle brought up, gear and metal, 0.74 s"), t("WeaponPistol005\\SFX_WpnPistol005_Equip.wav", None, "a pistol drawn, 0.32 s"), t("WeaponSubMG007\\SFX_WpnSubMG007_Equip.wav", None, "a short gun brought up")])
# impacts
F("bullet-impacts/dirt", 100, [t(f"Bullet Sound FX\\SFX_Bullet_on_ground_0{i}.wav", 0.45, "a short thud and the earth spraying, cut at 0.45 s") for i in (1,2,3)])
F("bullet-impacts/rock", 120, [t(f"Bullet Sound FX\\SFX_Bullet_on_stone_0{i}.wav", 0.42, "a sharp crack with chips") for i in (1,3,4)])
F("bullet-impacts/metal", 120, [t(f"Bullet Sound FX\\SFX_Bullet_on_metal_0{i}.wav", 0.5, "a bright clang, the ring cut at 0.5 s") for i in (2,4)] + [t("Bullet Sound FX\\SFX_Bullet_on_tinplate_02.wav", 0.3, "a thinner plate clank for variety; softer")])
F("bullet-impacts/wood", 120, [t(f"Bullet Sound FX\\SFX_Bullet_on_wood_0{i}.wav", 0.5, "a hard thock with splinters") for i in (3,4)])
F("bullet-impacts/sand", 100, [t(f"Bullet Sound FX\\SFX_Bullet_on_soft_0{i}.wav", 0.32, "a muffled punch into something soft: sandbags") for i in (1,2,4)])
F("bullet-impacts/whiz", 300, [t(f"Bullet Sound FX\\SFX_Bullet_whiz_0{i}.wav", 0.6, "a round passing close, a short zip (immersive: he hears where the fire comes from)") for i in (1,2,3,4)], note="NEW folder: a near miss past him; needs a tk() call where a zombie's or a stray round passes close")
for k, v in P.items():
    for tk in v["takes"]:
        if tk["end"] <= tk["start"]: raise SystemExit("bad range " + k)
out = {"_about": "GB-239 (D-94): the weapons from Jerry's Real Firearms Sounds (and its Bullet Sound FX). Picked by analysis (onset, the -20/-30 dB tail, top-end share; qa/2026-10-26-GB-239/pack-analysis.tsv), not by ear: the listen page judges them. Shots end where their envelope is 30 dB down or at the cap in the why, whichever is first (the game adds distance and reverb). Sound rule: every shot and impact is impactful; foley and the whiz immersive. Family: military mechanical and close. Left to Jerry's or the synth: mortar-launch, flamethrower, chainsaw, knife/machete, grenade pin/bounce, mag-slap, mag-drop, pump-back/forward, slide-back, dry-fire, suppressor-on, laser-click, wheel-tick, shotgun-hull, belt-feed, heavy-turret-fire, the mortar crew, the katana's draw: the pack has nothing of their kind.", **P}
json.dump(out, open(r"docs\audio\packs\weapons.json", "w", encoding="utf-8", newline="\n"), indent=1, ensure_ascii=False)
print(len(P), sum(len(v["takes"]) for v in P.values()))


