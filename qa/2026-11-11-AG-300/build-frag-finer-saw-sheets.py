#!/usr/bin/env python3
"""
Build labeled 4-light contact sheets for ChatGPT 2's corrected GT-20077 assets:
  1. review/GT-20077/frag/gpu/sheet-frag-unmarked-4lights.jpg
  2. review/GT-20077/chainsaw/gpu/sheet-chainsaw-finer-edge-4lights.jpg
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
SRC = ROOT / "qa" / "2026-11-11-AG-300" / "retake"
OUT_FRAG = ROOT / "review" / "GT-20077" / "frag" / "gpu"
OUT_SAW = ROOT / "review" / "GT-20077" / "chainsaw" / "gpu"
OUT_AG300 = ROOT / "review" / "AG-300"


def load_font(sz, bold=False):
    for p in (
        r"C:\Windows\Fonts\consolab.ttf" if bold else r"C:\Windows\Fonts\consola.ttf",
        r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arial.ttf",
    ):
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()


F_T = load_font(21, True)
F_S = load_font(14, False)
F_H = load_font(15, True)
F_L = load_font(13, True)


def save_multi(im, name, dirs):
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
        fp = d / name
        tmp = d / f"{name}.tmp"
        im.convert("RGB").save(tmp, "JPEG", quality=92, subsampling=0)
        os.replace(tmp, fp)
    print(f"[build-frag-finer-saw] Wrote {name}")


def badge(im, txt):
    d = ImageDraw.Draw(im)
    bb = d.textbbox((0, 0), txt, font=F_L)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.rectangle([6, 6, 18 + tw, 14 + th], fill=(15, 20, 26), outline=(80, 96, 118))
    d.text((12, 9), txt, fill=(238, 242, 248), font=F_L)


def build_frag():
    views = [
        ("eye-held", "1P Eye Held (Cocked)"),
        ("eye-lift", "1P Eye Lift (Raise)"),
        ("held-left", "3P Held Left Close"),
        ("surface", "Standalone Prop Surface"),
    ]
    lights = ["noon", "overcast", "dusk", "night"]
    cw, ch, pad, lw, th = 420, 236, 10, 140, 82
    W = lw + len(views) * (cw + pad) + pad
    H = th + len(lights) * (ch + pad) + pad
    im = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(im)
    d.text((16, 12), "GT-20077 · Independent RTX 5080 WebGPU 4-Light Look — Unmarked Frag Grenade", fill=(242, 246, 252), font=F_T)
    d.text((16, 42), "Verified: 0 decal/stencil nodes, 0 texture maps · Worn olive enamel, color-only yellow band, satin bare-metal spoon/fuze across 4 lights", fill=(162, 184, 208), font=F_S)

    for ci, (_, cl) in enumerate(views):
        d.text((lw + ci * (cw + pad) + 6, th - 24), cl, fill=(216, 228, 245), font=F_H)
    for ri, lk in enumerate(lights):
        y = th + ri * (ch + pad)
        d.text((16, y + ch // 2 - 8), lk.upper(), fill=(216, 228, 245), font=F_H)
        for ci, (vk, _) in enumerate(views):
            fp = SRC / f"frag-{vk}-{lk}.png"
            t = Image.open(fp).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            badge(t, f"{vk} · {lk.upper()}")
            im.paste(t, (lw + ci * (cw + pad), y))
    save_multi(im, "sheet-frag-unmarked-4lights.jpg", [OUT_FRAG, OUT_AG300, SRC])


def build_saw():
    cols = [
        ("factory", "1p-hip", "Factory · 1P Hip"),
        ("factory", "1p-aimed", "Factory · 1P Aimed"),
        ("factory", "3p-held-right", "Factory · 3P Held"),
        ("factory", "chain-macro", "Factory · Chain Macro"),
        ("m81", "1p-hip", "M81 · 1P Hip"),
        ("m81", "chain-macro", "M81 · Chain Macro"),
    ]
    lights = ["noon", "overcast", "dusk", "night"]
    cw, ch, pad, lw, th = 360, 202, 10, 130, 82
    W = lw + len(cols) * (cw + pad) + pad
    H = th + len(lights) * (ch + pad) + pad
    im = Image.new("RGB", (W, H), (14, 17, 22))
    d = ImageDraw.Draw(im)
    d.text((16, 12), "GT-20077 · Independent RTX 5080 WebGPU 4-Light Look — Finer Chainsaw Edge (Factory & M81)", fill=(242, 246, 252), font=F_T)
    d.text((16, 42), "Verified: Finer alternating steel cutters over dark links (blocky ~3cm teeth gone), single InstancedMesh draw, M81 masked strictly to top cover", fill=(162, 184, 208), font=F_S)

    for ci, (_, _, cl) in enumerate(cols):
        d.text((lw + ci * (cw + pad) + 6, th - 24), cl, fill=(216, 228, 245), font=F_H)
    for ri, lk in enumerate(lights):
        y = th + ri * (ch + pad)
        d.text((16, y + ch // 2 - 8), lk.upper(), fill=(216, 228, 245), font=F_H)
        for ci, (fin, vk, _) in enumerate(cols):
            fp = SRC / f"finer-saw-{fin}-{vk}-{lk}.png"
            t = Image.open(fp).convert("RGB").resize((cw, ch), Image.Resampling.LANCZOS)
            badge(t, f"{fin.upper()} · {vk} · {lk.upper()}")
            im.paste(t, (lw + ci * (cw + pad), y))
    save_multi(im, "sheet-chainsaw-finer-edge-4lights.jpg", [OUT_SAW, OUT_AG300, SRC])


if __name__ == "__main__":
    build_frag()
    build_saw()
