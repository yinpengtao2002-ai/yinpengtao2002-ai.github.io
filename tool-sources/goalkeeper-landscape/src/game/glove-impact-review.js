export const GLOVE_IMPACT_CANVAS = {
  width: 180,
  height: 184,
  centerX: 90,
  centerY: 96,
  pixelsPerMeter: 165,
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
  var ballRadius = Math.max(0.01, Number(contact.ballRadius) || 0.11);
  var overlapDepth = clamp(Number(contact.overlapDepth) || 0, 0, ballRadius * 2);

  return {
    eventId: contact.eventId ?? null,
    contactType: contact.type,
    side: contact.side === "left" ? "left" : contact.side === "right" ? "right" : "both",
    part: contact.part || "palm",
    assisted: Boolean(contact.assisted),
    ballRadius,
    offset: {
      x: ballCenter.x - gloveCenter.x,
      y: ballCenter.y - gloveCenter.y,
      z: ballCenter.z - gloveCenter.z,
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
  return {
    width: GLOVE_IMPACT_CANVAS.width,
    height: GLOVE_IMPACT_CANVAS.height,
    gloveCenter: {
      x: GLOVE_IMPACT_CANVAS.centerX,
      y: GLOVE_IMPACT_CANVAS.centerY,
    },
    gloveSide: impact?.side || "right",
    result: review?.result || "miss",
    ball: impact
      ? {
          x: GLOVE_IMPACT_CANVAS.centerX + impact.offset.x * scale,
          y: GLOVE_IMPACT_CANVAS.centerY - impact.offset.y * scale,
          radius: impact.ballRadius * scale,
        }
      : null,
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

const GLOVE_SILHOUETTE = {
  palmCenter: { x: 91, y: 107 },
  digits: [
    { name: "thumb", tip: { x: 21, y: 92 } },
    { name: "index", tip: { x: 59, y: 39 } },
    { name: "middle", tip: { x: 87, y: 22 } },
    { name: "ring", tip: { x: 116, y: 31 } },
    { name: "little", tip: { x: 145, y: 49 } },
  ],
};

function mirrorPoint(point) {
  return { x: GLOVE_IMPACT_CANVAS.width - point.x, y: point.y };
}

export function getGloveSilhouette(side = "right") {
  var mirror = side === "left";
  return {
    side: mirror ? "left" : "right",
    palmCenter: mirror ? mirrorPoint(GLOVE_SILHOUETTE.palmCenter) : { ...GLOVE_SILHOUETTE.palmCenter },
    digits: GLOVE_SILHOUETTE.digits.map((digit) => ({
      name: digit.name,
      tip: mirror ? mirrorPoint(digit.tip) : { ...digit.tip },
    })),
  };
}

function traceGlove(context, side) {
  var mirror = side === "left";
  var x = (value) => mirror ? GLOVE_IMPACT_CANVAS.width - value : value;
  var [thumb, index, middle, ring, little] = GLOVE_SILHOUETTE.digits.map((digit) => digit.tip);
  context.beginPath();
  context.moveTo(x(66), 163);
  context.lineTo(x(56), 143);
  context.bezierCurveTo(x(51), 133, x(49), 120, x(49), 108);
  context.lineTo(x(37), 118);
  context.bezierCurveTo(x(30), 124, x(21), 121, x(16), 112);
  context.bezierCurveTo(x(11), 103, x(13), 96, thumb.x, thumb.y);
  context.bezierCurveTo(x(25), 82, x(32), 79, x(38), 84);
  context.lineTo(x(49), 96);
  context.lineTo(x(48), 60);
  context.bezierCurveTo(x(47), 49, x(51), 40, index.x, index.y);
  context.bezierCurveTo(x(67), 38, x(70), 48, x(70), 59);
  context.lineTo(x(70), 72);
  context.bezierCurveTo(x(70), 77, x(73), 80, x(76), 77);
  context.lineTo(x(76), 43);
  context.bezierCurveTo(x(76), 31, x(80), 23, middle.x, middle.y);
  context.bezierCurveTo(x(95), 22, x(99), 31, x(98), 43);
  context.lineTo(x(97), 72);
  context.bezierCurveTo(x(97), 77, x(100), 80, x(103), 76);
  context.lineTo(x(104), 50);
  context.bezierCurveTo(x(105), 39, x(109), 31, ring.x, ring.y);
  context.bezierCurveTo(x(124), 32, x(128), 41, x(126), 53);
  context.lineTo(x(123), 78);
  context.bezierCurveTo(x(122), 83, x(125), 86, x(129), 82);
  context.lineTo(x(132), 64);
  context.bezierCurveTo(x(133), 55, x(138), 49, little.x, little.y);
  context.bezierCurveTo(x(152), 50, x(155), 59, x(153), 69);
  context.lineTo(x(146), 106);
  context.bezierCurveTo(x(143), 124, x(135), 141, x(124), 151);
  context.lineTo(x(120), 163);
  context.closePath();
}

function drawGloveDetails(context, side) {
  var mirror = side === "left";
  var x = (value) => mirror ? GLOVE_IMPACT_CANVAS.width - value : value;
  context.save();
  context.strokeStyle = "rgba(247, 250, 253, 0.5)";
  context.lineWidth = 1.4;
  context.lineCap = "round";

  [
    [70, 70, 70, 102],
    [97, 69, 96, 101],
    [123, 76, 119, 103],
  ].forEach(([startX, startY, endX, endY]) => {
    context.beginPath();
    context.moveTo(x(startX), startY);
    context.quadraticCurveTo(x((startX + endX) / 2), 87, x(endX), endY);
    context.stroke();
  });

  context.beginPath();
  context.moveTo(x(52), 109);
  context.bezierCurveTo(x(66), 95, x(86), 92, x(105), 99);
  context.bezierCurveTo(x(120), 104, x(128), 116, x(124), 133);
  context.bezierCurveTo(x(107), 143, x(81), 143, x(62), 133);
  context.bezierCurveTo(x(56), 125, x(53), 117, x(52), 109);
  context.stroke();

  context.beginPath();
  context.moveTo(x(57), 144);
  context.lineTo(x(123), 151);
  context.stroke();
  context.restore();
}

export function drawGloveImpactReview(canvas, review) {
  var context = canvas?.getContext?.("2d");
  if (!context) return null;
  var visual = getGloveImpactVisual(review);
  var scale = Math.min(canvas.width / visual.width, canvas.height / visual.height) || 1;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(scale, 0, 0, scale, 0, 0);

  context.save();
  traceGlove(context, visual.gloveSide);
  context.fillStyle = "rgba(184, 193, 205, 0.72)";
  context.strokeStyle = "rgba(236, 241, 247, 0.9)";
  context.lineWidth = 2;
  context.fill();
  context.stroke();
  drawGloveDetails(context, visual.gloveSide);
  context.restore();

  if (visual.ball) {
    var color = review.result === "save" ? "94, 224, 164" : review.result === "goal" ? "255, 105, 105" : "212, 220, 230";
    context.save();
    context.beginPath();
    context.arc(visual.ball.x, visual.ball.y, visual.ball.radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(" + color + ", 0.18)";
    context.strokeStyle = "rgba(" + color + ", 0.96)";
    context.lineWidth = 2.4;
    context.fill();
    context.stroke();
    context.restore();

    context.save();
    traceGlove(context, visual.gloveSide);
    context.clip();
    context.beginPath();
    context.arc(visual.ball.x, visual.ball.y, visual.ball.radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(" + color + ", 0.78)";
    context.fill();
    context.restore();
  }

  canvas.dataset.ballX = visual.ball ? String(Math.round(visual.ball.x * 100) / 100) : "";
  canvas.dataset.ballY = visual.ball ? String(Math.round(visual.ball.y * 100) / 100) : "";
  canvas.dataset.ballRadius = visual.ball ? String(Math.round(visual.ball.radius * 100) / 100) : "";
  return visual;
}
