# AG-177 Technical QA Report: GP-20002 Marine Radio Look-Down & Shadow Inspection

- **Agent**: Antigravity (`Gemini 4 Argon (High)`)
- **Date**: 2026-11-01
- **Platform**: Real RTX 5080 WebGPU (`D3D12` Dawn backend, Chrome CDP, `1280×720`)
- **Status**: **PASS (100% verified across all visual criteria)**

---

## 1. Executive Summary

Evaluated ChatGPT's **GP-20002** (`Radio out of the first-person eye`) on the real WebGPU renderer on RTX 5080.
Inspected the marine with plate carrier equipped and pistol view gun raised:
1. **First-Person Look-Down**: Looking straight down (`pitch = -1.38 rad`) and angled (`pitch = -0.78 rad`), the radio box, controls, PTT cable, and whip antenna are **100% eye-hidden** (`isEyeHidden = true` on all 3 radio cluster meshes). The plate carrier front bag, cummerbund, and chest remain crisply visible in the lower field of view with zero visual obstruction or floating geometry.
2. **Third-Person View**: In third person, all 3 radio cluster meshes render with full fidelity (`isEyeHidden = false`), sitting flush against the left shoulder chest strap with proper mounting, PTT lead wire, and whip antenna curvature.
3. **Shadow Silhouette**: Because `castShadow = true` is retained on all radio cluster meshes, the whip antenna and radio silhouette project distinctly into the marine's ground shadow under grazing and high-angle sunlight.
4. **Four-Light Review (D-89)**: Inspected across Noon, Overcast, Dusk, and Night (with tactical flashlight beam). No clipping into body, no lighting anomalies, and zero sub-surface shader artifacts.

---

## 2. Mesh Hierarchy & Eye-Filter Analysis

| Subsystem / Group | Mesh Count | First-Person `isEyeHidden` | Third-Person Drawn | `castShadow` | Status / Visual Check |
|---|:---:|:---:|:---:|:---:|---|
| **Radio Cluster (`userData.vmEyeRadio = true`)** | 3 | **`true` (all 3 hidden)** | **`true` (all 3 drawn)** | **`true` (all 3 cast)** | **PASS**: Radio, antenna & PTT cable omitted from eye pass only |
| **Plate Carrier Body (`gearParts.vest`)** | 9 | `false` (visible in eye) | `true` (drawn) | `true` (cast) | **PASS**: Front plate, cummerbund & MOLLE visible when looking down |
| **Pistol Viewmodel (`VM.gun`)** | 1 | `false` (raised) | N/A (VM inactive) | N/A | **PASS**: `raise = 1.00`, steady hip/ADS alignment |

---

## 3. Four-Light Review (D-89 Standard)

- **Noon (`t = 0.42`, direct overhead sun)**: Matte polymer radio body reads cleanly against woven OD green cordura vest. Whip antenna has crisp specular highlight along outer bend radius.
- **Overcast (`t = 0.42`, heavy rain `intensity = 0.75`)**: Soft ambient occlusion in cable crevice and MOLLE pouch clip; no black rimming or blown specular.
- **Dusk (`t = 0.74`, golden hour sidelight)**: Grazing warm light accentuates radio dial buttons and antenna silhouette; cast shadow stretches realistically across ground.
- **Night (`t = 0.05`, tactical flashlight beam)**: Sharp high-contrast cone illumination clearly details the PTT wire routing and antenna tip without popping or ghosting.

---

## 4. Scoring Summary

| Category | Score (1-5) | Details |
|---|:---:|---|
| **Silhouette** | **5.0** | Distinct tactical profile in third person; clean ground shadow silhouette. |
| **Materials** | **5.0** | Roughness/specular contrast between matte radio chassis, flexible cable, and vest. |
| **Clipping** | **5.0** | Zero penetration into neck, shoulder, or chest plate bags. |
| **Eye-Filter** | **5.0** | 100% exclusion from first-person view frustum; zero whip antenna obstruction. |

---

## 5. Artifacts
- **Contact Sheet**: `qa/2026-11-01-AG-177/gp20002-sheet.png` (2×4 contact grid)
- **Dataset**: `qa/2026-11-01-AG-177/gp20002-summary.json`
- **Key Screenshots**:
  - `gp20002-fp-lookdown.png` (First-person looking straight down)
  - `gp20002-fp-lookangled.png` (First-person looking down angled at plate carrier)
  - `gp20002-tp-radio-close.png` (Third-person close-up of radio and antenna)
  - `gp20002-shadow-silhouette.png` (Ground shadow with whip antenna silhouette)
  - `gp20002-light-noon.png` (Noon sunlight)
  - `gp20002-light-overcast.png` (Overcast rain)
  - `gp20002-light-dusk.png` (Dusk golden hour)
  - `gp20002-light-night.png` (Night flashlight beam)
