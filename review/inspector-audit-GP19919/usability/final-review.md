# GP-19919 — final independent source review

Reviewed the current inspector boot, input filter, show/cancellation and cleanup, the BAT and reusable server launcher, camera command reporting and held-frame lifecycle. No additional browser or Git operation was used. Runtime/API files were being refined by the runtime agent, so this review did not edit them.

## Findings

1. **P1 — focused native UI controls bypassed the stage lock (fixed in this subtask).** The global input filter allowed select/range/checkbox defaults before consulting the busy UI path. Pointer capture guards did not stop a keyboard-generated `input`/`change`, and those handlers wrote directly to stage/camera settings. During a check or note, a lens/backdrop/overlay keyboard change could contaminate the supposedly owned review frame. All toggle/select/range handlers now check availability before calling the setter and restore the actual readback if blocked or rejected. Speed, rewind and view-picker controls, view/Frame buttons, transport and Drive have the same guard. Note/search typing and safe Cancel/help remain available. Root is also guarding native-control keyboard dispatch before its typing pass-through.

   Evidence: `node --test review/inspector-audit-GP19919/usability/marine-controls.test.mjs review/inspector-audit-GP19919/usability/ui-controls.test.mjs` → **22 tests, 22 pass, 0 fail**. New tests dispatch the actual real-UI handlers across six focused control types while busy and verify zero mutations plus restored values; a second test verifies rejected asynchronous select/range setters restore values even while focused. `node --check studio/inspector/ui.js` passed.

2. **P2 — camera startup failure leaked owned resources (fixed following root authorization).** `Engine.open()` started its server and browser, then awaited page creation/load without a cleanup catch. A CDP timeout or inspector boot failure could retain resources when an imported caller caught and retried. Startup now wraps initialization in `try/catch`, closes partial ownership before rethrowing and nulls ownership on close. Closure tolerates missing or already-gone resources and repeated caller cleanup. Six new tests exercise server/browser/page/load failures, a throwing browser close and successful retain-until-explicit-close behavior; they evaluate the real exported class with lexical IO stubs, launching no browser.

3. **P2 — a boot retry retained stale failure state (fixed following root authorization).** `booting` resets after failure, allowing another `boot(host)` call, but the next start retained `window.DWInspectError` and the prior failure `#dwi` alert root. Startup now marks only its failure root and clears that marked root plus the stale error after validating a new host. A healthy ready inspector and an unmarked root are preserved. Two tests run the real failed-boot/validated-retry path up to the next initialization stage and check root/error cleanup and healthy-root protection.

4. **Documentation — the historical AUDIT.md overstates drift resistance (sent to root).** Its “There is nothing to drift” and “new things appear by themselves” claims are broader than the current curated catalog and input recipes. README.md correctly acknowledges that move recipes, catalog entries and environment assumptions still need maintenance. Keep the old measurements, but qualify the CL-196 conclusion or append the current audit so future agents do not mistake live builder reuse for complete, automatic coverage.

## Checks with no new actionable finding

- The launcher no longer kills a port owner. It verifies checkout, protocol version and loaded-code fingerprint; failed identity uses a different owned port. Readiness is bounded, a crashed launch lock has expiry, and background server processes use hidden windows.
- Camera command reporting uses `ok:false` to set a nonzero exit status; broken check cases and unmatched selections fail explicitly. Same-origin JSON job checks avoid granting unrelated browser pages eval/file-output control.
- Subject selection validates IDs/variants/modes, uses selection tokens and abort signals, and checks whether a late asynchronous model is still current before adding it to the scene. Fresh model resources are released when superseded.
- Held-frame publication/resume clears the bounded 2D presentation surface. Native picture correctness remains root's evidence; this source review does not independently claim GPU verification.

Root received the remaining findings through crew collaboration messages; final integration status and proofs belong in the GP-19919 handoff.

Startup evidence: `node --test review/inspector-audit-GP19919/usability/startup-cleanup.test.mjs` → **8 tests, 8 pass, 0 fail**. `node --check tools/camera.mjs` and `node --check studio/inspector/inspector.js` passed. This subtask did not alter existing test assertions; the automation agent updated held-shot/recipe fixture mocks to satisfy new real viewport/metadata contracts while retaining their assertions.
