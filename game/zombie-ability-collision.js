// GP-179: one obstruction query for ability aim and travelling fireballs/boulders.
// Collision primitives and the active room/floor queries stay with their owners.
const finitePoint = p => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);
const lerp = (a, b, t) => a + (b - a) * t;
const validFraction = t => Number.isFinite(t) && t >= 0 && t <= 1;
const OFFSETS = [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0], [0, 0, -1], [0, 0, 1]];
const EMPTY = [];
const EMPTY_WORLD = {};

export function createAbilityCollision(env) {
  if (!env || typeof env.world !== 'function' || typeof env.ground !== 'function' || typeof env.box !== 'function' || typeof env.cylinder !== 'function' || typeof env.build !== 'function') throw new TypeError('Ability collision requires world, ground, box, cylinder and build queries');

  // The game consumes each result before its next trace. Reuse the sweep state
  // and returned hit so a miss among hundreds of trees creates no garbage.
  const s = {
    ax: 0, ay: 0, az: 0, bx: 0, by: 0, bz: 0, radius: 0,
    minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0,
    bestT: Infinity, surface: null, solid: null, build: null,
    hit: { t: 0, surface: null, solid: null, build: null },
    houseSolid: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 },
  };
  const take = (t, surface = null, solid = null, build = null) => {
    if (!validFraction(t) || t >= s.bestT) return;
    s.bestT = t; s.surface = surface; s.solid = solid; s.build = build;
  };
  const overlaps = (x, z, r, y0 = -Infinity, y1 = Infinity) => x + r >= s.minX && x - r <= s.maxX && z + r >= s.minZ && z - r <= s.maxZ && y1 >= s.minY && y0 <= s.maxY;
  const box = (solid, surface) => {
    if (!solid || !Number.isFinite(solid.minX) || !Number.isFinite(solid.maxX) || !Number.isFinite(solid.minY) || !Number.isFinite(solid.maxY) || !Number.isFinite(solid.minZ) || !Number.isFinite(solid.maxZ)) return;
    if (solid.maxX < s.minX || solid.minX > s.maxX || solid.maxY < s.minY || solid.minY > s.maxY || solid.maxZ < s.minZ || solid.minZ > s.maxZ) return;
    const cx = (solid.minX + solid.maxX) / 2, cy = (solid.minY + solid.maxY) / 2, cz = (solid.minZ + solid.maxZ) / 2;
    take(env.box(s.ax, s.ay, s.az, s.bx, s.by, s.bz, cx, cy, cz,
      (solid.maxX - solid.minX) / 2 + s.radius, (solid.maxY - solid.minY) / 2 + s.radius, (solid.maxZ - solid.minZ) / 2 + s.radius), surface, solid);
  };
  const cylinder = (x, z, r, y0, y1, surface, solid) => {
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(r) || !Number.isFinite(y0) || !Number.isFinite(y1) || r < 0 || y1 < y0 || !overlaps(x, z, r, y0, y1)) return;
    take(env.cylinder(s.ax, s.ay, s.az, s.bx, s.by, s.bz, x, z, r + s.radius, y0 - s.radius, y1 + s.radius), surface, solid);
  };

  function trace(a, b, radius = 0) {
    if (!finitePoint(a) || !finitePoint(b) || !Number.isFinite(radius) || radius < 0) return null;
    const world = env.world() || EMPTY_WORLD;
    s.ax = a.x; s.ay = a.y; s.az = a.z; s.bx = b.x; s.by = b.y; s.bz = b.z; s.radius = radius;
    s.minX = Math.min(a.x, b.x) - radius; s.maxX = Math.max(a.x, b.x) + radius;
    s.minY = Math.min(a.y, b.y) - radius; s.maxY = Math.max(a.y, b.y) + radius;
    s.minZ = Math.min(a.z, b.z) - radius; s.maxZ = Math.max(a.z, b.z) + radius;
    s.bestT = Infinity; s.surface = null; s.solid = null; s.build = null;

    const tg = world.trainingTg;
    const underground = world.belowSolids != null;
    if (tg) {
      const solids = tg.solids || EMPTY;
      for (let i = 0; i < solids.length; i++) {
        const solid = solids[i];
        if (solid.target != null && tg.targets?.[solid.target]?.state !== 'up') continue;
        box(solid, 'training');
      }
    } else if (underground) {
      const solids = world.belowSolids;
      for (let i = 0; i < solids.length; i++) box(solids[i], 'below');
    } else {
      const house = world.house;
      if (house?.present && house.group?.position && Number.isFinite(house.half) && Number.isFinite(world.houseHeight)) {
        const p = house.group.position, h = world.houseHeight;
        const solid = s.houseSolid;
        solid.minX = p.x - house.half; solid.maxX = p.x + house.half;
        solid.minY = p.y; solid.maxY = p.y + h;
        solid.minZ = p.z - house.half; solid.maxZ = p.z + house.half;
        box(solid, 'house');
      }
      const rocks = world.rocks || EMPTY;
      for (let i = 0; i < rocks.length; i++) {
        const rock = rocks[i];
        if (!rock.alive || !rock.mesh || rock.mesh.visible === false) continue;
        const y = rock.mesh.position.y;
        cylinder(rock.x, rock.z, rock.radius, y, y + rock.height, 'rock', rock);
      }
      const trees = world.trees || EMPTY;
      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
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
      const solids = world.worldSolids || EMPTY;
      for (let i = 0; i < solids.length; i++) {
        const solid = solids[i];
        cylinder(solid.x, solid.z, solid.radius, solid.y0, solid.y1, 'world', solid);
      }
    }

    // Keep the existing build shape query: it understands open doors, windows and
    // linked-panel arms. Offset sweeps catch a projectile's outer cardinal edges.
    // Unlike player bullets, a large enemy projectile is stopped by a railing.
    const grid = Number.isFinite(world.buildGrid) && world.buildGrid > 0 ? world.buildGrid : 2.5;
    const builds = world.builds || EMPTY;
    for (let j = 0; j < builds.length; j++) {
      const build = builds[j];
      if (!(build.hp > 0) || !build.mesh || build.type === 'wire') continue;
      const r = Math.max(build.radius || .6, grid * .8);
      if (!overlaps(build.x, build.z, r)) continue;
      for (let i = 0; i < (radius > 0 ? OFFSETS.length : 1); i++) {
        const offset = OFFSETS[i], x = offset[0] * radius, y = offset[1] * radius, z = offset[2] * radius;
        take(env.build(build, a.x + x, a.y + y, a.z + z, b.x + x, b.y + y, b.z + z), null, null, build);
      }
    }

    // Every mode supplies its own floor query. Null means a real hole/void: never
    // fall back to outdoor terrain under a Training room or an underground arena.
    // Reference height selects a reachable floor/roof/deck rather than an overhead
    // platform. Check the start as well, so a short segment inside cover is solid.
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const steps = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy + dz * dz) / .25));
    const limit = s.bestT < Infinity ? s.bestT : 1;
    let lastT = 0, lastGap = null;
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(i / steps, limit);
      const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
      const floor = env.ground(x, z, y);
      const gap = Number.isFinite(floor) ? y - radius - floor : null;
      if (gap !== null && gap <= 0) {
        const fraction = lastGap !== null && lastGap > 0 ? lerp(lastT, t, lastGap / (lastGap - gap)) : t;
        take(fraction, 'ground');
        break;
      }
      lastT = t; lastGap = gap;
      if (t === limit) break;
    }
    if (s.bestT === Infinity) return null;
    const hit = s.hit;
    hit.t = s.bestT; hit.surface = s.surface; hit.solid = s.solid; hit.build = s.build;
    return hit;
  }

  return { trace, lineClear: (a, b, radius = .12) => trace(a, b, radius) === null };
}
