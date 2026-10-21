#!/usr/bin/env bash
# CL-191: rebuild assets/disclaimer/disclaimer.mp4 from its sources.
#   tools/disclaimer/build.sh [SRC_DIR]
# SRC_DIR (default tools/disclaimer/src) holds Jerry's clips under the names timeline.json uses (src/README.md has the map);
# DANCE (default review/dance-GP19906/marine-dance-transparent.webm) is GPT's dancer, the full-frame alpha render. Needs ffmpeg (with libvpx-vp9 and libx264),
# python3 with numpy + scipy + pillow, node 22+ and Chrome (driven through tools/cdp.mjs; CHROME=/path picks one).
# Takes about 25 minutes (the frames are drawn one at a time so every one is exact).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$(cd "$HERE/../.." && pwd)"
SRC="${1:-$HERE/src}"; DANCE="${DANCE:-$ROOT/review/dance-GP19906/marine-dance-transparent.webm}"; WORK="${WORK:-$HERE/.work}"; OUT="$ROOT/assets/disclaimer/disclaimer.mp4"
mkdir -p "$WORK/rgba" "$WORK/frames" "$WORK/png"
# 1. the dancer: alpha frames, scaled to his size on the stage (0.46 of GPT's 1280x720 frame = 589x331)
if [ ! -f "$WORK/frames/d0600.png" ]; then
  ffmpeg -v error -y -c:v libvpx-vp9 -i "$DANCE" -pix_fmt rgba "$WORK/rgba/d%04d.png"
  ffmpeg -v error -y -i "$WORK/rgba/d%04d.png" -vf "scale=589:331:flags=lanczos" -pix_fmt rgba "$WORK/frames/d%04d.png"
  python3 "$HERE/bbox.py" "$WORK/rgba" "$HERE/dance-bbox.json"
fi
# 2. the sound
python3 "$HERE/mix.py" "$SRC" "$WORK/mix.wav"
# 3. the picture (a local server for the scene; frames/ is the dancer)
#    (served from the repo root: the scene uses the game's own fonts in vendor/fonts)
ln -sfn "$WORK/frames" "$HERE/frames"
PORT="${PORT:-8890}"; (cd "$ROOT" && python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 & echo $! > "$WORK/http.pid")
sleep 1
node "$HERE/render.mjs" "http://127.0.0.1:$PORT/tools/disclaimer/scene.html" "$WORK/png"
kill "$(cat "$WORK/http.pid")" 2>/dev/null || true
# 4. one file: H.264 High 1080p60 (hardware-decoded everywhere), AAC 192k, moov first for a quick start
ffmpeg -v error -y -framerate 60 -i "$WORK/png/f%05d.png" -i "$WORK/mix.wav" \
  -vf "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p" -colorspace bt709 -color_primaries bt709 -color_trc bt709 \
  -c:v libx264 -preset slow -crf 19 -tune film -profile:v high -level 4.2 -g 60 -keyint_min 60 \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart -shortest "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
