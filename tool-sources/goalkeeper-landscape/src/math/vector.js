export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function length2(vector) {
  return Math.hypot(vector.x, vector.y);
}

export function length3(vector) {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalize2(vector) {
  var length = length2(vector);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function normalize3(vector) {
  var length = length3(vector);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function dot3(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function scale3(vector, scalar) {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
    z: vector.z * scalar,
  };
}

export function add3(a, b) {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function subtract3(a, b) {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}
