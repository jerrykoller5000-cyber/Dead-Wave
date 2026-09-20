# Graphics and rendering

## Running on the right GPU

`Play Dead-Wave.bat` opens the game in its own Edge window with `--force_high_performance_gpu` and
its own profile (`%LOCALAPPDATA%\TinyTrek\Browser`). On a laptop with integrated plus NVIDIA/AMD
graphics, Chrome and Edge otherwise run on the integrated chip (Chrome ignores the page's
`powerPreference` on Windows, [crbug.com/369219127](https://crbug.com/369219127)) and the game runs
about 3x slower. The separate profile is what makes the flag stick even when Edge is already open.
Without Edge installed the launcher falls back to the default browser.

The permanent alternative is Windows Settings > System > Display > Graphics > (your browser) >
High performance.

## Graphics quality

Settings > Low / Medium / High / Max. It is picked automatically on first run (Intel integrated
gives Low, anything else gives High) until you choose one, and your choice is remembered. It
applies live: resolution, shadow resolution and ground-cover distance switch instantly; MSAA and
bloom rebuild the post chain; turning the sun's shadow on or off rebuilds the lit shaders, so the
first fight after that can hitch once or twice. A fresh launch compiles everything up front as usual.

| Preset | Render scale | MSAA | Bloom | Sun shadow | Ground cover |
| --- | --- | --- | --- | --- | --- |
| Low | 0.60 | off | off | off | 55 m |
| Medium | 0.65 | off | on | 1024 | 95 m |
| High | 1.00 (up to 1.5x) | 4x | on | 2048 | all |
| Max | 1.00 (up to 2x) | 4x | on | 4096 | all |

Render scale is a fraction of native device pixels.

Measured at 1536x794 (1.25x DPI), real Edge, fight / calm, fresh load per preset, midday:

| GPU | Result |
| --- | --- |
| Intel UHD (integrated) | Low 82 / 91 fps and Medium 63 / 70 (30 zombies); High 32 / 34 (14) |
| RTX 4050 Laptop | every preset 98-144 fps with 14 zombies (144 Hz display cap) |

On the integrated GPU, cost tracks pixel count (about 6.4 ms fixed plus 6.9 ms per megapixel).
MSAA adds about 5.7 ms at 1920x992, sun shadows about 1.6 ms, bloom about 1.1 ms. The CPU side
stays at 5-10 ms a frame even in a fight, so the game is GPU-bound there, not draw-bound.

## The renderer

Dead-Wave runs on Three.js `WebGPURenderer`. Given WebGPU it uses it; without it the same renderer
falls back to WebGL2 on its own: one renderer, two backends, one set of materials. The backend
that actually came up is printed in the debug overlay. The Three.js version is one line at the top
of `index.html`, in the import map.

### Rules for adding effects

A node renderer rebuilds every lit material's shader whenever the set of lights in the scene
changes, and it tracks per-object state that a WebGL renderer barely noticed. Three habits that
were nearly free before are expensive here, and all three are avoided on purpose:

- **The scene's light count never changes.** One shared muzzle light (not one per gun), a fixed
  four-light pool that ground fire and decoy beacons borrow from, and a flashlight built at load
  rather than on first press.
- **No `material.needsUpdate` at runtime.** Canopy fade and puddles swap material references
  instead, which is what `needsUpdate` was being used to fake.
- **Nothing is added to or removed from the scene during play.** Tracers, casings, blood, debris,
  gibs, motes, ripples, ground fires, acid and every projectile come from pools: parked hidden
  when they expire, taken back out when needed. Their materials come from bounded pools too, so
  colour varies by `setHex` on a uniform rather than by minting a material.

There is also a pipeline warm-up at load (everything hidden is compiled once up front), which is
why startup pauses for a beat.

So if you add effects: reuse materials, pool meshes, never add or remove lights at runtime, and
avoid `material.needsUpdate` outside of load.

### Shader variants and the random hiccup

This renderer compiles a separate shader for each combination of material settings it sees
(transparent or not, vertex colours or not, emissive intensity zero or not, and so on), about
30 ms each, on the frame it is first needed. It **throws that shader away** the moment the last
material using it is disposed.

So a staged fight runs behind the start menu at load (canvas hidden) to compile everything a real
fight uses, and nothing transient is ever disposed: severed limbs share the body's materials,
leaves and shotgun shells are pooled, bodies are always recycled. If you add an effect, pool its
material, never dispose it, and add it to `preRollFight()` so it compiles at load.

The `?debug=1` overlay shows `worst` (longest frame in the last window, in ms) and `hitch`
(running count of frames over 50 ms). Those are read from the raw wall clock, not from the
simulation's dt, which is clamped. If stutter comes back, that counter is the thing to watch.

### How the scenery is drawn

- **Tree canopies** are merged geometry: one vertex-coloured mesh per canopy instead of one per
  leaf blob, with each blob's vertex range remembered so it can still be shot off on its own (its
  vertices collapse to a point). An `InstancedMesh` version was tried first and backed out: on a
  real GPU every same-sized canopy drew with the first one's matrices.
- **Water waves** run on the GPU as a TSL `positionNode`. The position buffer is written once at
  load and never touched again; only a time uniform changes. The CPU path is still there as a
  fallback, distance-gated to 130 m, and takes over automatically if the node material fails to build.
- **Ground cover** (grass, bushes, ferns, flowers, mushrooms, twigs) is merged into 30 m cells,
  about 270 draws instead of about 2,500, with the wind sway done in the vertex shader from a
  per-vertex weight.
- **Zombie bodies** are compacted from about 31 meshes to about 15: every rigid segment between
  joints is one vertex-coloured mesh, and every joint still moves.
- **Post-processing** is a threshold bloom over the whole frame. Fire, muzzle flashes, tracers,
  lasers, zombie eyes and the kiosk screen are pushed above 1.0 so only they bleed; the low-poly
  mid-tones do not.

## URL switches

Append to the page URL, for example `index.html?debug=1`.

| Switch | Effect |
| --- | --- |
| `?debug=1` | Perf overlay (backend, FPS, worst frame, hitch count, draws, tris) and `window.TT` |
| `?renderer=webgl` | Force the WebGL2 fallback, for A/B-ing a suspected WebGPU problem |
| `?sky=flat` | Skip the node-graph sky and use a plain coloured dome |
| `?canopy=legacy` | Go back to one mesh per leaf blob |
| `?water=cpu` | Go back to the CPU water wave (if the GPU wave looks wrong) |
| `?foliage=legacy` | Go back to one mesh per grass tuft (no GPU sway) |
| `?post=off` | No bloom |
| `?raf=timer` | Debug only: drive frames from a timer so the game keeps running in a hidden tab (browsers stop `requestAnimationFrame` there) |

They combine. `?renderer=webgl&sky=flat&canopy=legacy&water=cpu&foliage=legacy&post=off` is the
whole pre-WebGPU rendering path with the new gameplay on top.
