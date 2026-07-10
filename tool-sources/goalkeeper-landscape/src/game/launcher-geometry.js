export const LAUNCHER_GEOMETRY = {
  basePosition: { x: 0, y: 0, z: -19 },
  scale: 1.68,
  turretPivot: { x: 0, y: 1.1, z: 0.12 },
  muzzleOffset: { x: 0, y: 0, z: 0.71 },
  releasePitch: -0.08,
  releaseYaw: 0.08,
  releaseRecoilZ: -0.09,
};

export function getLauncherReleaseOrigin(side = 0, geometry = LAUNCHER_GEOMETRY) {
  var sideDirection = side < 0 ? -1 : side > 0 ? 1 : 0;
  var yaw = geometry.releaseYaw * sideDirection;
  var pitch = geometry.releasePitch;
  var releaseDistance = geometry.muzzleOffset.z + geometry.releaseRecoilZ;
  var cosYaw = Math.cos(yaw);
  var sinYaw = Math.sin(yaw);
  var cosPitch = Math.cos(pitch);
  var sinPitch = Math.sin(pitch);

  return {
    x: geometry.basePosition.x + geometry.scale * (
      geometry.turretPivot.x + releaseDistance * sinYaw
    ),
    y: geometry.basePosition.y + geometry.scale * (
      geometry.turretPivot.y - releaseDistance * cosYaw * sinPitch
    ),
    z: geometry.basePosition.z + geometry.scale * (
      geometry.turretPivot.z + releaseDistance * cosYaw * cosPitch
    ),
  };
}
