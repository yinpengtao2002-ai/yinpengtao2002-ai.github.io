import { describe, expect, it } from "vitest";
import { getContactEventSignature } from "../src/game/contact-event.js";

describe("contact event identity", () => {
  it("keeps one glove impact identity even if later frames or shot ownership change", () => {
    const contact = {
      eventId: 17,
      type: "glove",
      point: { x: 0.28, y: 1.32, z: 3.08 },
    };

    expect(getContactEventSignature(contact, 4)).toBe("contact:17");
    expect(getContactEventSignature({ ...contact, point: { x: 0.31, y: 1.3, z: 3.02 } }, 5)).toBe("contact:17");
  });

  it("keeps a coordinate fallback for non-physics contacts", () => {
    expect(getContactEventSignature({
      type: "net",
      point: { x: 0.24, y: 1.1, z: 4.65 },
    }, 8)).toBe("8:net:2:11:47");
  });
});
