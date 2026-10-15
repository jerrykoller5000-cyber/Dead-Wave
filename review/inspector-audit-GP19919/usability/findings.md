# GP-19919 — inspector usability and motion desk audit

Audited the live CL-196 inspector, the preserved AG-75 inspector controls, the catalog and its extension guide. This subtask changed only `studio/inspector/ui.js`, `marine.js` and `inspector.css`; production game animation code was not changed.

## Proven defects corrected

1. **Live move and loop state were copied once.** `Object.assign` evaluated the accessor values, leaving `marine.move` permanently null and `marine.loop` permanently true. UI selection, loop readback and note move context were incorrect. Real accessor descriptors now read the running desk. The direct getter and loop-off tests fail on the original behavior.
2. **Stopped moves could keep issuing input later.** Grenade, dive, aimed fire, prop mount/carry, medpen and other sequences awaited uncancellable game-time promises. A previous move could throw/fire/vault after another subject was selected. Every pending sequence now uses the desk's AbortSignal; stop aborts before releasing input. Grenade input is tracked and uses the existing game blur handler to cancel charging before releasing G. Root's `ix.waitGame(sec, signal)` provides prompt cancellation.
3. **Held animation phases leaked between inspections.** Stop and switching subjects did not release gait, reload, knife, draw or grenade overrides. Active holds are tracked, validated, read back to the controls and released together. Values are finite and constrained to the control's phase/seconds domain.
4. **A corrupt browser setting could prevent boot.** An unchecked JSON parse and invalid persisted tab could throw or display an empty pane. Group lists and tab choices now use safe validated defaults; the real UI is tested with both damaged entries.
5. **View controls accumulated stale callbacks.** Every B/J/X/W/G redraw retained the former panel's toggle refreshers. Callbacks now have a view scope that is replaced on redraw. The real UI test redraws the panel 100 times and verifies one live set is refreshed.
6. **Failure messages could lie or lose the note.** Clipboard writes were unawaited but reported as copied. Failed note persistence cleared the draft even when clipboard copying failed. Notes now use the shared API capture/save transaction, suppress duplicate submissions, await fallback clipboard copying and preserve unsaved drafts.
7. **Setup failures silently continued a move.** Failed gun setup previously toasted but still ran subsequent input. It now stops, records the error, rejects the explicit caller and avoids triggering the run. Expected cancellation is quiet.
8. **Controls hid their state.** Blade selection defaulted to machete for a knife; move highlighting relied on the frozen getter; slider readback stayed zero; non-preset API speeds left the speed selector blank. Readbacks now reflect the desk and custom finite speeds. Pending buttons/selects visibly wait and asynchronous errors are caught.
9. **Keyboard and narrow-window usability needed work.** Subject/group rows are now focusable native buttons, with visible focus states; a compact view picker remains available when wide bookmark buttons are hidden. Help can scroll within a small viewport. Root owns the global key filter fix that lets focused buttons and ranges use native keyboard controls.
10. **Batch checks could be corrupted by manual changes.** While root's API owns a stage transaction, ordinary UI stage mutations are blocked. The operation label and Cancel/Escape remain available. Sheets keep chrome visible so the user can cancel rather than waiting behind a hidden toolbar.
11. **Crew-served weapons leaked into subsequent moves.** Root's native 48-move check found that Stop after M240 carry left the weapon carried and its placement ghost active. The desk called an unexported `T.setDownMortar`. It now falls back to the existing canonical `T.m240VisDbg().setDown`, tracks the fresh piece created during set-down, removes only live owned props, and refreshes the canonical ghost preview. Mount/shoulder success is explicitly checked. Stopping knockout also restores captured live body-group transforms, clears wake/blackout and ends the knockout audio through its existing hook.

## Validation

`node --test review/inspector-audit-GP19919/usability/marine-controls.test.mjs review/inspector-audit-GP19919/usability/ui-controls.test.mjs`

Result: 20 tests, 20 pass, 0 fail. Tests execute the real desk and UI (a small DOM fixture), cover destructive timing races, invalid persistence, setup files, owned crew-served replacements and knockout cleanup, and do not change any existing suite expectation.

`node --check studio/inspector/ui.js` and `node --check studio/inspector/marine.js` passed. Native GPU screenshots, layout, animation continuity and the full existing suite are root's validation, not verified by this subtask.

## Reproducible human review setups

The View panel now has Save setup and Load setup. Save downloads one versioned JSON recipe via `api.session()`. Load uses a local `.json` picker and rejects oversized (64 KB limit) or malformed JSON before the validated `api.restore()` can change the stage. API rejection is shown; the current setup is preserved by the API's validation/rollback contract. The file picker resets so a revised file can be loaded again. Help and the controls say that the recipe saves subject, kit, view and lighting and restarts the active move; it is not a simulation checkpoint. Three UI tests cover the downloaded versioned recipe, pre-restore rejection and repeat loading.

## Coverage and maintenance findings sent to root

- The live game builder approach is the right foundation: the old inspector copied its own pose/model implementation. Keep the new inspector authoritative and retain the old file only as a reference.
- The catalog is curated, not literally every in-game object or animation. At audit time build kinds were hardcoded and omitted gate/M240; window/door wall states and valley-dependent actions need explicit coverage or a truthful exclusion list. A new weapon/type can derive from the game's tables, while a new prop still requires a catalog/host entry.
- Duplicate catalog IDs were silently renamed. Stable agent IDs should be validated rather than renamed based on list order. Runtime subtask owns catalog corrections.
- The current test's broad build pass verifies one initial variant. It does not prove all build tiers, zombie modes, move completion, rewind fidelity or every wardrobe/weapon combination. Root's native audit and expanded checks need to make coverage explicit.
- Root should document the visual rewind's actual limitations, stable subject transactions, cancellation and structured capture context. Transform history alone is not a complete replay of simulation, material or deforming-buffer state.

No Git operations, browser launch or crew check-in were performed by this delegated subtask.
