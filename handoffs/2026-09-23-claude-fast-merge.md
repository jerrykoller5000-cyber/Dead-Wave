# Claude — Phase 1, step 2a: faster mergeParts — 2026-09-23

Changed:          mergeParts, which merges part meshes into one for foliage chunks, POIs,
                  trees and rocks, now reads plain Float32 attributes straight from their
                  arrays instead of making per-vertex Vector3 calls and toNonIndexed() copies.
                  The output is bit-for-bit the same. This is a patch only; it hasn't been
                  applied because of the split freeze.
Files:            handoffs/claude-phase1-loader/merge.diff (against index.html at mtime
                  1790186021983; independent of loader.diff, and the two apply one after the
                  other, checked)
                  handoffs/claude-phase1-loader/patch_merge.py (applies the same change by
                  exact anchors)
Tests:            Same output: all 4,619 merges in one load hash identically before and
                  after (position, normal and colour words; 1.2 M vertices).
                  Full harness: see "Regression" below.
Screenshots:      None needed: the geometry is identical by hash.
Not verified:     The speed-up was measured on the headless harness with the stand-in
                  three.js, not with real three.js on Jerry's PC.
Requests:         None.
Contract changes: None.

## Timing

This is the time from "terrain built" to "ready" in the harness, over two runs each.

| | Run 1 | Run 2 |
| --- | --- | --- |
| Before | 12.08 s | 11.85 s |
| After | 6.52 s | 6.45 s |

That is about 46% less. Most of the saving is in the foliage stage (3.8 s to 0.7 s) and
the POI and foliage-chunk stage (5.0 s to 3.0 s).

Real three's attribute getters differ from the stand-in's, so the real saving on Jerry's
PC will be different. Cursor's timing run will settle it.

## How it stays identical

The fast path uses the same arithmetic as `Vector3.applyMatrix4`, `applyMatrix3` and
`normalize` in three r175, in the same order: the perspective divide, then the normal
matrix, then multiplying by `1/length`. The results are stored into the same Float32
arrays.

An indexed geometry is read through its index, which gives the same vertex order that
`toNonIndexed()` produced.

Anything else keeps the old path unchanged. That covers interleaved or normalized
attributes, non-Float32 arrays, and an item size other than 3.

## Regression

I ran all 47 harness checks (t0–t45 and tfish) before and after, on the file from before
Cursor's vendoring. The patch applies unchanged to the vendored file. Every file gave identical
PASS and FAIL counts and identical page errors: 215 PASS lines both times. The failures
are the known ones listed in the harness README.
