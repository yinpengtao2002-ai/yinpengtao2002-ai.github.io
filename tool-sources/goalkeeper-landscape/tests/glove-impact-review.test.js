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
    expect(visual.gloves.map((glove) => glove.side)).toEqual(["left", "right"]);
    expect(visual.gloves.filter((glove) => glove.active).map((glove) => glove.side)).toEqual(["right"]);
    expect(visual.ball.radius).toBeGreaterThan(38);
    expect(visual.ball.radius * 2).toBeGreaterThan(141 * visual.gloves[0].scale * 0.7);
    expect(visual.contact.x).toBeCloseTo(visual.gloveCenter.x);
    expect(visual.contact.y).toBeCloseTo(visual.gloveCenter.y);
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
    expect(Math.abs(visual.contact.x - visual.gloveCenter.x)).toBeLessThan(40);
    expect(visual.ball.radius).toBeGreaterThan(38);
    expect(visual.contact.radius).toBeLessThan(visual.ball.radius / 4);
  });

  it("draws the regulation-size ball before clipping the smaller contact patch to the glove", () => {
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

    const arcIndexes = calls
      .map((call, index) => call.name === "arc" ? index : -1)
      .filter((index) => index >= 0);
    const clipIndex = calls.findIndex((call) => call.name === "clip");

    expect(arcIndexes).toHaveLength(3);
    expect(arcIndexes[0]).toBeLessThan(clipIndex);
    expect(clipIndex).toBeLessThan(arcIndexes[1]);
  });

  it("highlights both gloves and clips the contact against both for a two-handed catch", () => {
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
    const review = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({
      type: "catch",
      side: "both",
      ballCenter: { x: 0, y: 1.2, z: 3.15 },
      gloveCenter: { x: 0, y: 1.2, z: 3.15 },
      contactPoint: { x: 0, y: 1.2, z: 3.15 },
    })), "saved");
    const visual = drawGloveImpactReview(canvas, review);
    const arcCount = calls.filter((call) => call.name === "arc").length;

    expect(visual.gloves).toHaveLength(2);
    expect(visual.gloves.every((glove) => glove.active)).toBe(true);
    expect(visual.gloveCenter.x).toBeCloseTo(90);
    expect(arcCount).toBe(5);
  });

  it("keeps the full ball mostly outside the glove for a glancing touch", () => {
    const candidate = createGloveImpactCandidate(makeContact({
      ballCenter: { x: 0.61, y: 1.2, z: 3.15 },
      contactPoint: { x: 0.48, y: 1.2, z: 3.15 },
      overlapDepth: 0.018,
    }));
    const review = finalizeGloveImpactReview(candidate, "goal");
    const visual = getGloveImpactVisual(review);

    expect(review.result).toBe("goal");
    expect(review.impact.overlapRatio).toBeLessThan(0.12);
    expect(visual.ball.radius).toBeGreaterThan(38);
    expect(Math.abs(visual.contact.x - visual.gloveCenter.x)).toBeLessThan(40);
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

  it("keeps both gray gloves visible when the ball never made contact", () => {
    const review = finalizeGloveImpactReview(null, "goal");
    const visual = getGloveImpactVisual(review);

    expect(review).toEqual({
      visible: true,
      result: "goal",
      impact: null,
    });
    expect(visual.gloves).toHaveLength(2);
    expect(visual.gloves.every((glove) => !glove.active)).toBe(true);
    expect(visual.ball).toBeNull();
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
