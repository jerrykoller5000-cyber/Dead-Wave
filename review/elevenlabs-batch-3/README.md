# ElevenLabs sound batch 3 (CL-161)

Both launchers and the CLI now use the shared, resumable runner in `review/elevenlabs-batch` (GP-189), pointed at batch 3:
`Claude outputs/PROMPTS-3.md` (84 sounds, 20 starred, 336 takes). The full readme, with pause, resume and recovery,
is `review/elevenlabs-batch/README.md`; everything there works the same here.

- **Generate full batch.cmd**: all 84 sounds, four takes each. Estimated 17,520 credits.
- **Start batch.cmd**: the menu (a 3-take sample, the 20 starred, the full batch, or plan only).

Clips and paid receipts stay in `review/elevenlabs-batch/Generated-3/`. Both launcher folders use that same output, including the 320 takes already completed. Only the four added sounds (16 takes) remain; completed/moved clips are skipped without another charge.
When they're done, tell Claude, and they go into the game the way batch 2's did.

`manifest.json` and `plan.json` were made from PROMPTS-3.md with the tool's own `parsePrompts` and `makePlan`.
Batch 1's folder and its progress file are untouched.
