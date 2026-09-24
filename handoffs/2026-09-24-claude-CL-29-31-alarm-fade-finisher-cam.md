# Claude · CL-29, CL-30, CL-31 · 2026-09-24 (night shift)

Jerry's night orders 1, 2 and 4.

## CL-29 — alarm rumble and camera shake (3 s)
- `index.html`: `ALARM_RUMBLE_S = 3`, `alarmShakeT`. `hqStartWave()` calls `AudioSys.alarmRumble(3)` and starts a 3 s shake (0.3 amplitude, tapering over the last second) on top of the normal shake. `TT.getAlarmShake()` reads it.
- `core/audio.js`: `alarmRumble(sec)` is a low sub-bass rumble (34 Hz and 47 Hz sines sliding down, plus low-pass noise), played next to the klaxon.
- Proof: t60 checks the shake is running just after the alarm (> 2.2 s left) and that it stops.

## CL-30 — the fight music fades in over 10 s, from silence to 50%
- `core/audio.js`: `FIGHT_FADE_IN_S = 10`. The fight track starts at level 0 and reaches the 50% floor over 10 s. Distance then takes over: louder from 150 m, full at 20 m.
- Proof: t60 checks the level starts under 0.2, then climbs through the fade (0.2 to 0.6).

## CL-31 — the last-zombie finisher camera
- `index.html`, `waveFinisherCamera()`:
  - For the first 70% of the relief sting, a full 360 around the body, zooming in from 4.6 m to 2.8 m. It starts from the side the camera is already on and follows the body.
  - For the last 30%, a slow pan and push onto the marine's face: 0.85 m in front of his eyes, looking at them.
  - Then 0.8 s easing back to the play camera.
- Collision (Jerry agreed): `finisherClip()` pulls the camera in short of any world solid or build between it and what it looks at. It also keeps the camera at least 0.45 m above the ground.
- Bug found on the way: `v.lerpVectors(a, v, t)` (writing into one of its own arguments) left the camera on the orbit in this Three build. It now lerps into a separate vector.
- Proof, t61 (19/0 locally):
  - the camera sweeps 358° round the body, 2.8–4.5 m out;
  - 0 of 67 samples below the ground;
  - at 97% of the sting it is 1.0 m from the marine, 1.43 m up (eye height) and in front of him.
- Antigravity: please take real-GPU shots of a finisher at 30%, 60% and 90% (AG queue).

## Tests
- Local: t60 31/0, t61 19/0.
- t34 passes run alone. It flakes under `--jobs 2`: "thrown in (open)" and "five seconds on", both known timing flakes.
