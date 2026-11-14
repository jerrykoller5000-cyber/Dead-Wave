# CG-6 (J153 note 23): the sun's shadow map follows him in whole texels and turns in small steps.
import sys, re
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
anchor = "    const sunDir = new THREE.Vector3(0, 1, 0.3).normalize();\n"
assert s.count(anchor) == 1, 'anchor'
helper = anchor + """    // CG-6 (J153 note 23, Jerry: "Flickering along this edge", the fence's rail and posts over the striped floor): the shadow
    // map rode along with him to the millimetre and turned with the sun every frame, so its texels (~3 cm) slid under every
    // shadow edge as he moved and the edges crawled and flickered. It now follows him in whole texels of its own grid, and
    // turns only in steps of about a quarter of a degree (the light itself still turns smoothly), so a shadow edge holds
    // still while he walks.
    const _sunShadowDir = sunDir.clone(), _sunAxes = new THREE.Matrix4(), _sunX = new THREE.Vector3(), _sunY = new THREE.Vector3(), _sunZ = new THREE.Vector3(), _sunO = new THREE.Vector3(), _sunUp = new THREE.Vector3(0, 1, 0), _sunAt = new THREE.Vector3();
    function followSun(p) {
      if (_sunShadowDir.angleTo(sunDir) > 0.004) _sunShadowDir.copy(sunDir);
      const cam = sun.shadow.camera, texel = (cam.right - cam.left) / (sun.shadow.mapSize.x || 2048);
      _sunAxes.lookAt(_sunShadowDir, _sunO, _sunUp).extractBasis(_sunX, _sunY, _sunZ);
      const x = p.dot(_sunX), y = p.dot(_sunY);
      _sunAt.copy(p).addScaledVector(_sunX, Math.round(x / texel) * texel - x).addScaledVector(_sunY, Math.round(y / texel) * texel - y);
      sun.target.position.copy(_sunAt);
      sun.position.copy(_sunAt).addScaledVector(_sunShadowDir, 85);
    }
"""
s = s.replace(anchor, helper)
n = 0
for who in ['player.position', 'menuCamera.focus']:
    pat = re.compile(r"sun\.position\.copy\(" + re.escape(who) + r"\)\.addScaledVector\(sunDir, 85\);(\s*(?://[^\n]*)?\s*)sun\.target\.position\.copy\(" + re.escape(who) + r"\);")
    s, k = pat.subn("followSun(" + who + ");", s); n += k
print('call sites', n)
assert n >= 3
open(p, 'w', encoding='utf-8', newline='').write(s)
