# Cursor — vendor three.js (Phase 0, step 1) — 2026-09-23

Changed:          three.js 0.175.0 and the one addon the game imports now live in
                  `vendor/three/`, and the import map points at them. The two Google fonts
                  are self-hosted in `vendor/fonts/` for the same reason. The game loads
                  with no external requests at all.
Files:            `index.html` (head: font link; import map and its comment),
                  `vendor/three/{three.core.js,three.webgpu.js,three.tsl.js}`,
                  `vendor/three/addons/tsl/display/BloomNode.js`,
                  `vendor/fonts/{fonts.css,*.woff2}`
Tests:            npm test → not wired yet (step 3). Verified instead by loading the game
                  and reading `performance.getEntriesByType('resource')`: 17 resources,
                  all from 127.0.0.1, `external: []`. Title screen reached, no page errors.
Screenshots:      none — `tools/shoot.mjs` is step 2. No visual change is intended: same
                  library version, same two typefaces.
Not verified:     I did not physically disconnect Jerry's network. The resource-timing audit
                  is the evidence: every subresource, including the module graph, the addon
                  and the fonts, resolved to 127.0.0.1 and nothing external was requested.
                  Also not checked on the WebGL2 fallback path (`?renderer=webgl`) or with a
                  cold browser cache.
Requests:         ChatGPT — the two typefaces are now served from `vendor/fonts/fonts.css`
                  instead of fonts.googleapis.com. Same faces (Black Ops One, Chakra Petch
                  400/500/600/700), latin + latin-ext subsets only, so any non-latin glyph
                  you add would fall back to a system font. Shout if you need more subsets.
Contract changes: none.

## Notes

`three.webgpu.js` pulls in `./three.core.js` beside it, and `three.tsl.js` and `BloomNode.js`
import the bare `three/webgpu` and `three/tsl` specifiers, so all four import-map entries have
to be present and agree. There is one `import 'https://greggman.github.io/...'` inside
`three.webgpu.js`, but it sits in a `/*// debugger tools ... //*/` comment block and is inert.

Font sizes: 10 woff2 files, 132 KB total; only 6 are fetched on the title screen (the browser
takes the subsets it needs for the glyphs on screen).

To regenerate the vendored fonts after a typeface change, from the repo root:

```
curl -sSfL -A "<a desktop Chrome UA>" \
  "https://fonts.googleapis.com/css2?family=Black+Ops+One&family=Chakra+Petch:wght@400;500;600;700&display=swap" \
  -o gf.css
# then, for each @font-face block whose subset comment is latin or latin-ext:
# download its woff2 into vendor/fonts/ and rewrite the url() to the local filename.
```

To bump three.js: replace the files in `vendor/three/` with the same set from the new release
(`build/three.core.js`, `build/three.webgpu.js`, `build/three.tsl.js`, and
`examples/jsm/tsl/display/BloomNode.js`) and leave the import map alone.
