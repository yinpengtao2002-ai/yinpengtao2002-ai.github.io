import {
  GLOVE_ANATOMY,
  GLOVE_MODEL_SCALE,
  getGloveFingerLayout,
  getGloveThumbLayout,
} from "../config/glove-anatomy.js";
import { GLOVE_3D } from "../input/glove-controller.js";

export const GLOVE_IMPACT_CANVAS = {
  width: 220,
  height: 176,
  centerX: 110,
  centerY: 106,
  pixelsPerMeter: 220,
};

const GLOVE_PAIR_CENTERS = {
  left: {
    x: GLOVE_IMPACT_CANVAS.centerX - GLOVE_3D.spread * GLOVE_IMPACT_CANVAS.pixelsPerMeter,
    y: GLOVE_IMPACT_CANVAS.centerY,
  },
  right: {
    x: GLOVE_IMPACT_CANVAS.centerX + GLOVE_3D.spread * GLOVE_IMPACT_CANVAS.pixelsPerMeter,
    y: GLOVE_IMPACT_CANVAS.centerY,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clonePoint(point) {
  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
    z: Number(point?.z) || 0,
  };
}

export function createGloveImpactCandidate(contact) {
  if (!contact || !["glove", "catch"].includes(contact.type)) return null;
  if (!contact.ballCenter || !contact.gloveCenter) return null;

  var ballCenter = clonePoint(contact.ballCenter);
  var gloveCenter = clonePoint(contact.gloveCenter);
  var contactPoint = clonePoint(contact.contactPoint || contact.ballCenter);
  var ballRadius = Math.max(0.01, Number(contact.ballRadius) || 0.11);
  var overlapDepth = clamp(Number(contact.overlapDepth) || 0, 0, ballRadius * 2);

  return {
    eventId: contact.eventId ?? null,
    contactType: contact.type,
    side: contact.side === "left" ? "left" : contact.side === "right" ? "right" : "both",
    part: contact.part || "palm",
    assisted: Boolean(contact.assisted),
    ballRadius,
    ballCenter,
    gloveCenter,
    contactPoint,
    offset: {
      x: ballCenter.x - gloveCenter.x,
      y: ballCenter.y - gloveCenter.y,
      z: ballCenter.z - gloveCenter.z,
    },
    contactOffset: {
      x: contactPoint.x - gloveCenter.x,
      y: contactPoint.y - gloveCenter.y,
      z: contactPoint.z - gloveCenter.z,
    },
    overlapDepth,
    overlapRatio: clamp(overlapDepth / (ballRadius * 2), 0, 1),
  };
}

export function selectGloveImpactCandidate(current, candidate) {
  if (!candidate) return current || null;
  if (!current) return candidate;
  if (candidate.overlapRatio > current.overlapRatio) return candidate;
  if (candidate.overlapRatio < current.overlapRatio) return current;
  return (candidate.eventId || 0) >= (current.eventId || 0) ? candidate : current;
}

export function finalizeGloveImpactReview(candidate, outcome) {
  return {
    visible: true,
    result: outcome === "saved" ? "save" : outcome === "goal" ? "goal" : "miss",
    impact: candidate || null,
  };
}

export function getGloveImpactVisual(review) {
  var impact = review?.impact || null;
  var scale = GLOVE_IMPACT_CANVAS.pixelsPerMeter;
  var gloveSide = impact?.side || "both";
  var gloves = getGlovePair(impact?.side);
  var gloveCenter = getActiveGloveCenter(gloveSide, gloves);
  var contactOffset = impact?.contactOffset || impact?.offset || { x: 0, y: 0, z: 0 };
  var overlapDepth = clamp(impact?.overlapDepth || 0, 0, (impact?.ballRadius || 0) * 2);
  var ballRadius = impact ? impact.ballRadius * scale : 0;
  var patchRadius = impact
    ? Math.sqrt(Math.max(0, 2 * impact.ballRadius * overlapDepth - overlapDepth * overlapDepth)) * scale
    : 0;
  var contact = impact
    ? {
        x: gloveCenter.x + contactOffset.x * scale,
        y: gloveCenter.y - contactOffset.y * scale,
        radius: Math.max(2.2, patchRadius),
      }
    : null;
  var ball = impact
    ? {
        x: gloveCenter.x + impact.offset.x * scale,
        y: gloveCenter.y - impact.offset.y * scale,
        radius: ballRadius,
      }
    : null;
  return {
    width: GLOVE_IMPACT_CANVAS.width,
    height: GLOVE_IMPACT_CANVAS.height,
    gloveCenter: gloveCenter,
    gloveSide: gloveSide,
    gloves,
    result: review?.result || "miss",
    ball,
    contact,
  };
}

export function getGloveImpactReviewCopy(review) {
  if (!review?.impact) {
    return {
      result: "未触球",
      detail: review?.result === "goal" ? "球直接进入球门" : "本球没有手套接触",
    };
  }
  if (review.result === "save") {
    return {
      result: "扑救成功",
      detail: review.impact.contactType === "catch"
        ? "正面接稳"
        : review.impact.overlapRatio >= 0.42
          ? "有效挡出"
          : "擦边挡出",
    };
  }
  if (review.result === "goal") {
    return {
      result: "触球后失分",
      detail: review.impact.overlapRatio < 0.2 ? "擦边接触，球路改变不足" : "触球后仍进入球门",
    };
  }
  return { result: "触球后偏出", detail: "手套改变了球路" };
}

export function getGloveSilhouette(side = "right") {
  var center = { x: GLOVE_IMPACT_CANVAS.centerX, y: GLOVE_IMPACT_CANVAS.centerY };
  var thumb = getGloveThumbLayout(side, GLOVE_MODEL_SCALE);
  var fingers = getGloveFingerLayout(side, GLOVE_MODEL_SCALE);
  return {
    side: side === "left" ? "left" : "right",
    palmCenter: { ...center },
    thumb: {
      root: toCanvasPoint({ center }, thumb.root),
      joint: toCanvasPoint({ center }, thumb.joint),
      tip: toCanvasPoint({ center }, thumb.tip),
    },
    digits: [
      { name: "thumb", tip: toCanvasPoint({ center }, thumb.tip) },
      ...fingers.map((finger) => ({
        name: finger.name,
        tip: toCanvasPoint(
          { center },
          {
            x: finger.center.x + finger.direction.x * (finger.length * 0.5),
            y: finger.center.y + finger.direction.y * (finger.length * 0.5),
          },
        ),
      })),
    ],
  };
}

function getGlovePair(activeSide) {
  return ["left", "right"].map((side) => ({
    side,
    center: { ...GLOVE_PAIR_CENTERS[side] },
    scale: GLOVE_MODEL_SCALE,
    height: (GLOVE_ANATOMY.palmHeight + Math.max(...GLOVE_ANATOMY.fingers.map((finger) => finger.length)))
      * GLOVE_MODEL_SCALE * GLOVE_IMPACT_CANVAS.pixelsPerMeter,
    active: activeSide === side || activeSide === "both",
  }));
}

function getActiveGloveCenter(side, gloves) {
  if (side === "left" || side === "right") {
    return { ...gloves.find((glove) => glove.side === side).center };
  }
  return {
    x: (gloves[0].center.x + gloves[1].center.x) / 2,
    y: (gloves[0].center.y + gloves[1].center.y) / 2,
  };
}

function toCanvasPoint(glove, point) {
  return {
    x: glove.center.x + (point?.x || 0) * GLOVE_IMPACT_CANVAS.pixelsPerMeter,
    y: glove.center.y - (point?.y || 0) * GLOVE_IMPACT_CANVAS.pixelsPerMeter,
  };
}

function getGloveOutline(side) {
  var scale = GLOVE_MODEL_SCALE;
  var thumb = getGloveThumbLayout(side, scale);
  var fingers = getGloveFingerLayout(side, scale);
  var thumbSide = thumb.thumbSide;
  var palmHalfWidth = GLOVE_ANATOMY.palmWidth * 0.5 * scale;
  var palmHalfHeight = GLOVE_ANATOMY.palmHeight * 0.5 * scale;
  var cuffHalfWidth = GLOVE_ANATOMY.cuffWidth * 0.5 * scale;
  var cuffBottom = -palmHalfHeight - GLOVE_ANATOMY.cuffLength * scale + 0.018 * scale;
  var outline = [
    { x: thumbSide * cuffHalfWidth * 0.86, y: cuffBottom },
    { x: thumbSide * cuffHalfWidth, y: -palmHalfHeight - 0.02 * scale },
    { x: thumbSide * palmHalfWidth, y: -palmHalfHeight * 0.5 },
    { x: thumbSide * palmHalfWidth * 1.02, y: thumb.root.y - 0.025 * scale },
    { x: thumb.root.x + thumbSide * thumb.width * 0.44, y: thumb.root.y - thumb.width * 0.18 },
    { x: thumb.tip.x + thumbSide * thumb.width * 0.42, y: thumb.tip.y - thumb.width * 0.08 },
    { x: thumb.tip.x + thumbSide * thumb.width * 0.14, y: thumb.tip.y + thumb.width * 0.48 },
    { x: thumb.joint.x - thumbSide * thumb.width * 0.42, y: thumb.joint.y + thumb.width * 0.4 },
    { x: thumbSide * palmHalfWidth * 0.96, y: palmHalfHeight * 0.72 },
  ];

  fingers.forEach((finger, index) => {
    var halfWidth = finger.radius;
    var tipCenter = {
      x: finger.center.x + finger.direction.x * (finger.length * 0.5 - halfWidth * 0.55),
      y: finger.center.y + finger.direction.y * (finger.length * 0.5 - halfWidth * 0.55),
    };
    var sideEdgeX = finger.center.x + thumbSide * halfWidth;
    var outerEdgeX = finger.center.x - thumbSide * halfWidth;
    outline.push(
      { x: sideEdgeX, y: palmHalfHeight * 0.92 },
      { x: tipCenter.x + thumbSide * halfWidth, y: tipCenter.y },
      { x: tipCenter.x, y: tipCenter.y + halfWidth * 0.64 },
      { x: tipCenter.x - thumbSide * halfWidth, y: tipCenter.y },
    );
    if (index < fingers.length - 1) {
      var next = fingers[index + 1];
      outline.push({
        x: (outerEdgeX + next.center.x + thumbSide * next.radius) * 0.5,
        y: palmHalfHeight + 0.02 * scale,
      });
    }
  });

  outline.push(
    { x: -thumbSide * palmHalfWidth, y: palmHalfHeight * 0.74 },
    { x: -thumbSide * palmHalfWidth * 1.02, y: -palmHalfHeight * 0.56 },
    { x: -thumbSide * cuffHalfWidth, y: -palmHalfHeight - 0.02 * scale },
    { x: -thumbSide * cuffHalfWidth * 0.86, y: cuffBottom },
  );
  return outline;
}

function traceGlove(context, glove) {
  var points = getGloveOutline(glove.side).map((point) => toCanvasPoint(glove, point));
  var first = points[0];
  var last = points[points.length - 1];
  context.beginPath();
  context.moveTo((last.x + first.x) * 0.5, (last.y + first.y) * 0.5);
  points.forEach((point, index) => {
    var next = points[(index + 1) % points.length];
    context.quadraticCurveTo(point.x, point.y, (point.x + next.x) * 0.5, (point.y + next.y) * 0.5);
  });
  context.closePath();
}

function traceEllipse(context, centerX, centerY, radiusX, radiusY) {
  var kappa = 0.5522847498;
  context.moveTo(centerX + radiusX, centerY);
  context.bezierCurveTo(
    centerX + radiusX,
    centerY + radiusY * kappa,
    centerX + radiusX * kappa,
    centerY + radiusY,
    centerX,
    centerY + radiusY,
  );
  context.bezierCurveTo(
    centerX - radiusX * kappa,
    centerY + radiusY,
    centerX - radiusX,
    centerY + radiusY * kappa,
    centerX - radiusX,
    centerY,
  );
  context.bezierCurveTo(
    centerX - radiusX,
    centerY - radiusY * kappa,
    centerX - radiusX * kappa,
    centerY - radiusY,
    centerX,
    centerY - radiusY,
  );
  context.bezierCurveTo(
    centerX + radiusX * kappa,
    centerY - radiusY,
    centerX + radiusX,
    centerY - radiusY * kappa,
    centerX + radiusX,
    centerY,
  );
  context.closePath();
}

function drawGloveDetails(context, glove) {
  var fingers = getGloveFingerLayout(glove.side, GLOVE_MODEL_SCALE);
  var thumb = getGloveThumbLayout(glove.side, GLOVE_MODEL_SCALE);
  context.save();
  context.strokeStyle = "rgba(247, 250, 253, 0.5)";
  context.lineWidth = 1.4;
  context.lineCap = "round";

  fingers.forEach((finger) => {
    var start = toCanvasPoint(glove, {
      x: finger.center.x,
      y: GLOVE_ANATOMY.palmHeight * 0.5 * GLOVE_MODEL_SCALE,
    });
    var end = toCanvasPoint(glove, {
      x: finger.center.x,
      y: finger.center.y + finger.length * 0.18,
    });
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  });

  var thumbJoint = toCanvasPoint(glove, thumb.joint);
  var thumbWidth = thumb.width * GLOVE_IMPACT_CANVAS.pixelsPerMeter;
  context.beginPath();
  traceEllipse(
    context,
    thumbJoint.x,
    thumbJoint.y,
    Math.max(2, thumbWidth * 0.42),
    Math.max(1.6, thumbWidth * 0.34),
  );
  context.stroke();

  var palmCenter = toCanvasPoint(glove, { x: 0, y: -0.01 * GLOVE_MODEL_SCALE });
  context.beginPath();
  traceEllipse(
    context,
    palmCenter.x,
    palmCenter.y,
    GLOVE_ANATOMY.palmWidth * GLOVE_MODEL_SCALE * GLOVE_IMPACT_CANVAS.pixelsPerMeter * 0.38,
    GLOVE_ANATOMY.palmHeight * GLOVE_MODEL_SCALE * GLOVE_IMPACT_CANVAS.pixelsPerMeter * 0.32,
  );
  context.stroke();
  context.restore();
}

function drawGlove(context, glove) {
  context.save();
  traceGlove(context, glove);
  context.fillStyle = glove.active ? "rgba(184, 193, 205, 0.76)" : "rgba(161, 171, 184, 0.46)";
  context.strokeStyle = glove.active ? "rgba(236, 241, 247, 0.92)" : "rgba(218, 225, 234, 0.62)";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  drawGloveDetails(context, glove);
  context.restore();
}

function drawFootballReference(context, ball, color) {
  context.save();
  context.beginPath();
  context.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  context.fillStyle = "rgba(238, 243, 249, 0.14)";
  context.strokeStyle = "rgba(" + color + ", 0.96)";
  context.lineWidth = 2.4;
  context.fill();
  context.stroke();

  var panelRadius = ball.radius * 0.17;
  context.beginPath();
  for (var index = 0; index < 5; index += 1) {
    var angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    var panelX = ball.x + Math.cos(angle) * panelRadius;
    var panelY = ball.y + Math.sin(angle) * panelRadius;
    if (index === 0) context.moveTo(panelX, panelY);
    else context.lineTo(panelX, panelY);
  }
  context.closePath();
  context.fillStyle = "rgba(12, 24, 44, 0.48)";
  context.strokeStyle = "rgba(245, 248, 252, 0.46)";
  context.lineWidth = 1.1;
  context.fill();
  context.stroke();

  context.beginPath();
  for (var spoke = 0; spoke < 5; spoke += 1) {
    var spokeAngle = -Math.PI / 2 + spoke * Math.PI * 2 / 5;
    context.moveTo(
      ball.x + Math.cos(spokeAngle) * panelRadius,
      ball.y + Math.sin(spokeAngle) * panelRadius,
    );
    context.lineTo(
      ball.x + Math.cos(spokeAngle) * ball.radius * 0.58,
      ball.y + Math.sin(spokeAngle) * ball.radius * 0.58,
    );
  }
  context.strokeStyle = "rgba(245, 248, 252, 0.32)";
  context.stroke();
  context.restore();
}

export function drawGloveImpactReview(canvas, review) {
  var context = canvas?.getContext?.("2d");
  if (!context) return null;
  var visual = getGloveImpactVisual(review);
  var impactContactOffset = review?.impact?.contactOffset || review?.impact?.offset || null;
  var scale = Math.min(canvas.width / visual.width, canvas.height / visual.height) || 1;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, 0, 0);

  visual.gloves.forEach((glove) => drawGlove(context, glove));

  if (visual.ball) {
    var color = review.result === "save" ? "94, 224, 164" : review.result === "goal" ? "255, 105, 105" : "212, 220, 230";
    drawFootballReference(context, visual.ball, color);

    visual.gloves.filter((glove) => glove.active).forEach((glove) => {
      context.save();
      traceGlove(context, glove);
      context.clip();
      context.beginPath();
      context.arc(visual.ball.x, visual.ball.y, visual.ball.radius, 0, Math.PI * 2);
      context.fillStyle = "rgba(" + color + ", 0.3)";
      context.fill();
      if (visual.contact) {
        context.beginPath();
        context.arc(visual.contact.x, visual.contact.y, visual.contact.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + color + ", 0.9)";
        context.strokeStyle = "rgba(250, 252, 255, 0.96)";
        context.lineWidth = 1.6;
        context.fill();
        context.stroke();
      }
      context.restore();
    });
  }

  canvas.dataset.ballX = visual.ball ? String(Math.round(visual.ball.x * 100) / 100) : "";
  canvas.dataset.ballY = visual.ball ? String(Math.round(visual.ball.y * 100) / 100) : "";
  canvas.dataset.ballRadius = visual.ball ? String(Math.round(visual.ball.radius * 100) / 100) : "";
  canvas.dataset.contactX = visual.contact ? String(Math.round(visual.contact.x * 100) / 100) : "";
  canvas.dataset.contactY = visual.contact ? String(Math.round(visual.contact.y * 100) / 100) : "";
  canvas.dataset.contactRadius = visual.contact ? String(Math.round(visual.contact.radius * 100) / 100) : "";
  canvas.dataset.activeGloves = visual.gloves.filter((glove) => glove.active).map((glove) => glove.side).join(",");
  canvas.dataset.contactPart = review?.impact?.part || "";
  canvas.dataset.pixelsPerMeter = String(GLOVE_IMPACT_CANVAS.pixelsPerMeter);
  canvas.dataset.gloveCenterX = String(Math.round(visual.gloveCenter.x * 100) / 100);
  canvas.dataset.gloveCenterY = String(Math.round(visual.gloveCenter.y * 100) / 100);
  canvas.dataset.ballOffsetX = review?.impact ? String(review.impact.offset.x) : "";
  canvas.dataset.ballOffsetY = review?.impact ? String(review.impact.offset.y) : "";
  canvas.dataset.contactOffsetX = impactContactOffset ? String(impactContactOffset.x) : "";
  canvas.dataset.contactOffsetY = impactContactOffset ? String(impactContactOffset.y) : "";
  return visual;
}
