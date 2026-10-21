# ElevenLabs sound batch

## Batch 3 — PROMPTS-3.md

Double-click **Generate batch 3.cmd** for all 84 sounds, four takes each: **336 clips**. Or use **Start batch 3.cmd** for the three-sound sample, all 20 starred sounds with one take each, or plan only. Type YES only when you want to generate, then paste your API key into the hidden prompt.

Batch 3 saves into **Generated-3/**, with ten category folders and the same sound names as the supplied file. Its receipts stay in Generated-3/.elevenlabs-progress.json. Batch 2 still uses Generated/ and its original launchers, manifest and progress. Resume with the launcher for the batch you started.

All 84 prompt texts, statuses, durations, priorities and loop flags match both Claude outputs/PROMPTS-3.md and the independent z-sounds/manifest-3.json. There are nine looping sounds. Four sounds request less than 0.5 seconds; their sixteen takes generate at 0.5 seconds for you to trim by ear.

The full estimate is 17,040 credits; the three-sound sample is 140 credits. These are estimates using the existing published-rate calculation; your account pricing determines actual charges. No paid requests are made during setup or plan-only checks.

manifest-3.json freezes the new source; plan-3.json lists all 336 clips. prepare-3.mjs refreshes only those batch 3 files. Preparing this batch does not integrate audio into the game or build the features mentioned in the source notes.

For batch 3 CLI selections and recovery, add BOTH --manifest "C:/Users/Zero/Desktop/Tiny Trek/review/elevenlabs-batch/manifest-3.json" and --output "C:/Users/Zero/Desktop/Tiny Trek/review/elevenlabs-batch/Generated-3" to the commands below. The runner requires a separate output when selecting another manifest.

## Batch 2 — PROMPTS-2.md
Open **Generate full batch.cmd** to generate the full selection directly, or **Start batch.cmd** for the menu. Node.js is already installed on this PC. There are no packages to install.

The menu offers:

- **Sample:** the first three starred sounds, one take each. Estimated 30 credits.
- **Priority:** all 39 starred sounds, one take each.
- **Full batch:** all 179 sounds, four takes each: 716 separate clips. Estimated 26,880 credits.
- **Plan only:** inspect the full batch without contacting ElevenLabs.

The launcher shows the remaining estimate and asks before generation. Enter your ElevenLabs API key in its hidden prompt. The key stays in that process session; it is never saved in a file or printed. In ElevenLabs, open Developers, then API Keys, and create a key with Sound Effects access and an optional credit limit. [Official key setup guide](https://help.elevenlabs.io/hc/en-us/articles/14599447207697-How-do-I-authorize-myself-using-an-API-key).

## Files and takes

Clips go into **Generated/** inside this folder, using the same 12 categories and 179 sound folders as your source. For example:

`Generated/player/footstep-dirt/01_eleven_<prompt-fingerprint>.mp3`

All audio is MP3, 44.1 kHz / 128 kbps. The API generates one take per request, so four takes means four requests. Prompt influence is 0.6; loop flags and all prompt wording are preserved. Takes are generated in rounds: one of every selected sound, then a second of every sound, and so on. Starred sounds come first.

23 prompts request less than the API's documented 0.5-second minimum. Those generate at 0.5 seconds and are **not automatically trimmed**; both requested and generated durations are recorded. That is 92 adjusted clips in the full four-take batch. Trim by ear if desired, so the transient/tail is preserved.

The attached `Claude outputs/PROMPTS-2.md` was parsed and independently compared with `z-sounds/manifest-2.json`: all 179 folder names, prompts, durations, loop and priority flags match. `manifest.json` is the frozen batch source; `plan.json` contains the complete four-take plan. Narrative instructions outside prompt blocks were not executed.

## Pause and resume

Press **Ctrl+C** to stop. Launch again and choose the same selection to resume. Completed clips are skipped only after their size and SHA-256 match the progress record. Existing recordings are never overwritten. A lock prevents two runners using the same output folder at once.

The launcher now continues past fully completed clips that were moved out for editing. It shows their count and skips them without charging again. Their saved receipts stay intact. Interrupted requests and changed files still require review. The strict CLI default remains available; launcher uses `--allow-moved-clips true`.

Windows can briefly lock the progress file during replacement. The runner now retries that same local save up to about five seconds, without repeating the paid request. If the save still fails after audio arrives, it preserves the MP3 and its temporary receipt. On the next launch it reconciles matching receipts and audio; ambiguous requests remain paused. Keep `.elevenlabs-progress.json.*.tmp` files until recovery is complete.

On 2026-10-10, a failure after70 new clips left one completed wheel tick in a temporary receipt but no local audio. That take was retrieved through ElevenLabs Sound Effects History, and its website192kbps export was verified by the exact prompt/single take/duration. The original128kbps receipt/hash and charge are preserved beside the recovered hash. All74 completed clips now verify;642 remain. Sound effects are excluded from the official History API, so this recovery used the website. [Official History API limitation](https://elevenlabs.io/docs/api-reference/history/list).

Progress lives in `Generated/.elevenlabs-progress.json`. Keep it with the clips until the batch is complete. The file records requests before they are sent, completed audio hashes, reported charges when available, and uncertain results. The API key is never stored there.

Explicit rate limits retry up to three times with a bounded wait. Authentication, quota and other rejected requests stop the batch. A lost connection, server error or interrupted download may mean ElevenLabs already generated and charged for the clip. Those requests **are not automatically repeated**; the batch stops so you can check ElevenLabs History.

If History has the matching take, download it as MP3, then recover it without paying for another generation:

```powershell
node "C:/Users/Zero/Desktop/Tiny Trek/review/elevenlabs-batch/run.mjs" recover --clip "player/footstep-dirt/01_eleven_<actual-fingerprint>.mp3" --from "C:/path/to/download.mp3"
```

Use the exact clip ID from the progress file and verify the downloaded take matches its prompt. Recovery never overwrites a different existing recording. If no generation appears in History, leave the uncertain record intact and ask for a deliberate retry/reconciliation; the runner will not assume no charge occurred.

## If ElevenLabs rejects a request

The launcher now displays ElevenLabs’ error code and explanation for rejected requests, with echoed API keys removed. A generic HTTP 400 from the earlier launcher did not save the explanation, so its cause cannot be reconstructed. Open Start batch.cmd again and choose the three-sound sample. If it stops, send only the new error line for diagnosis. Existing successful clips remain intact; rejected requests stop rather than automatically repeating. Do not delete the progress file.

## Costs and limits

Estimates use the published Sound Effects API help rate of 20 credits per specified second, or 100 for Auto. This source has no Auto entries. Rates and account pricing can change; the estimate is **not a guaranteed invoice or hard account spending cap**. The runner checks the selected remaining estimate against the confirmed limit before making any calls, records `character-cost` when returned, and stops before another request if reported spending would exceed that limit. One returned charge can exceed its estimate. Set a spending/credit restriction on the ElevenLabs key itself for an account-enforced limit.

Sources checked 2026-10-10: [API parameters and 0.5–30s range](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert), [published API credit rates](https://help.elevenlabs.io/hc/en-us/articles/25735337678481-How-much-does-it-cost-to-generate-sound-effects), [API setup](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/sound-effects).

## Optional selections

These commands inspect plans without spending credits:

```powershell
node "C:/Users/Zero/Desktop/Tiny Trek/review/elevenlabs-batch/run.mjs" plan --scope priority --variants 1
node "C:/Users/Zero/Desktop/Tiny Trek/review/elevenlabs-batch/run.mjs" plan --group weapons --variants 4
```

For direct generation, set `ELEVENLABS_API_KEY` in your session and use `generate` with `--max-credits <confirmed-estimate>`. The launcher handles that for normal use. If editing the original Markdown later, run `prepare.mjs` again to rebuild after checking the independent catalogue; changing a prompt or generation setting produces a new fingerprint rather than overwriting an old take.

## Bringing them into the game

Listen and edit the staged clips first. Then the category folders can be copied into `z-sounds/`. The 179 non-zombie folders are planned in the game, but are **not yet wired to play**; Claude's CL-155 handoff says each needs integration when takes are ready. Preparing or generating this batch does not replace current game audio or automatically enable those sounds.

## Verification

Offline tests cover exact source parsing, API settings, output paths, budget gating, resume hashes, never overwriting audio, locks, rate limits, errors, interruption and History recovery. The network is simulated in all tests. No real audio has been generated and no ElevenLabs credits have been used while preparing this tool. Actual account access, billing and audio quality need the first sample run.
