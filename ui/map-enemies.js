// UI intelligence only: no writes to enemies, the director, or the camera.
export function enemyMapPoint(position, {x, z, yaw = 0, center = 0, scale = 1, rim = Infinity}) {
  const dx = position.x - x, dz = position.z - z;
  const right = -dx * Math.cos(yaw) + dz * Math.sin(yaw);
  const down = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
  const angle = Math.atan2(down, right), distance = Math.hypot(dx, dz);
  const radius = Math.min(distance * scale, rim);
  return {x: center + Math.cos(angle) * radius, y: center + Math.sin(angle) * radius, angle, distance};
}

export function createEnemyMapIntel({range = 50, near = 10, sightBudget = 2} = {}) {
  let known = new WeakSet(), cursor = 0;
  const position = enemy => enemy.mesh?.position;
  function inRange(enemy, player) {
    const p = position(enemy);
    return enemy.alive && p && Number.isFinite(p.x) && Number.isFinite(p.z) &&
      Math.hypot(p.x - player.x, p.z - player.z) <= range;
  }
  return {
    reset() { known = new WeakSet(); cursor = 0; },
    // Called at 5 Hz. At most two expensive visibility checks per call. A known
    // enemy needs no further ray checks; round-robin avoids starving other ones.
    observe(enemies, player, visible = () => false) {
      const candidates = [];
      for (const enemy of enemies) {
        if (!inRange(enemy, player) || known.has(enemy)) continue;
        const p = position(enemy);
        if (Math.hypot(p.x - player.x, p.z - player.z) <= near) known.add(enemy);
        else candidates.push(enemy);
      }
      if (!candidates.length) { cursor = 0; return; }
      const start = cursor % candidates.length;
      for (let i = 0; i < Math.min(sightBudget, candidates.length); i++) {
        const enemy = candidates[(start + i) % candidates.length];
        if (visible(enemy)) known.add(enemy);
      }
      cursor = (start + sightBudget) % candidates.length;
    },
    markers(enemies, player, night) {
      return enemies.filter(enemy => inRange(enemy, player) && (night || known.has(enemy)));
    }
  };
}

export function drawEnemyBearings(ctx, enemies, projection) {
  ctx.save();
  ctx.strokeStyle = '#ff665c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const enemy of enemies) {
    const p = enemyMapPoint(enemy.mesh.position, projection);
    if (p.distance < .5) continue;
    ctx.beginPath();
    ctx.arc(projection.center, projection.center, projection.rim, p.angle - .025, p.angle + .025);
    ctx.stroke();
  }
  ctx.restore();
}
