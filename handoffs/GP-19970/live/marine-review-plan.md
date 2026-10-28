# GP-19970 — marine helper evidence batch

Family: military. Scope: the fitted balaclava, flexible shirt waist and their attachments during the game's existing movement. No model or motion changes in this batch. The supply-terminal integration request remains with Claude and does not block gathering this evidence.

Use the supported inspector API on the actual live marine, never a copied rig. Discover its version and moves before selecting them. Compare light pistol kit and full M4/helmet/vest/pads kit. The mask is the game's always-worn fitted balaclava; the inspector wardrobe path supplies its material.

1. Geometry/material views: head and torso bookmarks under noon, overcast, dusk and night, both kits (16 shots).
2. Motion/contact views: actual walk, crouch-walk and turn-left, paused and advanced by 15 inspector frames between four samples; head and torso views, both kits (48 shots). Use recorded time/recipe metadata to inspect fit across the sequence. These are observation samples, not a claim to cover every possible move or an exact loop boundary.
3. Context: use Drive and the real running game clock for 900 ms of each move. Pause, record the actual first/third-person camera and pose, exit Drive, then pin that observed camera through the public API before the capture job (24 shots, noon/night, both kits). Inspector jobs cannot run in Drive; do not call stepAsync or shot there. Record the view flag and observed game time, without labelling the wall-clock sample as exactly45 simulation frames. The first-person head being hidden is intentional; these views check intrusion into the camera rather than certify external head shape.

The native batch produces 88 original game captures plus discovery/recipe/state metadata. No extra game instance or worker; run through the native machine-wide slot. It closes the browser and releases the slot in finally, including failures. Captures and error-free execution alone do not establish visual acceptance.

Review in geometry, materials and context order. Name visible defects and their asset/animation principle before editing any helper. Score applicable asset categories only after looking; preserve unverified motion/contact categories explicitly. Motion changes, if needed, follow the reference-first construction protocol and request the movement owner where the defect is outside these helpers.

First collection attempt:32 light-kit inspector images, then collector error on stepAsync while Drive was active. failure-drive-first.json retains that error; no page errors. The retry uses the supported exit-Drive sequence above. Also set uniform m81 before the explicit coyoteBrown mask material so the global camo operation does not overwrite the selected mask. This changes the review fixture only.
