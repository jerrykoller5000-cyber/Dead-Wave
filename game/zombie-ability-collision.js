// GP-179: one obstruction query for ability aim and travelling fireballs/boulders.
// Collision primitives and the active room/floor queries stay with their owners.
const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const lerp = (a, b, t) => a + (b - a) * t;
const validFraction = t => Number.isFinite(t) && t >= 0 && t <= 1;
const OFFSETS = [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];

export function createAbilityCollision(env) {
  if (!env || typeof env.world !== 'function' || typeof env.ground !== 'function' || typeof env.box !== 'function' || typeof env.cylinder !== 'function' || typeof env.build !== 'function') throw new TypeError('Ability collision requires world, ground, box, cylinder and build queries');

  function trace(a, b, radius = 0) {
    if (!finitePoint(a) || !finitePoint(b) || !Number.isFinite(radius) || radius < 0) return null;
    const world = env.world() || {};
    const minX = Math.min(a.x, b.x) - radius, maxX = Math.max(a.x, b.x) + radius;
    const minY = Math.min(a.y, b.y) - radius, maxY = Math.max(a.y, b.y) + radius;
    const minZ = Math.min(a.z, b.z) - radius, maxZ = Math.max(a.z, b.z) + radius;
    let best = null;
    const take = (t, detail) => { if (validFraction(t) && (!best || t < best.t)) best = { t, ...detail }; };
    const overlaps = (x, z, r, y0 = -Infinity, y1 = Infinity) => x + r >= minX && x - r <= maxX && z + r >= minZ && z - r <= maxZ && y1 >= minY && y0 <= maxY;
    const box = (solid, surface) => {
      if (!solid || !['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ'].every(k => Number.isFinite(solid[k]))) return;
      if (solid.maxX < minX || solid.minX > maxX || solid.maxY < minY || solid.minY > maxY || solid.maxZ < minZ || solid.minZ > maxZ) return;
      const cx = (solid.minX + solid.maxX) / 2, cy = (solid.minY + solid.maxY) / 2, cz = (solid.minZ + solid.maxZ) / 2;
      take(env.box(a.x, a.y, a.z, b.x, b.y, b.z, cx, cy, cz,
        (solid.maxX - solid.minX) / 2 + radius, (solid.maxY - solid.minY) / 2 + radius, (solid.maxZ - solid.minZ) / 2 + radius), { surface, solid });
    };
    const cylinder = (x, z, r, y0, y1, surface, solid) => {
      if (![x, z, r, y0, y1].every(Number.isFinite) || r < 0 || y1 < y0 || !overlaps(x, z, r, y0, y1)) return;
      take(env.cylinder(a.x, a.y, a.z, b.x, b.y, b.z, x, z, r + radius, y0 - radius, y1 + radius), { surface, solid });
    };

    const tg = world.trainingTg;
    const underground = world.belowSolids != null;
    if (tg) {
      for (const solid of tg.solids || []) {
        if (solid.target != null && tg.targets?.[solid.target]?.state !== 'up') continue;
        box(solid, 'training');
      }
    } else if (underground) {
      for (const solid of world.belowSolids) box(solid, 'below');
    } else {
      const house = world.house;
      if (house?.present && house.group?.position && Number.isFinite(house.half) && Number.isFinite(world.houseHeight)) {
        const p = house.group.position, h = world.houseHeight;
        box({ minX: p.x - house.half, maxX: p.x + house.half, minY: p.y, maxY: p.y + h, minZ: p.z - house.half, maxZ: p.z + house.half }, 'house');
      }
      for (const rock of world.rocks || []) {
        if (!rock.alive || !rock.mesh || rock.mesh.visible === false) continue;
        const y = rock.mesh.position.y;
        cylinder(rock.x, rock.z, rock.radius, y, y + rock.height, 'rock', rock);
      }
      for (const tree of world.trees || []) {
        if (tree.stump && tree.stumpMesh) {
          const y = tree.stumpMesh.position.y;
          cylinder(tree.x, tree.z, tree.trunkRadius + .15, y, y + .55, 'tree', tree);
          continue;
        }
        if (!tree.alive || tree.falling || !tree.group) continue;
        const y = tree.group.position.y;
        if (tree.leafHealth > 0) cylinder(tree.x, tree.z, tree.canopyRadius * .9, y + tree.canopyBottom * .65, y + tree.canopyTop, 'tree', tree);
        cylinder(tree.x, tree.z, tree.trunkRadius + .12, y, y + tree.canopyBottom + .4, 'tree', tree);
      }
      for (const solid of world.worldSolids || []) cylinder(solid.x, solid.z, solid.radius, solid.y0, solid.y1, 'world', solid);
    }

    // Keep the existing build shape query: it understands open doors, windows and
    // linked-panel arms. Offset sweeps catch a projectile's outer cardinal edges.
    // Unlike player bullets, a large enemy projectile is stopped by a railing.
    const grid = Number.isFinite(world.buildGrid) && world.buildGrid > 0 ? world.buildGrid : 2.5;
    for (const build of world.builds || []) {
      if (!(build.hp > 0) || !build.mesh || build.type === 'wire') continue;
      const r = Math.max(build.radius || .6, grid * .8);
      if (!overlaps(build.x, build.z, r)) continue;
      for (let i = 0; i < (radius > 0 ? OFFSETS.length : 1); i++) {
        const offset = OFFSETS[i], x = offset[0] * radius, y = offset[1] * radius, z = offset[2] * radius;
        take(env.build(build, a.x + x, a.y + y, a.z + z, b.x + x, b.y + y, b.z + z), { build });
      }
    }

    // Every mode supplies its own floor query. Null means a real hole/void: never
    // fall back to outdoor terrain under a Training room or an underground arena.
    // Reference height selects a reachable floor/roof/deck rather than an overhead
    // platform. Check the start as well, so a short segment inside cover is solid.
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy, dz) / .25));
    const limit = best ? best.t : 1;
    let lastT = 0, lastGap = null;
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(i / steps, limit);
      const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
      const floor = env.ground(x, z, y);
      const gap = Number.isFinite(floor) ? y - radius - floor : null;
      if (gap !== null && gap <= 0) {
        const fraction = lastGap !== null && lastGap > 0 ? lerp(lastT, t, lastGap / (lastGap - gap)) : t;
        take(fraction, { surface: 'ground' });
        break;
      }
      lastT = t; lastGap = gap;
      if (t === limit) break;
    }
    return best;
  }

  return { trace, lineClear: (a, b, radius = .12) => trace(a, b, radius) === null };
}
