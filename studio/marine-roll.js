// GP-75. World travel is camera-relative; the tumble stays aligned to it even if aim turns.
export function rollTravel(forward, strafe, cameraYaw, aimYaw) {
  const fx = Math.sin(cameraYaw), fz = Math.cos(cameraYaw);
  const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
  let x = fx * forward + rx * strafe, z = fz * forward + rz * strafe;
  let length = Math.hypot(x, z);
  if (length < 1e-6) { x = Math.sin(aimYaw); z = Math.cos(aimYaw); length = 1; }
  return { x: x / length, z: z / length };
}

// The axis lies across the travel direction in Marine's local horizontal plane.
// Rotating his upright body around it sends his head into the direction of travel.
export function rollAxisLocal(worldX, worldZ, aimYaw) {
  const c = Math.cos(aimYaw), s = Math.sin(aimYaw);
  const localRight = c * worldX - s * worldZ;
  const localForward = s * worldX + c * worldZ;
  return { x: localForward, z: -localRight };
}
