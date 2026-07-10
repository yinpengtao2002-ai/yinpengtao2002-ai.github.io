export function getContactEventSignature(contact, shotId = "") {
  if (!contact?.type) return null;
  if (Number.isFinite(contact.eventId)) return "contact:" + String(contact.eventId);

  var point = contact.point || { x: 0, y: 0, z: 0 };
  return [
    shotId,
    contact.type,
    Math.round((point.x || 0) * 10),
    Math.round((point.y || 0) * 10),
    Math.round((point.z || 0) * 10),
  ].join(":");
}
