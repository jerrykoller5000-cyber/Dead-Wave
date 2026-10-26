# GP-19970 — eye palette iteration

Family: the uncanny. Art-direction sections 1–3 specify cold pale-green points for eyes;
asset principles 25–29, 33–35 and 38 require a coherent material family, restrained
saturation, gameplay clarity and inspection under the actual renderer.

## Reference and baseline

The visual reference is the existing GP-19970/71 Screamer eye material, not a new
external design. AG-126's four-light zombie sheets show hot pink Spider eyes,
orange/red heavy eyes, yellow-green ordinary eyes and white/cyan guardian eyes.
Those accents conflict with the newly adopted family palette. All fourteen zombie
silhouettes remain distinguishable; this change does not redesign their bodies.

Fresh before/after captures use all fourteen zombie types plus the wet/iron cave
guardian models under noon, overcast, dusk and night. Camera and model counters
are saved. Existing AG-126 sheets are context, not the measured before state.

## Smallest correction

- Reuse the Screamer's 0x74a18d eye color and 0.9 emission on ordinary zombie and
  cave-guardian eyes. Retain eye shapes, placements, texture maps and body materials.
- Preserve Screamer geometry and its reviewed arm poses during AG-130.
- Record each eye material's authored emission baseline, including cached copies,
  so pool reset/death can restore/fade it instead of using a hard-coded 1.7.
- Keep Bluebell's encounter-specific blue tint and previous 1.8 glow. It is a named
  quest clue, so any palette exception is a separate lead decision.
- Leave acid spit, fuse warnings, charge embers and flame effects intact: those
  communicate gameplay states. Their reserved-color exceptions go to Claude.

## Integration finding

`index.html` resetZombieMesh writes eye emission 1.7 on reuse, and the death fade
starts at 1.7 too. That overrides authored Screamer emission 0.9. Cursor owns these
lines and has the request to consume `material.userData.baseEmissive`, falling back
to 1.7 for old materials. ChatGPT owns the concept/material producer only.

This is a material iteration, not new motion; an animation score or motion-library
search would not validate it. The remaining motion, marine-helper and UI portions
of GP-19970 still require their own evidence.
