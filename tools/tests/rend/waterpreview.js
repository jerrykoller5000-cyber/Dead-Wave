// Mirror of the game's water shader, for the software renderer.
window.__shadeWater = (function () {
  const T = window.TT;
  const cv = T.waterNoiseTex.image, N = cv.width;
  const px = cv.getContext('2d').getImageData(0, 0, N, N).data;
  const tex = (u, v, ch) => {
    u = u * N - 0.5; v = v * N - 0.5;
    const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
    const g = (x, y) => px[((((y % N) + N) % N) * N + (((x % N) + N) % N)) * 4 + ch] / 255;
    const a = g(iu, iv), b = g(iu + 1, iv), c = g(iu, iv + 1), d = g(iu + 1, iv + 1);
    return (a + (b - a) * fu) + ((c + (d - c) * fu) - (a + (b - a) * fu)) * fv;
  };
  const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const fract = (x) => x - Math.floor(x);
  return function (x, y, z, depth, fl, cam) {
    const t = window.__waterT || 20;
    const la = tex(x * 0.045 + t * 0.011, z * 0.045 + t * 0.007, 0);
    const lb = tex(x * 0.083 - t * 0.009, z * 0.083 + t * 0.013, 1);
    const lakeRip = la * 0.6 + lb * 0.4;
    const period = 2.6, ph0 = fract(t / period), ph1 = fract(t / period + 0.5);
    const w0 = 1 - Math.abs(ph0 * 2 - 1);
    const len = Math.hypot(fl[0], fl[1]) || 1, dx = fl[0] / len, dz = fl[1] / len, speed = fl[2];
    const tr = speed * period;
    const r0 = tex((x - dx * tr * ph0) * 0.085, (z - dz * tr * ph0) * 0.085, 2);
    const r1 = tex((x - dx * tr * ph1) * 0.085 + 0.37, (z - dz * tr * ph1) * 0.085 + 0.61, 2);
    const rs0 = tex((x - dx * tr * ph0) * 0.21, (z - dz * tr * ph0) * 0.21, 0);
    const rs1 = tex((x - dx * tr * ph1) * 0.21 + 0.21, (z - dz * tr * ph1) * 0.21 + 0.83, 0);
    const riverRip = (r1 * 0.6 + rs1 * 0.4) + ((r0 * 0.6 + rs0 * 0.4) - (r1 * 0.6 + rs1 * 0.4)) * w0;
    const running = ss(0.05, 0.3, speed);
    const rip = lakeRip + (riverRip - lakeRip) * running;
    const vx = cam[0] - x, vy = cam[1] - y, vz = cam[2] - z, vl = Math.hypot(vx, vy, vz) || 1;
    const fres = Math.pow(1 - Math.max(0, Math.min(1, vy / vl)), 4);
    const lap = Math.sin(t * 1.1 + la * 9) * 0.5 + 0.5;
    return T.waterColourAt(depth, rip, fres, speed, lb, lap);
  };
})();
