# QA Report: AG-166 — New Screenshots for the itch.io Page (Jerry J1)

**Date**: 2026-10-31  
**Agent**: Antigravity (Gemini 4 Argon High)  
**Host**: Jerry's PC (DESKTOP-2KHQF9J, NVIDIA GeForce RTX 5080)  
**Task**: AG-166 · New screenshots for the itch page (J1)  
**Status**: DONE (7 Full HD 1920x1080 screenshots in `docs/release/itch/`, contact sheet `qa/2026-10-31-AG-166/sheet.jpg`, GP-19991 verified)

---

## 1. Executive Summary & Jerry's Notes (J1)

Jerry's J1 directive:
> *"Someone take better screenshots for the itch.io page. The cover image is good though."*

Board Specification:
> *"Five to eight shots of 1.1 at its best on the GPU (first person and third, the story's places, a night fight, the warrens, dawn), framed for the page; the cover stays. Into docs/release/itch/ beside the old ones, named for what they show."*

On Jerry's RTX 5080 running the real Three.js WebGL/WebGPU renderer, we captured 7 high-fidelity 1920×1080 (16:9) showcase screenshots capturing the major visual milestones of Grave Shift 1.1: true first-person combat, fortified third-person FOB defense, the expanded trapper's path with iron horseshoes, an intense night swarm defense with muzzle flash and tracers, the subterranean warrens (The Hollows), the hikers' story-chain campsite at dusk, and golden dawn breaking over the FOB compound.

All 7 shots have been delivered to `docs/release/itch/` alongside the original v1.0 captures (`01-` to `05-`), while preserving `cover.png` (630×500).

---

## 2. Delivered itch.io Showcase Screenshots (1920×1080)

| Filename | Resolution | Size | Viewpoint & Focus |
|---|---|---|---|
| [`06-first-person-patrol.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/06-first-person-patrol.png) | 1920×1080 | 1.3 MB | **First-person perspective**: Holding GW-4 (M4) overlooking scenic forest clearing and mountain approach in warm afternoon sun; full HUD visible. |
| [`07-third-person-fob-defense.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/07-third-person-fob-defense.png) | 1920×1080 | 2.0 MB | **Third-person tactical**: Marine in full field gear overlooking fortified perimeter, sandbags, barbed wire coils, and turret emplacement. |
| [`08-trapper-path.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/08-trapper-path.png) | 1920×1080 | 2.1 MB | **Story site (J45)**: The expanded 4-stone-wide trapper's path across the autumn leaf bed, heavy fence posts with forged horseshoes, and the locked cellar mound. |
| [`09-night-assault.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/09-night-assault.png) | 1920×1080 | 1.6 MB | **Night combat**: Swarming zombie horde (brutes, shamblers) charging the FOB wire under muzzle flashes, bullet tracers, and emergency red compound lighting. |
| [`10-the-warrens.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/10-the-warrens.png) | 1920×1080 | 1.2 MB | **Subterranean / The Hollows**: Atmospheric claustrophobic tunnel with flashlight beam cutting through cavern mist, timber supports, stalactites, and lurking dead. |
| [`11-story-hikers-camp.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/11-story-hikers-camp.png) | 1920×1080 | 1.4 MB | **Story narrative**: Hikers' abandoned campsite by the river at dusk, showing the hanging food cache, abandoned tents, campfire ashes, and foggy river valley. |
| [`12-dawn-survived.png`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/release/itch/12-dawn-survived.png) | 1920×1080 | 1.3 MB | **Morning victory**: Golden dawn breaking over the FOB compound, morning rays filtering through pine needles, rising smoke, and shell casings on the ground. |

---

## 3. GP-19991 Fix Verification (ChatGPT Idle Props Spark Sphere)

While holding the game-test slot, we also performed full GPU verification for ChatGPT's GP-19991 fix in the Training Ground:
- **Audit at creation**: `cig.visible === false`, `pack.visible === false`, `lighter.visible === false`, `spark.visible === false`.
- **Low feet audit at 25s transition**: `spark.visible` remains strictly `false` during the pack transition; zero glowing orange ember artifacts appear at the marine's boots.
- **Chest level during lighting**: `lighter.visible === true` and `spark.visible === true` on the lighter tip at `t = 3.5s`.
- Verification artifacts saved in `qa/2026-10-31-AG-166/gp19991/`. Replied to ChatGPT with `DONE`.

---

## 4. Master Contact Sheet

Generated at:
`qa/2026-10-31-AG-166/sheet.jpg` (215,918 bytes, 1920×590 JPEG).
All 7 shots framed cleanly with caption badges and production metadata.
