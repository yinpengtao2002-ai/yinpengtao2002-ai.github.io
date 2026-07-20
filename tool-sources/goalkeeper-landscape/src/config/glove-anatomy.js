export const GLOVE_MODEL_SCALE = 0.68;

export const GLOVE_REST_POSE = Object.freeze({
  pitch: 0,
  yaw: 0,
  roll: 0,
});

export const GLOVE_ANATOMY = {
  palmWidth: 0.39,
  palmHeight: 0.35,
  palmTopWidth: 0.41,
  cuffWidth: 0.35,
  cuffLength: 0.19,
  latexWrap: 0.014,
  fingerGap: 0.011,
  fingers: [
    { name: "index", centerX: -0.133, width: 0.075, length: 0.21 },
    { name: "middle", centerX: -0.0435, width: 0.082, length: 0.263 },
    { name: "ring", centerX: 0.0485, width: 0.08, length: 0.244 },
    { name: "little", centerX: 0.135, width: 0.071, length: 0.19 },
  ],
  thumb: {
    width: 0.084,
    proximalLength: 0.115,
    distalLength: 0.075,
    proximalAngle: 0.7,
    distalAngle: 0.82,
    rootX: 0.155,
    rootY: -0.04,
  },
};

function getThumbSide(side) {
  return side === "left" ? 1 : -1;
}

function scalePoint(point, scale) {
  return {
    x: point.x * scale,
    y: point.y * scale,
    z: (point.z || 0) * scale,
  };
}

export function getGloveFingerLayout(side, scale = 1) {
  var mirror = side === "left" ? -1 : 1;
  return GLOVE_ANATOMY.fingers.map((finger, index) => {
    var rotation = (index - 1.5) * 0.018 * mirror;
    var center = {
      x: finger.centerX * mirror,
      y: GLOVE_ANATOMY.palmHeight * 0.5 + finger.length * 0.5 - 0.024,
      z: 0.01,
    };
    var wrapRadius = (finger.width + GLOVE_ANATOMY.latexWrap * 1.5) * 0.5;
    return {
      ...finger,
      center: scalePoint(center, scale),
      width: finger.width * scale,
      length: finger.length * scale,
      rotation,
      direction: {
        x: -Math.sin(rotation),
        y: Math.cos(rotation),
        z: 0,
      },
      radius: wrapRadius * scale,
      halfLength: Math.max(0.004, (finger.length * 0.5 - wrapRadius) * scale),
    };
  });
}

export function getGloveThumbLayout(side, scale = 1) {
  var thumb = GLOVE_ANATOMY.thumb;
  var thumbSide = getThumbSide(side);
  var proximalDirection = {
    x: thumbSide * Math.sin(thumb.proximalAngle),
    y: Math.cos(thumb.proximalAngle),
    z: 0,
  };
  var distalDirection = {
    x: thumbSide * Math.sin(thumb.distalAngle),
    y: Math.cos(thumb.distalAngle),
    z: 0,
  };
  var root = {
    x: thumbSide * thumb.rootX,
    y: thumb.rootY,
    z: 0,
  };
  var joint = {
    x: root.x + proximalDirection.x * thumb.proximalLength,
    y: root.y + proximalDirection.y * thumb.proximalLength,
    z: 0,
  };
  var tip = {
    x: joint.x + distalDirection.x * thumb.distalLength,
    y: joint.y + distalDirection.y * thumb.distalLength,
    z: 0,
  };
  var proximalCenter = {
    x: root.x + proximalDirection.x * thumb.proximalLength * 0.5,
    y: root.y + proximalDirection.y * thumb.proximalLength * 0.5,
    z: 0,
  };
  var distalCenter = {
    x: joint.x + distalDirection.x * thumb.distalLength * 0.5,
    y: joint.y + distalDirection.y * thumb.distalLength * 0.5,
    z: 0,
  };

  return {
    side,
    thumbSide,
    width: thumb.width * scale,
    proximalLength: thumb.proximalLength * scale,
    distalLength: thumb.distalLength * scale,
    proximalAngle: thumb.proximalAngle,
    distalAngle: thumb.distalAngle,
    proximalDirection,
    distalDirection,
    root: scalePoint(root, scale),
    joint: scalePoint(joint, scale),
    tip: scalePoint(tip, scale),
    proximalCenter: scalePoint(proximalCenter, scale),
    distalCenter: scalePoint(distalCenter, scale),
  };
}

export function getGloveColliderLayout(side) {
  var scale = GLOVE_MODEL_SCALE;
  var fingers = getGloveFingerLayout(side, scale);
  var thumb = getGloveThumbLayout(side, scale);
  var thumbRadius = (GLOVE_ANATOMY.thumb.width + GLOVE_ANATOMY.latexWrap * 1.45) * 0.5 * scale * 0.9;
  var cuffCenterY = (-GLOVE_ANATOMY.palmHeight * 0.5 - GLOVE_ANATOMY.cuffLength * 0.5 + 0.018) * scale;
  var cuffRadius = GLOVE_ANATOMY.cuffLength * 0.44 * scale;
  var cuffHalfWidth = GLOVE_ANATOMY.cuffWidth * 0.43 * scale;

  return [
    {
      part: "palm",
      shape: "sphere",
      offset: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 1, z: 0 },
      halfLength: 0,
      radius: GLOVE_ANATOMY.palmWidth * 0.48 * scale,
    },
    {
      part: "wrist",
      shape: "capsule",
      offset: { x: 0, y: cuffCenterY, z: 0.006 },
      direction: { x: 1, y: 0, z: 0 },
      halfLength: Math.max(0.004, cuffHalfWidth - cuffRadius),
      radius: cuffRadius,
    },
    ...fingers.map((finger) => ({
      part: finger.name,
      shape: "capsule",
      offset: finger.center,
      direction: finger.direction,
      halfLength: finger.halfLength,
      radius: finger.radius,
    })),
    {
      part: "thumb-proximal",
      shape: "capsule",
      offset: thumb.proximalCenter,
      direction: thumb.proximalDirection,
      halfLength: Math.max(0.004, thumb.proximalLength * 0.5 - thumbRadius),
      radius: thumbRadius,
    },
    {
      part: "thumb-distal",
      shape: "capsule",
      offset: thumb.distalCenter,
      direction: thumb.distalDirection,
      halfLength: Math.max(0.003, thumb.distalLength * 0.5 - thumbRadius * 0.86),
      radius: thumbRadius * 0.86,
    },
  ];
}
