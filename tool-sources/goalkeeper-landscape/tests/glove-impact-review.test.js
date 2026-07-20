import { describe, expect, it } from "vitest";

import {
  createGloveImpactCandidate,
  drawGloveImpactReview,
  finalizeGloveImpactReview,
  getGloveSilhouette,
  getGloveImpactReviewCopy,
  getGloveImpactVisual,
  selectGloveImpactCandidate,
} from "../src/game/glove-impact-review.js";

function makeContact(overrides = {}) {
  return {
    eventId: 1,
    type: "glove",
    side: "right",
    ballCenter: { x: 0.3, y: 1.2, z: 3.15 },
    gloveCenter: { x: 0.3, y: 1.2, z: 3.15 },
    ballRadius: 0.11,
    overlapDepth: 0.2,
    ...overrides,
  };
}

describe("glove impact review", () => {
  it("describes a recognisable goalkeeper glove with five distinct digits", () => {
    const right = getGloveSilhouette("right");
    const left = getGloveSilhouette("left");

    expect(right.digits.map((digit) => digit.name)).toEqual([
      "thumb",
      "index",
      "middle",
      "ring",
      "little",
    ]);
    expect(right.digits).toHaveLength(5);
    expect(right.digits[2].tip.y).toBeLessThan(right.digits[1].tip.y);
    expect(right.digits[1].tip.y).toBeLessThan(right.digits[4].tip.y);
    expect(right.digits[0].tip.x).toBeLessThan(right.palmCenter.x - 35);
    expect(left.digits.map((digit) => digit.tip.x)).toEqual(
      right.digits.map((digit) => 180 - digit.tip.x),
    );
  });
  it("keeps a caught ball centered with substantial overlap", () => {
    const candidate = createGloveImpactCandidate(makeContact({ type: "catch" }));
    const review = finalizeGloveImpactReview(candidate, "saved");
    const visual = getGloveImpactVisual(review);

    expect(review.result).toBe("save");
    expect(review.impact.overlapRatio).toBeGreaterThan(0.8);
    expect(visual.ball.x).toBeCloseTo(visual.gloveCenter.x);
    expect(visual.ball.y).toBeCloseTo(visual.gloveCenter.y);
    expect(visual.ball.radius).toBeGreaterThan(15);
  });

  it("keeps a successful assisted-save contact patch on the glove surface", () => {
    const candidate = createGloveImpactCandidate(makeContact({
      assisted: true,
      ballCenter: { x: 0.82, y: 1.2, z: 3.15 },
      contactPoint: { x: 0.48, y: 1.2, z: 3.15 },
      overlapDepth: 0.018,
    }));
    const review = finalizeGloveImpactReview(candidate, "saved");
    const visual = getGloveImpactVisual(review);

    expect(review.impact.assisted).toBe(true);
    expect(Math.abs(visual.ball.x - visual.gloveCenter.x)).toBeLessThan(40);
    expect(visual.ball.radius).toBeLessThan(review.impact.ballRadius * 165);
  });

  it("clips a successful save patch to the glove before drawing the marker", () => {
    const calls = [];
    const context = new Proxy({}, {
      get(target, property) {
        if (property in target) return target[property];
        return (...args) => calls.push({ name: property, args });
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    });
    const canvas = {
      width: 180,
      height: 184,
      dataset: {},
      getContext: () => context,
    };
    const review = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact()), "saved");

    drawGloveImpactReview(canvas, review);

    expect(calls.findIndex((call) => call.name === "clip")).toBeLessThan(
      calls.findIndex((call) => call.name === "arc"),
    );
  });

  it("keeps the full ball mostly outside the glove for a glancing touch", () => {
    const candidate = createGloveImpactCandidate(makeContact({
      ballCenter: { x: 0.61, y: 1.2, z: 3.15 },
      overlapDepth: 0.018,
    }));
    const review = finalizeGloveImpactReview(candidate, "goal");
    const visual = getGloveImpactVisual(review);

    expect(review.result).toBe("goal");
    expect(review.impact.overlapRatio).toBeLessThan(0.12);
    expect(visual.ball.x - visual.gloveCenter.x).toBeGreaterThan(visual.ball.radius * 2);
    expect(visual.ball.radius).toBeCloseTo(18.15, 1);
  });

  it("selects the strongest overlap from multiple contacts", () => {
    const glancing = createGloveImpactCandidate(makeContact({ eventId: 4, overlapDepth: 0.015 }));
    const centered = createGloveImpactCandidate(makeContact({ eventId: 5, overlapDepth: 0.16 }));

    expect(selectGloveImpactCandidate(glancing, centered)).toEqual(centered);
    expect(selectGloveImpactCandidate(centered, glancing)).toEqual(centered);
  });

  it("mirrors left and right contacts around the same glove center", () => {
    const left = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({
      side: "left",
      ballCenter: { x: 0.18, y: 1.28, z: 3.15 },
    })), "saved");
    const right = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({
      side: "right",
      ballCenter: { x: 0.42, y: 1.28, z: 3.15 },
    })), "saved");
    const leftVisual = getGloveImpactVisual(left);
    const rightVisual = getGloveImpactVisual(right);

    expect(leftVisual.gloveSide).toBe("left");
    expect(rightVisual.gloveSide).toBe("right");
    expect(leftVisual.ball.x).toBeCloseTo(180 - rightVisual.ball.x);
    expect(leftVisual.ball.y).toBeCloseTo(rightVisual.ball.y);
    expect(leftVisual.ball.radius).toBeCloseTo(rightVisual.ball.radius);
  });

  it("publishes a no-contact result with only the glove", () => {
    expect(finalizeGloveImpactReview(null, "goal")).toEqual({
      visible: true,
      result: "goal",
      impact: null,
    });
  });

  it("explains the difference between a save, a graze that goes in, and no contact", () => {
    const save = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({ type: "catch" })), "saved");
    const concededGraze = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({ overlapDepth: 0.012 })), "goal");

    expect(getGloveImpactReviewCopy(save)).toEqual({ result: "扑救成功", detail: "正面接稳" });
    expect(getGloveImpactReviewCopy(concededGraze)).toEqual({ result: "触球后失分", detail: "擦边接触，球路改变不足" });
    expect(getGloveImpactReviewCopy(finalizeGloveImpactReview(null, "goal"))).toEqual({
      result: "未触球",
      detail: "球直接进入球门",
    });
  });

  it("ignores non-glove contacts", () => {
    expect(createGloveImpactCandidate(makeContact({ type: "net" }))).toBeNull();
    expect(createGloveImpactCandidate(makeContact({ type: "frame" }))).toBeNull();
  });
});
