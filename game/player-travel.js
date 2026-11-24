// Integrate the requested velocity, the velocity following it, and the distance travelled in one step.
// Splitting a frame leaves all three results unchanged while the input and rates are constant.
function advanceAxis(axis, dt, target, wishRate, velocityRate) {
  const wishShare = -Math.expm1(-wishRate * dt);
  const velocityShare = -Math.expm1(-velocityRate * dt);
  const gap = wishRate - velocityRate;
  const coupling = gap === 0 ? dt * (1 - velocityShare) : (wishShare - velocityShare) / gap;
  const wishError = axis.wish - target;
  const oldVelocity = axis.velocity;
  axis.velocity = oldVelocity + (target - oldVelocity) * velocityShare + velocityRate * wishError * coupling;
  axis.distance = target * dt + wishError * wishShare / wishRate
    - (axis.velocity - oldVelocity) / velocityRate;
  axis.wish -= wishError * wishShare;
}

export class PlayerTravel {
  along = { wish: 0, velocity: 0, distance: 0 };
  across = { wish: 0, velocity: 0, distance: 0 };
  vx = 0; vz = 0;
  wishX = 0; wishZ = 0;
  dx = 0; dz = 0;

  // x,z is the unit input heading. Across it, feet can brake sideways drift independently of the push forward.
  step(dt, x, z, speed, wishRate, velocityRate, sideWishRate = wishRate, sideVelocityRate = velocityRate) {
    const along = this.along, across = this.across;
    along.wish = this.wishX * x + this.wishZ * z;
    along.velocity = this.vx * x + this.vz * z;
    across.wish = -this.wishX * z + this.wishZ * x;
    across.velocity = -this.vx * z + this.vz * x;
    advanceAxis(along, dt, speed, wishRate, velocityRate);
    advanceAxis(across, dt, 0, sideWishRate, sideVelocityRate);
    this.vx = x * along.velocity - z * across.velocity;
    this.vz = z * along.velocity + x * across.velocity;
    this.wishX = x * along.wish - z * across.wish;
    this.wishZ = z * along.wish + x * across.wish;
    this.dx = x * along.distance - z * across.distance;
    this.dz = z * along.distance + x * across.distance;
  }
}
