import { describe, expect, it } from "vitest";

import {
  GLOVE_IMPACT_CANVAS,
  createGloveImpactCandidate,
  drawGloveImpactReview,
  finalizeGloveImpactReview,
  getGloveSilhouette,
  getGloveOutlinePolygon,
  getGloveImpactReviewCopy,
  getGloveImpactVisual,
  selectGloveImpactCandidate,
} from "../src/game/glove-impact-review.js";
import { getGloveColliderLayout } from "../src/config/glove-anatomy.js";

function isPointInsidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = (currentPoint.y > point.y) !== (previousPoint.y > point.y)
      && point.x < (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function sampleColliderInterior(part) {
  const inset = 0.76;
  const samples = [];
  const axisPoints = [-1, 0, 1].map((position) => ({
    x: part.offset.x + (part.direction?.x || 0) * part.halfLength * position * inset,
    y: part.offset.y + (part.direction?.y || 0) * part.halfLength * position * inset,
  }));
  axisPoints.forEach((center) => {
    for (let index = 0; index < 32; index += 1) {
      const angle = index / 32 * Math.PI * 2;
      samples.push({
        x: center.x + Math.cos(angle) * part.radius * inset,
        y: center.y + Math.sin(angle) * part.radius * inset,
      });
    }
  });
  return samples;
}

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
  it("keeps the full core of every physical glove collider inside the replayed hand silhouette", () => {
    ["left", "right"].forEach((side) => {
      const polygon = getGloveOutlinePolygon(side, 48);
      getGloveColliderLayout(side).forEach((part) => {
        const outside = sampleColliderInterior(part).filter((point) => !isPointInsidePolygon(point, polygon));
        expect(outside, `${side} ${part.part} has collider area outside the replay silhouette`).toHaveLength(0);
      });
    });
  });

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
    expect(right.palmCenter.x - right.digits[0].tip.x).toBeGreaterThan(38);
    expect(right.palmCenter.x - right.digits[0].tip.x).toBeLessThan(58);
    expect(right.digits[0].tip.y).toBeLessThan(right.palmCenter.y);
    expect(right.digits[0].tip.y).toBeGreaterThan(right.digits[1].tip.y + 35);
    expect(left.digits.map((digit) => digit.tip.x)).toEqual(
      right.digits.map((digit) => GLOVE_IMPACT_CANVAS.width - digit.tip.x),
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
    expect(visual.ball.radius).toBeCloseTo(0.11 * GLOVE_IMPACT_CANVAS.pixelsPerMeter);
    expect(visual.ball.radius * 2).toBeGreaterThan(visual.gloves[0].height * 0.5);
    expect(visual.contact.x).toBeCloseTo(visual.gloveCenter.x);
    expect(visual.contact.y).toBeCloseTo(visual.gloveCenter.y);
  });

  it("uses one physical scale for the ball center, contact point, and ball radius", () => {
    const candidate = createGloveImpactCandidate(makeContact({
      ballCenter: { x: 0.4, y: 1.32, z: 3.15 },
      gloveCenter: { x: 0.3, y: 1.2, z: 3.15 },
      contactPoint: { x: 0.35, y: 1.26, z: 3.15 },
      overlapDepth: 0.04,
    }));
    const visual = getGloveImpactVisual(finalizeGloveImpactReview(candidate, "saved"));
    const scale = GLOVE_IMPACT_CANVAS.pixelsPerMeter;

    expect(visual.ball.x - visual.gloveCenter.x).toBeCloseTo(0.1 * scale);
    expect(visual.ball.y - visual.gloveCenter.y).toBeCloseTo(-0.12 * scale);
    expect(visual.contact.x - visual.gloveCenter.x).toBeCloseTo(0.05 * scale);
    expect(visual.contact.y - visual.gloveCenter.y).toBeCloseTo(-0.06 * scale);
    expect(visual.ball.radius).toBeCloseTo(0.11 * scale);
  });

  it("uses the exact sphere intersection for the displayed contact area", () => {
    const ballRadius = 0.11;
    const colliderRadius = 0.13;
    const centerDistance = 0.12;
    const candidate = createGloveImpactCandidate(makeContact({
      ballCenter: { x: 0.42, y: 1.2, z: 3.15 },
      gloveCenter: { x: 0.3, y: 1.2, z: 3.15 },
      contactPoint: { x: 0.43, y: 1.2, z: 3.15 },
      colliderCenter: { x: 0.3, y: 1.2, z: 3.15 },
      colliderRadius,
      colliderShape: "sphere",
      ballRadius,
      overlapDepth: ballRadius + colliderRadius - centerDistance,
    }));
    const visual = getGloveImpactVisual(finalizeGloveImpactReview(candidate, "saved"));
    const ballPlaneDistance = (
      centerDistance * centerDistance + ballRadius * ballRadius - colliderRadius * colliderRadius
    ) / (2 * centerDistance);
    const expectedRadius = Math.sqrt(ballRadius * ballRadius - ballPlaneDistance * ballPlaneDistance)
      * GLOVE_IMPACT_CANVAS.pixelsPerMeter;

    expect(candidate.colliderCenter).toEqual({ x: 0.3, y: 1.2, z: 3.15 });
    expect(candidate.colliderRadius).toBe(colliderRadius);
    expect(candidate.colliderShape).toBe("sphere");
    expect(visual.contact.radius).toBeCloseTo(expectedRadius, 5);
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
    expect(visual.ball.radius).toBeCloseTo(0.11 * GLOVE_IMPACT_CANVAS.pixelsPerMeter);
    expect(visual.contact.radius).toBeLessThan(visual.ball.radius);
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
    expect(canvas.dataset.contactPart).toBe("palm");
    expect(Number(canvas.dataset.pixelsPerMeter)).toBe(GLOVE_IMPACT_CANVAS.pixelsPerMeter);
    expect(Number(canvas.dataset.ballOffsetX)).toBeCloseTo(0);
    expect(Number(canvas.dataset.ballOffsetY)).toBeCloseTo(0);
  });

  it("keeps the complete ball inside the review canvas for an outer-edge save", () => {
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
      width: 440,
      height: 352,
      dataset: {},
      getContext: () => context,
    };
    const review = finalizeGloveImpactReview(createGloveImpactCandidate(makeContact({
      side: "left",
      gloveCenter: { x: 0.3, y: 1.2, z: 3.15 },
      ballCenter: { x: 0.056, y: 1.2, z: 3.15 },
      contactPoint: { x: 0.166, y: 1.2, z: 3.15 },
      overlapDepth: 0.018,
    })), "saved");

    drawGloveImpactReview(canvas, review);

    expect(Number(canvas.dataset.ballX)).toBeLessThan(0);
    expect(Number(canvas.dataset.renderBallLeft)).toBeGreaterThanOrEqual(4);
    expect(Number(canvas.dataset.renderBallRight)).toBeLessThanOrEqual(GLOVE_IMPACT_CANVAS.width - 4);
    expect(Number(canvas.dataset.renderScale)).toBeLessThan(1);
    expect(Number(canvas.dataset.ballOffsetX)).toBeCloseTo(-0.244);
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
    expect(visual.gloveCenter.x).toBeCloseTo(GLOVE_IMPACT_CANVAS.centerX);
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
    expect(visual.ball.radius).toBeCloseTo(0.11 * GLOVE_IMPACT_CANVAS.pixelsPerMeter);
    expect(Math.abs(visual.contact.x - visual.gloveCenter.x)).toBeLessThan(40);
  });

  it("selects the strongest overlap from multiple contacts", () => {
    const glancing = createGloveImpactCandidate(makeContact({ eventId: 4, overlapDepth: 0.015 }));
    const centered = createGloveImpactCandidate(makeContact({ eventId: 5, overlapDepth: 0.16 }));

    expect(selectGloveImpactCandidate(glancing, centered)).toEqual(centered);
    expect(selectGloveImpactCandidate(centered, glancing)).toEqual(centered);
  });

  it("preserves the local left-right contact position on each glove", () => {
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
    expect(leftVisual.ball.x).toBeLessThan(leftVisual.gloveCenter.x);
    expect(rightVisual.ball.x).toBeGreaterThan(rightVisual.gloveCenter.x);
    expect(leftVisual.ball.x).toBeCloseTo(GLOVE_IMPACT_CANVAS.width - rightVisual.ball.x);
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
