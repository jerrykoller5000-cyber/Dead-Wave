# GP-176 · Zombie voice listening revision

Open `index.html` in a browser to audition 101 before/after samples at the game's actual mixer level. The old source is preserved in `before-core.txt` and `before-profiles.txt`; the old voices are rendered through their own module, not through the new recipes. No downloaded samples or dependencies were added.

Jerry's directions are implemented in `ui/zombie-audio.js` and the zombie-only synthesis section of `core/audio.js`:

- Shambler: several octaves lower, broad chest growl through every state.
- Feral: lower angry barks and torn screams.
- Leaper: approved throat retained, irregular movement shrieks and short tissue clicks.
- Spider: layered airy hissing throughout, replacing electronic pitched clicks.
- Drowned: approved throat and bubbles retained, quiet extra gurgles.
- Military: gruff lower syllables in bickering bursts.
- Brute: deep chest resonance and snarls.
- Spitter: boiling liquid, sputtering pops and acidic hiss; no shared vocal throat.
- Screamer: a much louder ragged death-whistle scream with unstable breath and pitch.
- Bomber: steady low throat drone and overtone resonance.
- Demon: rough bass roars; distinct intake, rising bark and explosive charge roar.
- Colossus: very low roots, slow labored breath and bass-heavy actual footsteps.
- Guardian: guttural huffs and hoots followed by ragged rising predator shrieks.

All five states (idle, chase, attack, hurt, death) are covered for all 14 types. Cave guardian retains its previous vocal-fold specifications. No AI, damage, motion, world seed, weapon mix or music changes.

## Verification

`node --test ui/zombie-audio.test.mjs ui/training-audio.test.mjs`: 12 passed, 0 failed.

`npm test -- t24 t210 t220 t215 --jobs 1`: four checks, 43 passed, 0 failed. The old sceneCull preflight blocker has been fixed by Cursor; this run passed preflight. Chrome requires the reviewed offscreen launch outside the filesystem sandbox on this host.

`node review/zombie-audio-v2/render.mjs`: 26 old idle/attack samples, 70 revised state samples, three special cues, two crowd mixes and four Training routes passed. Every render is audible, finite and unclipped; zero browser errors. Worst single peak 0.5165; mixed rapid deaths peak 0.8493. The drive curve is symmetric and texture/excitation paths reject DC. Cached noise and saturation curves avoid regenerating these buffers for each voice.

`node review/zombie-audio-v2/gameplay.mjs`: 14 actual first-hit, fatal death and unrewarded-death paths passed. Fatal damage produces no extra pain voice. Eight actual attack mechanics passed; actual leaper movement and colossus steps emitted their new cues. Training is audible, mute works, zero browser errors.

`node review/zombie-audio-v2/final-gameplay.mjs`: actual main-game screamer special emits the revised attack voice (1), with zero legacy scream calls. Isolated real-GPU 48-body sample: 60.38 FPS muted, 58.90 voiced, with six actual cries during the voiced sample. This short sample is 2.45% lower and does not establish sustained 60 FPS acceptance. The original concurrently loaded run was 40.18/42.98 FPS and should not be used as a performance result.

`node review/zombie-audio-v2/load.mjs`: one baseline/revised title pair, 9.131/9.708 seconds, both below 15 seconds, no errors. The revised sample is 0.577 seconds slower. One load each and different cache states cannot establish unchanged cold/warm performance.

Machine: real RTX 5080 through ANGLE Direct3D11, 1440×900. Proof files: `render-proof.json`, `gameplay-proof.json`, `final-gameplay-proof.json`, `load-proof.json`.

Full game suite and sustained standard-view hardware acceptance were not run. Human audition is still needed to assess realism, intensity and crowd balance; waveform metrics cannot prove a voice is frightening. Antigravity has been asked to listen to this replacement gallery, especially the screamer.
