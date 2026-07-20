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

function distanceBetweenPoints(a, b) {
  return Math.hypot(
    (a?.x || 0) - (b?.x || 0),
    (a?.y || 0) - (b?.y || 0),
    (a?.z || 0) - (b?.z || 0),
  );
}

export function getSphereIntersectionRadius(ballRadius, colliderRadius, centerDistance) {
  var ball = Math.max(0, Number(ballRadius) || 0);
  var collider = Math.max(0, Number(colliderRadius) || 0);
  var distance = Math.max(0, Number(centerDistance) || 0);
  if (ball === 0 || collider === 0 || distance >= ball + collider) return 0;
  if (distance <= Math.abs(ball - collider) || distance < 0.000001) return Math.min(ball, collider);

  var planeDistance = (
    distance * distance + ball * ball - collider * collider
  ) / (2 * distance);
  return Math.sqrt(Math.max(0, ball * ball - planeDistance * planeDistance));
}

export function createGloveImpactCandidate(contact) {
  if (!contact || !["glove", "catch"].includes(contact.type)) return null;
  if (!contact.ballCenter || !contact.gloveCenter) return null;

  var ballCenter = clonePoint(contact.ballCenter);
  var replayBallCenter = contact.replayBallCenter ? clonePoint(contact.replayBallCenter) : null;
  var displayedBallCenter = replayBallCenter || ballCenter;
  var gloveCenter = clonePoint(contact.gloveCenter);
  var contactPoint = clonePoint(contact.contactPoint || contact.ballCenter);
  var ballRadius = Math.max(0.01, Number(contact.ballRadius) || 0.11);
  var overlapDepth = clamp(Number(contact.overlapDepth) || 0, 0, ballRadius * 2);
  var colliderCenter = contact.colliderCenter ? clonePoint(contact.colliderCenter) : null;
  var colliderRadius = Math.max(0, Number(contact.colliderRadius) || 0);

  return {
    eventId: contact.eventId ?? null,
    contactType: contact.type,
    side: contact.side === "left" ? "left" : contact.side === "right" ? "right" : "both",
    part: contact.part || "palm",
    assisted: Boolean(contact.assisted),
    contactSource: contact.contactSource || null,
    ballRadius,
    ballCenter,
    replayBallCenter,
    gloveCenter,
    contactPoint,
    colliderCenter,
    colliderRadius,
    colliderShape: contact.colliderShape || null,
    offset: {
      x: ballCenter.x - gloveCenter.x,
      y: ballCenter.y - gloveCenter.y,
      z: ballCenter.z - gloveCenter.z,
    },
    replayOffset: {
      x: displayedBallCenter.x - gloveCenter.x,
      y: displayedBallCenter.y - gloveCenter.y,
      z: displayedBallCenter.z - gloveCenter.z,
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
  var ballOffset = impact?.assisted
    ? impact?.offset
    : impact?.replayOffset || impact?.offset;
  ballOffset ||= { x: 0, y: 0, z: 0 };
  var displayedBallCenter = impact?.assisted
    ? impact?.ballCenter || null
    : impact?.replayBallCenter || impact?.ballCenter || null;
  var contactOffset = impact?.contactOffset || impact?.offset || { x: 0, y: 0, z: 0 };
  var overlapDepth = clamp(impact?.overlapDepth || 0, 0, (impact?.ballRadius || 0) * 2);
  var ballRadius = impact ? impact.ballRadius * scale : 0;
  var physicalPatchRadius = impact?.colliderCenter && impact.colliderRadius > 0
    ? getSphereIntersectionRadius(
        impact.ballRadius,
        impact.colliderRadius,
        distanceBetweenPoints(displayedBallCenter, impact.colliderCenter),
      )
    : null;
  var patchRadius = impact
    ? (physicalPatchRadius ?? Math.sqrt(Math.max(0, 2 * impact.ballRadius * overlapDepth - overlapDepth * overlapDepth)))
      * scale
    : 0;
  var contact = impact && !impact.assisted
    ? {
        x: gloveCenter.x + contactOffset.x * scale,
        y: gloveCenter.y - contactOffset.y * scale,
        radius: patchRadius,
      }
    : null;
  var ball = impact
    ? {
        x: gloveCenter.x + ballOffset.x * scale,
        y: gloveCenter.y - ballOffset.y * scale,
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
  if (review.result === "save" && review.impact.assisted) {
    return {
      result: "辅助扑出",
      detail: "扑救辅助生效，足球未直接接触手套",
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
  var thumbRadius = (GLOVE_ANATOMY.thumb.width + GLOVE_ANATOMY.latexWrap * 1.45) * 0.5 * scale;
  var thumbTipRadius = thumbRadius * 0.86;
  var proximalOutward = {
    x: thumbSide * thumb.proximalDirection.y,
    y: -thumbSide * thumb.proximalDirection.x,
  };
  var distalOutward = {
    x: thumbSide * thumb.distalDirection.y,
    y: -thumbSide * thumb.distalDirection.x,
  };
  var outline = [
    { x: thumbSide * cuffHalfWidth * 0.86, y: cuffBottom },
    { x: thumbSide * cuffHalfWidth, y: -palmHalfHeight - 0.02 * scale },
    { x: thumbSide * palmHalfWidth, y: -palmHalfHeight * 0.5 },
    { x: thumbSide * palmHalfWidth * 1.02, y: thumb.root.y - thumbRadius * 0.4 },
    {
      x: thumb.root.x + proximalOutward.x * thumbRadius,
      y: thumb.root.y + proximalOutward.y * thumbRadius,
    },
    {
      x: thumb.joint.x + proximalOutward.x * thumbRadius,
      y: thumb.joint.y + proximalOutward.y * thumbRadius,
    },
    {
      x: thumb.joint.x + distalOutward.x * thumbTipRadius,
      y: thumb.joint.y + distalOutward.y * thumbTipRadius,
    },
    {
      x: thumb.tip.x + distalOutward.x * thumbTipRadius,
      y: thumb.tip.y + distalOutward.y * thumbTipRadius,
    },
    {
      x: thumb.tip.x + thumb.distalDirection.x * thumbTipRadius,
      y: thumb.tip.y + thumb.distalDirection.y * thumbTipRadius,
    },
    {
      x: thumb.tip.x - distalOutward.x * thumbTipRadius,
      y: thumb.tip.y - distalOutward.y * thumbTipRadius,
    },
    {
      x: thumb.joint.x - distalOutward.x * thumbTipRadius,
      y: thumb.joint.y - distalOutward.y * thumbTipRadius,
    },
    {
      x: thumb.joint.x - proximalOutward.x * thumbRadius,
      y: thumb.joint.y - proximalOutward.y * thumbRadius,
    },
    {
      x: thumb.root.x - proximalOutward.x * thumbRadius * 0.75,
      y: thumb.root.y - proximalOutward.y * thumbRadius * 0.75,
    },
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

export function getGloveOutlinePolygon(side, curveSegments = 10) {
  var controls = getGloveOutline(side);
  var segments = Math.max(2, Math.floor(curveSegments));
  var polygon = [];
  controls.forEach((control, index) => {
    var previous = controls[(index - 1 + controls.length) % controls.length];
    var next = controls[(index + 1) % controls.length];
    var start = {
      x: (previous.x + control.x) * 0.5,
      y: (previous.y + control.y) * 0.5,
    };
    var end = {
      x: (control.x + next.x) * 0.5,
      y: (control.y + next.y) * 0.5,
    };
    for (var step = 0; step < segments; step += 1) {
      var t = step / segments;
      var inverse = 1 - t;
      polygon.push({
        x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
        y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
      });
    }
  });
  return polygon;
}

function getGloveImpactContentBounds(visual) {
  var points = visual.gloves.flatMap((glove) => (
    getGloveOutlinePolygon(glove.side, 24).map((point) => toCanvasPoint(glove, point))
  ));
  if (visual.ball) {
    points.push(
      { x: visual.ball.x - visual.ball.radius, y: visual.ball.y - visual.ball.radius },
      { x: visual.ball.x + visual.ball.radius, y: visual.ball.y + visual.ball.radius },
    );
  }
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: visual.width, maxY: visual.height };
  }
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

export function getGloveImpactRenderTransform(visual, padding = 5) {
  var bounds = getGloveImpactContentBounds(visual);
  var contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  var contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  var availableWidth = Math.max(1, visual.width - padding * 2);
  var availableHeight = Math.max(1, visual.height - padding * 2);
  var scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight);
  var offsetX = 0;
  var offsetY = 0;

  if (scale < 0.999999) {
    offsetX = (visual.width - (bounds.minX + bounds.maxX) * scale) * 0.5;
    offsetY = (visual.height - (bounds.minY + bounds.maxY) * scale) * 0.5;
  } else {
    if (bounds.minX < padding) offsetX = padding - bounds.minX;
    if (bounds.maxX + offsetX > visual.width - padding) {
      offsetX = visual.width - padding - bounds.maxX;
    }
    if (bounds.minY < padding) offsetY = padding - bounds.minY;
    if (bounds.maxY + offsetY > visual.height - padding) {
      offsetY = visual.height - padding - bounds.maxY;
    }
  }

  return { scale, offsetX, offsetY, bounds };
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
  var thumbCreaseHalf = thumbWidth * 0.3;
  var thumbCreaseDirection = {
    x: thumb.distalDirection.y,
    y: thumb.distalDirection.x,
  };
  context.beginPath();
  context.moveTo(
    thumbJoint.x - thumbCreaseDirection.x * thumbCreaseHalf,
    thumbJoint.y - thumbCreaseDirection.y * thumbCreaseHalf,
  );
  context.lineTo(
    thumbJoint.x + thumbCreaseDirection.x * thumbCreaseHalf,
    thumbJoint.y + thumbCreaseDirection.y * thumbCreaseHalf,
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
  var impactReplayOffset = review?.impact?.replayOffset || review?.impact?.offset || null;
  var scale = Math.min(canvas.width / visual.width, canvas.height / visual.height) || 1;
  var renderTransform = getGloveImpactRenderTransform(visual);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(
    scale * renderTransform.scale,
    0,
    0,
    scale * renderTransform.scale,
    scale * renderTransform.offsetX,
    scale * renderTransform.offsetY,
  );

  visual.gloves.forEach((glove) => drawGlove(context, glove));

  if (visual.ball) {
    var color = review.result === "save" ? "94, 224, 164" : review.result === "goal" ? "255, 105, 105" : "212, 220, 230";
    drawFootballReference(context, visual.ball, color);

    if (!review?.impact?.assisted) {
      visual.gloves.filter((glove) => glove.active).forEach((glove) => {
        context.save();
        traceGlove(context, glove);
        context.clip();
        context.beginPath();
        context.arc(visual.ball.x, visual.ball.y, visual.ball.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + color + ", 0.3)";
        context.fill();
        if (visual.contact) {
          var markerRadius = Math.max(1.6, visual.contact.radius);
          if (visual.contact.radius >= 1.6) {
            context.beginPath();
            context.arc(visual.contact.x, visual.contact.y, visual.contact.radius, 0, Math.PI * 2);
            context.fillStyle = "rgba(" + color + ", 0.9)";
            context.strokeStyle = "rgba(250, 252, 255, 0.96)";
            context.lineWidth = 1.6;
            context.fill();
            context.stroke();
          } else {
            if (visual.contact.radius > 0.05) {
              context.beginPath();
              context.arc(visual.contact.x, visual.contact.y, visual.contact.radius, 0, Math.PI * 2);
              context.fillStyle = "rgba(" + color + ", 0.9)";
              context.fill();
            }
            context.beginPath();
            context.arc(visual.contact.x, visual.contact.y, markerRadius, 0, Math.PI * 2);
            context.strokeStyle = "rgba(250, 252, 255, 0.96)";
            context.lineWidth = 1.6;
            context.stroke();
          }
        }
        context.restore();
      });
    }
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
  canvas.dataset.replayBallOffsetX = impactReplayOffset ? String(impactReplayOffset.x) : "";
  canvas.dataset.replayBallOffsetY = impactReplayOffset ? String(impactReplayOffset.y) : "";
  canvas.dataset.contactOffsetX = impactContactOffset ? String(impactContactOffset.x) : "";
  canvas.dataset.contactOffsetY = impactContactOffset ? String(impactContactOffset.y) : "";
  canvas.dataset.renderScale = String(renderTransform.scale);
  canvas.dataset.renderOffsetX = String(renderTransform.offsetX);
  canvas.dataset.renderOffsetY = String(renderTransform.offsetY);
  if (visual.ball) {
    var renderedBallX = visual.ball.x * renderTransform.scale + renderTransform.offsetX;
    var renderedBallRadius = visual.ball.radius * renderTransform.scale;
    canvas.dataset.renderBallLeft = String(renderedBallX - renderedBallRadius);
    canvas.dataset.renderBallRight = String(renderedBallX + renderedBallRadius);
  } else {
    canvas.dataset.renderBallLeft = "";
    canvas.dataset.renderBallRight = "";
  }
  return visual;
}
