// GP-187: narrow, guarded proposal; production application requires owner/Jerry approval.
export const HAND_BEFORE = 'hang:    { f: [[0.5, 0.6, 0.4, 0.02], [0.55, 0.65, 0.42, 0], [0.58, 0.68, 0.44, -0.02], [0.62, 0.72, 0.46, -0.03]], t: [0.5, -0.2, 0.4] }';
export const HAND_AFTER = 'hang:    { f: [[1.0, 1.2, 0.9, 0], [1.02, 1.24, 0.92, 0], [1.05, 1.27, 0.94, 0], [1.08, 1.3, 0.96, 0]], t: [0.95, -0.32, 0.55] }';
const normalize = text => text.replaceAll('\r\n', '\n');
function once(text, before, after) {
  if (text.split(before).length !== 2) throw new Error('Proposal no longer matches the current source: ' + before.slice(0, 80));
  return text.replace(before, after);
}
export function improveHand(text) {
  return once(text, HAND_BEFORE, HAND_AFTER);
}
export function improveIndex(text) {
  const crlf = text.includes('\r\n');
  text = normalize(text);
  text = once(text, 'const _hp = { r: null, l: null };', 'const _hp = { r: null, l: null, rest: null };');
  text = once(text, `const hang = POSE.relax > 0.5 && unarmed && !mortarCarried;
      const rest = hang ? HAND_POSES.hang : HAND_POSES.relaxed;`, `// GP-187: close the empty hands continuously through the holster transition.
      const hang = unarmed && !mortarCarried ? _clamp01(POSE.relax || 0) : 0;
      _hp.rest = lerpPose(HAND_POSES.relaxed, HAND_POSES.hang, hang, _hp.rest);
      const rest = _hp.rest;`);
  text = once(text, `if (hang) {
        if (wristL) wristL.rotation.set(0.05, 1.15, 0);
        if (wristR) wristR.rotation.set(0.05, -1.15, 0);`, `if (hang > 0.001) {
        if (wristL) wristL.rotation.set(0.05 * hang, 1.15 * hang, 0);
        if (wristR) wristR.rotation.set(0.05 * hang, -1.15 * hang, 0);`);
  text = once(text, `const g = (running ? 0.5 : 0.38) * (1 - 0.45 * POSE.crouch);
            swL = POSE.thighL * g; swR = POSE.thighR * g;   // a leg going back (+thigh) brings that side's arm forward
            if (running) { bend = -1.05; fwdBend = 0; out = 0.08; pitch = U.x - 0.18; }
            else bend = -0.5;`, `// GP-187: elbows and swing follow the existing eased walk/run weight.
            const runMix = _clamp01(POSE.gaitRun || 0);
            const g = (0.38 + 0.12 * runMix) * (1 - 0.45 * POSE.crouch);
            swL = POSE.thighL * g; swR = POSE.thighR * g;
            bend = -0.5 - 0.55 * runMix;
            fwdBend = 0.05 * (1 - runMix); out = 0.08 * runMix; pitch = U.x - 0.18 * runMix;`);
  return crlf ? text.replaceAll('\n', '\r\n') : text;
}
