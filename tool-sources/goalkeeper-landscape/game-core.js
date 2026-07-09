(function attachGoalkeeperGame(root, factory) {
  var core = factory(root);
  if (typeof module === "object" && module.exports) {
    module.exports.GoalkeeperGameCore = core;
  }
  root.GoalkeeperGameCore = core;
})(typeof window !== "undefined" ? window : globalThis, function createGoalkeeperGameCore(root) {
  "use strict";

  var ROUND_DURATION = 30;
  var MAX_MISSES = 3;
  var SOUND_PROFILE = {
    shot: { frequency: 92, endFrequency: 48, duration: 0.16, gain: 0.12, type: "sine" },
    save: { frequency: 168, endFrequency: 92, duration: 0.18, gain: 0.14, type: "square" },
    touchedGoal: { frequency: 118, endFrequency: 72, duration: 0.28, gain: 0.1, type: "triangle" },
    goal: { frequency: 72, endFrequency: 44, duration: 0.34, gain: 0.09, type: "sine" },
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function distanceBetween(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getSoundProfile() {
    return {
      shot: Object.assign({}, SOUND_PROFILE.shot),
      save: Object.assign({}, SOUND_PROFILE.save),
      touchedGoal: Object.assign({}, SOUND_PROFILE.touchedGoal),
      goal: Object.assign({}, SOUND_PROFILE.goal),
    };
  }

  function createAudioEngine(audioRoot) {
    var AudioContextCtor = audioRoot.AudioContext || audioRoot.webkitAudioContext;
    var context = null;

    function getContext() {
      if (!AudioContextCtor) return null;
      if (!context) {
        context = new AudioContextCtor();
      }
      return context;
    }

    function prime() {
      var ctx = getContext();
      if (ctx && ctx.state === "suspended") {
        ctx.resume();
      }
    }

    function playSound(name) {
      var profile = SOUND_PROFILE[name];
      var ctx = getContext();
      if (!profile || !ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      var now = ctx.currentTime;
      var oscillator = ctx.createOscillator();
      var gain = ctx.createGain();
      oscillator.type = profile.type;
      oscillator.frequency.setValueAtTime(profile.frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, profile.endFrequency), now + profile.duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(profile.gain, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + profile.duration + 0.03);
    }

    return {
      prime: prime,
      playSound: playSound,
    };
  }

  function createInitialState() {
    return {
      score: 0,
      combo: 0,
      multiplier: 1,
      misses: 0,
      timeLeft: ROUND_DURATION,
      running: false,
      paused: false,
      ended: false,
      message: "",
    };
  }

  function difficultyFromElapsed(elapsed) {
    return clamp(elapsed / ROUND_DURATION, 0, 1);
  }

  function getGoalFrame(bounds) {
    var width = bounds.width * 0.98;
    var height = width / 3;
    var maxHeight = bounds.height * 0.62;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * 3;
    }
    var x = (bounds.width - width) / 2;
    var bottom = bounds.height * 0.86;
    var y = bottom - height;
    return {
      x: x,
      y: y,
      width: width,
      height: height,
      right: x + width,
      bottom: bottom,
      postWidth: Math.max(10, bounds.width * 0.012),
      netSpacing: Math.max(34, bounds.width * 0.04),
    };
  }

  function createBall(bounds, elapsed, random) {
    var rand = typeof random === "function" ? random : Math.random;
    var difficulty = difficultyFromElapsed(elapsed);
    var goal = getGoalFrame(bounds);
    var lane = Math.floor(rand() * 5);
    var laneT = lane / 4;
    var wobble = (rand() - 0.5) * bounds.width * 0.08;
    var targetX = goal.x + goal.width * (0.08 + laneT * 0.84) + wobble;
    var targetY = goal.y + goal.height * (0.18 + rand() * 0.64);
    var startX = lerp(bounds.width * 0.45, bounds.width * 0.55, rand());
    var startY = goal.y + goal.height * (0.05 + rand() * 0.1);
    var speed = 0.82 + difficulty * 0.62 + rand() * 0.18;
    var baseRadius = 13 - difficulty * 3;

    return {
      id: "ball-" + Date.now() + "-" + Math.round(rand() * 100000),
      startX: startX,
      startY: startY,
      targetX: targetX,
      targetY: targetY,
      x: startX,
      y: startY,
      radius: baseRadius,
      baseRadius: baseRadius,
      speed: speed,
      progress: 0,
      phase: "incoming",
      alpha: 1,
      caught: false,
      missed: false,
    };
  }

  function updateBall(ball, dt) {
    var next = Object.assign({}, ball);
    if (next.phase === "netImpact") {
      next.age = (next.age || 0) + dt;
      var lifetime = next.lifetime || 1.2;
      var t = clamp(next.age / lifetime, 0, 1);
      var damping = Math.pow(0.12, dt);
      var bounce = Math.sin(t * Math.PI * 3.2) * Math.pow(1 - t, 2.1);
      next.x += (next.vx || 0) * dt;
      next.y += (next.vy || 0) * dt;
      next.vx = (next.vx || 0) * damping;
      next.vy = (next.vy || 0) * damping + (next.gravity || 0) * dt;
      next.spin = (next.spin || 0) + (next.spinSpeed || 0) * dt;
      next.netRipple = clamp((next.netRipple || 0) * Math.pow(0.1, dt), 0, 1);
      next.depth = clamp((next.depth || 0.35) + dt * 0.1 - t * 0.06, 0.18, 0.62);
      next.radius = Math.max(10, (next.baseRadius || next.radius) * (0.86 + next.depth * 0.16 + bounce * 0.18));
      next.alpha = t < 0.76 ? 1 : clamp(1 - (t - 0.76) / 0.24, 0, 1);
      return next;
    }
    if (next.phase === "deflected") {
      next.age = (next.age || 0) + dt;
      next.x += next.vx * dt;
      next.y += next.vy * dt;
      next.vy += next.gravity * dt;
      next.spin = (next.spin || 0) + (next.spinSpeed || 0) * dt;
      next.radius = Math.max(12, next.radius * (1 - dt * 0.28));
      next.alpha = clamp(1 - next.age / next.lifetime, 0, 1);
      return next;
    }
    next.progress = clamp(next.progress + dt * next.speed, 0, 1.2);
    var eased = Math.pow(next.progress, 1.16);
    next.x = lerp(next.startX, next.targetX, eased);
    next.y = lerp(next.startY, next.targetY, eased);
    next.radius = next.baseRadius + Math.pow(next.progress, 1.38) * 32;
    return next;
  }

  function deflectBall(ball, gloves, bounds) {
    var offset = clamp((ball.x - gloves.x) / Math.max(1, gloves.radius), -1, 1);
    var side = offset >= 0 ? 1 : -1;
    var sideways = bounds.width * (0.72 + Math.abs(offset) * 0.26);
    return Object.assign({}, ball, {
      phase: "deflected",
      caught: true,
      goalBound: false,
      outcome: "save",
      age: 0,
      lifetime: 1,
      vx: side * sideways,
      vy: -bounds.height * (0.66 + (1 - clamp(ball.progress, 0, 1)) * 0.16),
      gravity: bounds.height * 1.75,
      spin: 0,
      spinSpeed: side * 13,
      alpha: 1,
    });
  }

  function deflectIntoGoal(ball, gloves, bounds) {
    var offset = clamp((ball.x - gloves.x) / Math.max(1, gloves.radius), -1, 1);
    var side = offset >= 0 ? 1 : -1;
    return Object.assign({}, ball, {
      phase: "deflected",
      caught: true,
      goalBound: true,
      outcome: "goal",
      age: 0,
      lifetime: 0.95,
      vx: side * bounds.width * 0.16,
      vy: bounds.height * (0.52 + clamp(ball.progress, 0, 1) * 0.22),
      gravity: bounds.height * 0.36,
      spin: 0,
      spinSpeed: side * 7,
      alpha: 1,
    });
  }

  function createNetImpactBall(ball, bounds, reason) {
    var goal = getGoalFrame(bounds);
    var incomingRadius = Math.max(18, ball.radius || ball.baseRadius || bounds.width * 0.034);
    var insetX = Math.max(goal.postWidth * 1.6, incomingRadius * 1.15);
    var insetY = Math.max(goal.postWidth * 1.4, incomingRadius * 0.95);
    var rawX = ball.x || ball.targetX || bounds.width * 0.5;
    var rawY = ball.y || ball.targetY || goal.y + goal.height * 0.62;
    var x = clamp(rawX, goal.x + insetX, goal.right - insetX);
    var y = clamp(rawY, goal.y + insetY, goal.bottom - insetY);
    var side = x >= bounds.width * 0.5 ? 1 : -1;
    var incomingVx = typeof ball.vx === "number" ? ball.vx : side * bounds.width * 0.16;
    var incomingVy = typeof ball.vy === "number" ? ball.vy : bounds.height * 0.42;
    var depth = reason === "touchedGoal" ? 0.42 : 0.5;

    return Object.assign({}, ball, {
      phase: "netImpact",
      goalBound: true,
      outcome: "goal",
      impactReason: reason || "goal",
      age: 0,
      lifetime: 1.22,
      x: x,
      y: y,
      targetX: x,
      targetY: y,
      baseRadius: incomingRadius * 0.92,
      radius: incomingRadius,
      depth: depth,
      netRipple: 1,
      vx: -incomingVx * 0.14,
      vy: -Math.abs(incomingVy) * 0.11,
      gravity: bounds.height * 0.18,
      spin: ball.spin || 0,
      spinSpeed: (ball.spinSpeed || side * 6) * 0.72,
      alpha: 1,
    });
  }

  function resolveImpact(ball, gloves, bounds) {
    var distance = distanceBetween(ball, gloves);
    var contactLimit = getCatchRadius(ball, gloves);
    var overlap = Math.max(0, contactLimit - distance);
    var overlapQuality = clamp(overlap / Math.max(1, ball.radius * 0.78), 0, 1);
    var centerQuality = clamp(1 - distance / Math.max(1, contactLimit), 0, 1);
    var timingQuality = clamp(1 - Math.max(0, ball.progress - 0.88) / 0.18, 0, 1);
    var quality = overlapQuality * 0.7 + timingQuality * 0.22 + centerQuality * 0.08;
    if (quality >= 0.3) {
      return {
        outcome: "save",
        sound: "save",
        quality: quality,
        ball: deflectBall(ball, gloves, bounds),
      };
    }
    return {
      outcome: "goal",
      sound: "touchedGoal",
      quality: quality,
      ball: deflectIntoGoal(ball, gloves, bounds),
    };
  }

  function intersectsGloves(ball, gloves) {
    var dx = ball.x - gloves.x;
    var dy = ball.y - gloves.y;
    var catchRadius = getCatchRadius(ball, gloves);
    return dx * dx + dy * dy <= catchRadius * catchRadius;
  }

  function getCatchRadius(ball, gloves) {
    return ball.radius + gloves.radius + ball.radius * 0.45 + gloves.radius * 0.08;
  }

  function applyCatch(state, ball) {
    var nextCombo = state.combo + 1;
    var nextMultiplier = 1 + Math.floor(nextCombo / 4);
    return Object.assign({}, state, {
      score: state.score + 10 * state.multiplier,
      combo: nextCombo,
      multiplier: nextMultiplier,
      message: nextCombo % 4 === 0 ? "倍率提升" : "扑救成功",
    });
  }

  function applyMiss(state) {
    var misses = state.misses + 1;
    return Object.assign({}, state, {
      combo: 0,
      multiplier: 1,
      misses: misses,
      ended: misses >= MAX_MISSES,
      running: misses >= MAX_MISSES ? false : state.running,
      message: misses >= MAX_MISSES ? "训练结束" : "漏球",
    });
  }

  function isRoundOver(state) {
    return state.timeLeft <= 0 || state.misses >= MAX_MISSES || state.ended;
  }

  function createRuntime() {
    if (typeof document === "undefined") {
      return null;
    }

    var canvas = document.getElementById("gameCanvas");
    if (!canvas || !canvas.getContext) {
      return null;
    }

    var stage = document.getElementById("stage");
    var ctx = canvas.getContext("2d");
    var scoreValue = document.getElementById("scoreValue");
    var levelValue = document.getElementById("levelValue");
    var timeValue = document.getElementById("timeValue");
    var missValue = document.getElementById("missValue");
    var startOverlay = document.getElementById("startOverlay");
    var endOverlay = document.getElementById("endOverlay");
    var finalScore = document.getElementById("finalScore");
    var startButton = document.getElementById("startButton");
    var restartButton = document.getElementById("restartButton");
    var pauseButton = document.getElementById("pauseButton");
    var soundButton = document.getElementById("soundButton");
    var settingsButton = document.getElementById("settingsButton");

    var state = createInitialState();
    var balls = [];
    var bounds = { width: 1280, height: 720 };
    var gloves = { x: 640, y: 600, radius: 82 };
    var audio = createAudioEngine(root);
    var soundEvents = [];
    var soundEnabled = true;
    var lastFrame = 0;
    var elapsed = 0;
    var nextSpawnAt = 0;
    var flash = { text: "", time: 0 };

    function resize() {
      var rect = canvas.getBoundingClientRect();
      var dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
      bounds = { width: rect.width, height: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!state.running && !state.ended && balls.length === 0) {
        gloves.x = bounds.width * 0.5;
        gloves.y = bounds.height * 0.81;
      }
      gloves.x = clamp(gloves.x, bounds.width * 0.12, bounds.width * 0.88);
      gloves.y = clamp(gloves.y, bounds.height * 0.45, bounds.height * 0.9);
      gloves.radius = Math.max(58, Math.min(bounds.width, bounds.height) * 0.11);
      render();
    }

    function setOverlayVisible(element, visible) {
      if (!element) return;
      element.classList.toggle("hidden", !visible);
    }

    function updateHud() {
      if (scoreValue) scoreValue.textContent = String(state.score);
      if (levelValue) levelValue.textContent = "1";
      if (timeValue) timeValue.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
      if (missValue) missValue.textContent = state.misses + "/" + MAX_MISSES;
      if (pauseButton) pauseButton.innerHTML = state.paused ? '<span aria-hidden="true">▶</span> 继续' : '<span aria-hidden="true">Ⅱ</span> 暂停';
      if (finalScore) {
        finalScore.textContent = String(state.score);
      }
    }

    function startRound() {
      audio.prime();
      state = createInitialState();
      state.running = true;
      state.message = "开始";
      balls = [];
      elapsed = 0;
      nextSpawnAt = 0;
      flash = { text: "", time: 0 };
      setOverlayVisible(startOverlay, false);
      setOverlayVisible(endOverlay, false);
      spawnBall();
      updateHud();
      lastFrame = performance.now();
    }

    function finishRound() {
      state.running = false;
      state.ended = true;
      setOverlayVisible(endOverlay, true);
      updateHud();
    }

    function spawnBall() {
      if (!state.running) return;
      balls.push(createBall(bounds, elapsed, Math.random));
      var difficulty = difficultyFromElapsed(elapsed);
      nextSpawnAt = elapsed + clamp(1.25 - difficulty * 0.54, 0.62, 1.25);
      playRuntimeSound("shot");
    }

    function playRuntimeSound(name) {
      soundEvents.push({ name: name, elapsed: elapsed });
      if (!soundEnabled) return;
      audio.playSound(name);
    }

    function setFlash(text) {
      flash.text = text;
      flash.time = 0.72;
    }

    function pointerPosition(event) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: clamp(event.clientX - rect.left, bounds.width * 0.1, bounds.width * 0.9),
        y: clamp(event.clientY - rect.top, bounds.height * 0.42, bounds.height * 0.92),
      };
    }

    function updateGloves(event) {
      var pos = pointerPosition(event);
      gloves.x = pos.x;
      gloves.y = pos.y;
    }

    function handlePointerDown(event) {
      if (event.target && event.target.closest && event.target.closest("button")) {
        return;
      }
      event.preventDefault();
      if (stage && event.pointerId !== undefined && stage.setPointerCapture) {
        stage.setPointerCapture(event.pointerId);
      }
      updateGloves(event);
      if (!state.running && !state.ended) {
        startRound();
      }
    }

    function handlePointerMove(event) {
      event.preventDefault();
      updateGloves(event);
    }

    function handlePointerUp(event) {
      if (stage && event.pointerId !== undefined && stage.releasePointerCapture) {
        try {
          stage.releasePointerCapture(event.pointerId);
        } catch (error) {
          return;
        }
      }
    }

    function update(dt) {
      if (state.paused) return;
      if (!state.running) {
        balls = balls.map(function animateRestingBall(ball) {
          return updateBall(ball, dt);
        }).filter(function keepRestingBall(ball) {
          return ball.phase === "netImpact" && ball.alpha > 0;
        });
        return;
      }
      elapsed += dt;
      state.timeLeft = ROUND_DURATION - elapsed;

      var incomingCount = balls.filter(function isIncoming(ball) {
        return ball.phase === "incoming" || (ball.phase === "deflected" && ball.goalBound);
      }).length;
      if (elapsed >= nextSpawnAt && incomingCount === 0) {
        spawnBall();
      }

      var nextBalls = [];
      balls.forEach(function eachBall(ball) {
        var updated = updateBall(ball, dt);
        if (updated.phase === "netImpact") {
          if (updated.alpha > 0 && updated.age < updated.lifetime) {
            nextBalls.push(updated);
          }
          return;
        }
        if (updated.phase === "deflected") {
          var goal = getGoalFrame(bounds);
          var impactPlaneY = goal.y + goal.height * 0.74;
          if (updated.goalBound && (updated.y >= impactPlaneY || updated.age > 0.42)) {
            state = applyMiss(state);
            state.message = "碰到但进了";
            nextSpawnAt = Math.max(nextSpawnAt, elapsed + 0.28);
            setFlash(state.message);
            nextBalls.push(createNetImpactBall(updated, bounds, "touchedGoal"));
            return;
          }
          if (updated.alpha > 0 && updated.y < bounds.height + updated.radius * 2 && updated.x > -updated.radius * 3 && updated.x < bounds.width + updated.radius * 3) {
            nextBalls.push(updated);
          }
          return;
        }
        if (!updated.caught && updated.progress > 0.52 && intersectsGloves(updated, gloves)) {
          var impact = resolveImpact(updated, gloves, bounds);
          playRuntimeSound(impact.sound);
          if (impact.outcome === "save") {
            state = applyCatch(state, updated);
          } else {
            state.message = "碰到但进了";
          }
          nextBalls.push(impact.ball);
          nextSpawnAt = Math.max(nextSpawnAt, elapsed + 0.28);
          setFlash(state.message);
          return;
        }
        if (updated.progress >= 1.04) {
          state = applyMiss(state);
          playRuntimeSound("goal");
          nextSpawnAt = Math.max(nextSpawnAt, elapsed + 0.32);
          setFlash(state.message);
          nextBalls.push(createNetImpactBall(updated, bounds, "goal"));
          return;
        }
        nextBalls.push(updated);
      });
      balls = nextBalls;

      if (isRoundOver(state)) {
        finishRound();
      }
      updateHud();
    }

    function togglePause() {
      if (!state.running || state.ended) return;
      state.paused = !state.paused;
      state.message = state.paused ? "已暂停" : "继续训练";
      setFlash(state.message);
      updateHud();
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      if (soundButton) {
        soundButton.innerHTML = soundEnabled ? '<span aria-hidden="true">▶</span> 音效' : '<span aria-hidden="true">×</span> 静音';
        soundButton.setAttribute("aria-label", soundEnabled ? "关闭音效" : "开启音效");
      }
      state.message = soundEnabled ? "音效开启" : "音效关闭";
      setFlash(state.message);
    }

    function openSettingsHint() {
      state.message = "设置";
      setFlash("设置");
    }

    function frame(now) {
      var dt = lastFrame ? Math.min(0.04, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      update(dt);
      render(dt);
      requestAnimationFrame(frame);
    }

    function drawRoundedRect(x, y, width, height, radius) {
      var r = Math.min(radius, width / 2, height / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + r);
      ctx.lineTo(x + width, y + height - r);
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      ctx.lineTo(x + r, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawCloud(cx, cy, scale, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.shadowColor = "rgba(98, 160, 202, 0.16)";
      ctx.shadowBlur = 16 * scale;
      ctx.beginPath();
      ctx.arc(cx - 34 * scale, cy + 4 * scale, 28 * scale, 0, Math.PI * 2);
      ctx.arc(cx - 6 * scale, cy - 13 * scale, 36 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 32 * scale, cy - 3 * scale, 28 * scale, 0, Math.PI * 2);
      ctx.arc(cx + 62 * scale, cy + 8 * scale, 22 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawCloudBank() {
      var w = bounds.width;
      var h = bounds.height;
      var sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#6fc0f1");
      sky.addColorStop(0.52, "#d8f0ff");
      sky.addColorStop(1, "#e8f9d8");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      var leftLight = ctx.createRadialGradient(w * 0.12, h * 0.05, 0, w * 0.12, h * 0.05, w * 0.34);
      leftLight.addColorStop(0, "rgba(255, 255, 255, 0.7)");
      leftLight.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = leftLight;
      ctx.fillRect(0, 0, w * 0.62, h * 0.45);
      ctx.restore();

      drawCloud(w * 0.07, h * 0.1, 0.95, 0.62);
      drawCloud(w * 0.36, h * 0.18, 0.9, 0.54);
      drawCloud(w * 0.87, h * 0.12, 1.05, 0.64);
      drawCloud(w * 0.95, h * 0.28, 0.78, 0.5);

      ctx.save();
      ctx.fillStyle = "rgba(117, 180, 56, 0.8)";
      ctx.translate(w * 0.68, h * 0.18);
      ctx.rotate(-0.42);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.012, h * 0.005, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = "rgba(117, 180, 56, 0.72)";
      ctx.translate(w * 0.18, h * 0.21);
      ctx.rotate(-0.32);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.011, h * 0.005, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawBackgroundTrees() {
      var w = bounds.width;
      var h = bounds.height;
      var baseY = h * 0.43;

      ctx.save();
      ctx.fillStyle = "rgba(105, 172, 90, 0.64)";
      for (var i = 0; i < 28; i += 1) {
        var side = i < 14 ? -1 : 1;
        var t = (i % 14) / 13;
        var x = side < 0 ? lerp(-w * 0.04, w * 0.3, t) : lerp(w * 0.7, w * 1.04, t);
        var y = baseY - h * (0.04 + Math.sin(i * 1.7) * 0.018);
        var r = h * (0.035 + (i % 5) * 0.006);
        var grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r * 1.35);
        grad.addColorStop(0, "rgba(193, 226, 112, 0.86)");
        grad.addColorStop(0.72, "rgba(85, 164, 75, 0.72)");
        grad.addColorStop(1, "rgba(57, 130, 82, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
      ctx.lineWidth = Math.max(1, w * 0.0015);
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(0, baseY + h * 0.005);
      ctx.lineTo(w, baseY + h * 0.005);
      ctx.stroke();
      ctx.strokeStyle = "rgba(91, 143, 154, 0.3)";
      for (var p = 0; p < 31; p += 1) {
        var px = (p / 30) * w;
        ctx.beginPath();
        ctx.moveTo(px, baseY - h * 0.07);
        ctx.lineTo(px, baseY + h * 0.03);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTrainingBackdrop() {
      drawCloudBank();
      drawBackgroundTrees();
    }

    function drawSideFence() {
      var w = bounds.width;
      var h = bounds.height;
      var horizon = h * 0.43;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.58)";
      ctx.lineWidth = Math.max(1.2, w * 0.002);
      for (var side = -1; side <= 1; side += 2) {
        var nearX = side < 0 ? -w * 0.05 : w * 1.05;
        var farX = side < 0 ? w * 0.24 : w * 0.76;
        var railY = horizon + h * 0.03;
        ctx.beginPath();
        ctx.moveTo(farX, railY);
        ctx.lineTo(nearX, h * 0.58);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(farX, railY + h * 0.035);
        ctx.lineTo(nearX, h * 0.62);
        ctx.stroke();
        for (var i = 0; i < 9; i += 1) {
          var t = i / 8;
          var px = lerp(farX, nearX, t);
          var py = lerp(railY, h * 0.58, t);
          ctx.beginPath();
          ctx.moveTo(px, py - h * 0.035);
          ctx.lineTo(px, py + h * 0.07);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawField() {
      var w = bounds.width;
      var h = bounds.height;
      var horizon = h * 0.42;
      var topLeft = -w * 0.05;
      var topRight = w * 1.05;
      var bottomLeft = -w * 0.16;
      var bottomRight = w * 1.16;

      ctx.fillStyle = "#626f75";
      ctx.beginPath();
      ctx.moveTo(topLeft, horizon);
      ctx.lineTo(topRight, horizon);
      ctx.lineTo(bottomRight, h);
      ctx.lineTo(bottomLeft, h);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
      ctx.lineWidth = Math.max(1, w * 0.0014);
      for (var x = 0; x <= 1; x += 0.2) {
        ctx.beginPath();
        ctx.moveTo(lerp(topLeft, topRight, x), horizon);
        ctx.lineTo(lerp(bottomLeft, bottomRight, x), h);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.moveTo(topLeft, horizon);
      ctx.lineTo(topRight, horizon);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
      ctx.lineWidth = Math.max(2, w * 0.003);
      ctx.beginPath();
      ctx.moveTo(w * 0.16, h * 0.82);
      ctx.lineTo(w * 0.84, h * 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.61, w * 0.16, h * 0.08, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      var glow = ctx.createLinearGradient(0, horizon, 0, h);
      glow.addColorStop(0, "rgba(255, 255, 255, 0.24)");
      glow.addColorStop(0.45, "rgba(255, 255, 255, 0.08)");
      glow.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.moveTo(topLeft, horizon);
      ctx.lineTo(topRight, horizon);
      ctx.lineTo(bottomRight, h);
      ctx.lineTo(bottomLeft, h);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

    }

    function drawHexPath(cx, cy, radius) {
      ctx.beginPath();
      for (var i = 0; i < 6; i += 1) {
        var angle = Math.PI / 6 + i * Math.PI / 3;
        var px = cx + Math.cos(angle) * radius;
        var py = cy + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
    }

    function drawHexGoalNet(goal) {
      var r = goal.netSpacing * 0.31;
      var stepX = r * 1.5;
      var stepY = Math.sqrt(3) * r;
      ctx.save();
      ctx.beginPath();
      ctx.rect(goal.x + goal.postWidth * 0.9, goal.y + goal.postWidth * 0.7, goal.width - goal.postWidth * 1.8, goal.height - goal.postWidth * 1.1);
      ctx.clip();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = Math.max(1, goal.postWidth * 0.12);
      for (var row = -1; row < goal.height / stepY + 3; row += 1) {
        for (var col = -1; col < goal.width / stepX + 3; col += 1) {
          var cx = goal.x + col * stepX + (row % 2) * stepX * 0.5;
          var cy = goal.y + row * stepY;
          var depthFade = clamp(1 - Math.abs(cy - (goal.y + goal.height * 0.5)) / goal.height, 0.28, 1);
          ctx.globalAlpha = 0.22 + depthFade * 0.3;
          drawHexPath(cx, cy, r);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawGoalDepth(goal) {
      var depthX = bounds.width * 0.045;
      var depthY = -bounds.height * 0.048;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
      ctx.lineWidth = Math.max(1, goal.postWidth * 0.14);
      for (var side = -1; side <= 1; side += 2) {
        var frontX = side < 0 ? goal.x : goal.right;
        var backX = frontX - side * depthX;
        ctx.beginPath();
        ctx.moveTo(frontX, goal.y);
        ctx.lineTo(backX, goal.y + depthY);
        ctx.lineTo(backX, goal.bottom + depthY * 0.18);
        ctx.lineTo(frontX, goal.bottom);
        ctx.stroke();

        for (var i = 1; i < 7; i += 1) {
          var t = i / 7;
          ctx.beginPath();
          ctx.moveTo(lerp(frontX, backX, t), lerp(goal.y, goal.y + depthY, t));
          ctx.lineTo(lerp(frontX, backX, t), lerp(goal.bottom, goal.bottom + depthY * 0.18, t));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawGoal() {
      var w = bounds.width;
      var goal = getGoalFrame(bounds);
      var x = goal.x;
      var y = goal.y;
      var gw = goal.width;
      var gh = goal.height;

      drawGoalDepth(goal);
      drawHexGoalNet(goal);

      ctx.save();
      ctx.shadowColor = "rgba(65, 103, 117, 0.34)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 9;
      ctx.strokeStyle = "#f8fbf4";
      ctx.lineWidth = goal.postWidth * 1.28;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y + gh);
      ctx.lineTo(x, y);
      ctx.lineTo(x + gw, y);
      ctx.lineTo(x + gw, y + gh);
      ctx.stroke();

      ctx.shadowColor = "transparent";
      ctx.strokeStyle = "rgba(211, 228, 218, 0.88)";
      ctx.lineWidth = Math.max(5, w * 0.006);
      ctx.beginPath();
      ctx.moveTo(x, y + gh);
      ctx.lineTo(x + gw, y + gh);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.74)";
      ctx.lineWidth = Math.max(3, goal.postWidth * 0.26);
      ctx.beginPath();
      ctx.moveTo(x + goal.postWidth * 0.24, y + goal.postWidth * 0.4);
      ctx.lineTo(x + gw - goal.postWidth * 0.3, y + goal.postWidth * 0.4);
      ctx.stroke();
      ctx.restore();
    }

    function drawRemoteShooterSource() {
      var w = bounds.width;
      var h = bounds.height;
      var x = w * 0.5;
      var y = h * 0.455;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(Math.max(0.62, w / 1500), Math.max(0.62, h / 840));
      ctx.fillStyle = "rgba(55, 95, 73, 0.18)";
      ctx.beginPath();
      ctx.ellipse(0, 35, 30, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#2c2f34";
      ctx.strokeStyle = "rgba(35, 47, 54, 0.88)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-3, 14);
      ctx.lineTo(-14, 32);
      ctx.moveTo(7, 14);
      ctx.lineTo(24, 26);
      ctx.stroke();

      ctx.strokeStyle = "#f4f7f5";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-7, -3);
      ctx.lineTo(-28, 7);
      ctx.moveTo(8, -1);
      ctx.lineTo(26, -8);
      ctx.stroke();

      ctx.fillStyle = "#f8fbf7";
      drawRoundedRect(-11, -14, 22, 30, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(72, 94, 104, 0.22)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#3e2c24";
      ctx.beginPath();
      ctx.arc(0, -23, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(-36, 29);
      ctx.scale(0.48, 0.48);
      ctx.shadowColor = "rgba(30, 62, 71, 0.3)";
      ctx.shadowBlur = 8;
      drawSoccerBall(0, 0, 21, 0.92, 0.2);
      ctx.restore();
      ctx.restore();
    }

    function drawSoccerBall(x, y, radius, alpha, rotation) {
      ctx.save();
      ctx.globalAlpha = alpha === undefined ? 1 : alpha;
      ctx.translate(x, y);
      ctx.rotate(rotation || 0);
      ctx.shadowColor = "rgba(38, 68, 69, 0.24)";
      ctx.shadowBlur = radius * 0.24;
      ctx.shadowOffsetY = radius * 0.14;
      var ballGradient = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.1, 0, 0, radius);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.62, "#f3f6f1");
      ballGradient.addColorStop(1, "#bdc9bd");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#202527";
      for (var i = 0; i < 5; i += 1) {
        var angle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        var px = Math.cos(angle) * radius * 0.43;
        var py = Math.sin(angle) * radius * 0.43;
        ctx.beginPath();
        ctx.arc(px, py, radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(23, 30, 32, 0.32)";
      ctx.lineWidth = Math.max(1, radius * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawLandingHalo(ball) {
      if (ball.phase !== "incoming") return;
      ctx.save();
      ctx.translate(ball.targetX, ball.targetY);
      var pulse = 0.65 + Math.sin(performance.now() / 160) * 0.12;
      var rx = ball.radius * (1.65 + ball.progress * 0.8);
      var ry = ball.radius * (0.58 + ball.progress * 0.22);
      ctx.strokeStyle = "rgba(255, 166, 58, " + pulse + ")";
      ctx.lineWidth = Math.max(2, ball.radius * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 178, 67, 0.08)";
      ctx.fill();
      ctx.restore();
    }

    function drawVelocityLines(ball) {
      if (ball.phase !== "incoming") return;
      var dx = ball.x - ball.startX;
      var dy = ball.y - ball.startY;
      var length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      var nx = dx / length;
      var ny = dy / length;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 248, 205, 0.32)";
      ctx.lineWidth = Math.max(2, ball.radius * 0.07);
      ctx.lineCap = "round";
      for (var i = 0; i < 3; i += 1) {
        var offset = (i - 1) * ball.radius * 0.34;
        var sx = ball.x - nx * ball.radius * (2.1 + i * 0.38) - ny * offset;
        var sy = ball.y - ny * ball.radius * (2.1 + i * 0.38) + nx * offset;
        ctx.globalAlpha = 0.34 - i * 0.08;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - nx * ball.radius * 1.4, sy - ny * ball.radius * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawPreviewBall() {
      if (state.running || state.ended || balls.length > 0) return;
      var goal = getGoalFrame(bounds);
      var preview = {
        phase: "incoming",
        startX: goal.x + goal.width * 0.52,
        startY: goal.y + goal.height * 0.1,
        targetX: bounds.width * 0.53,
        targetY: bounds.height * 0.66,
        x: bounds.width * 0.56,
        y: bounds.height * 0.43,
        radius: Math.max(24, bounds.width * 0.026),
        progress: 0.54,
        alpha: 1,
      };
      drawLandingHalo(preview);
      drawVelocityLines(preview);
      drawBall(preview);
    }

    function drawBall(ball) {
      if (ball.phase === "netImpact") {
        drawNetImpact(ball);
        return;
      }
      ctx.save();
      ctx.translate(ball.x, ball.y);
      if (ball.phase !== "deflected") {
        ctx.rotate(ball.progress * 5.6);
      }
      if (ball.phase === "deflected") {
        ctx.globalAlpha = ball.alpha;
        ctx.rotate(ball.spin || 0);
        ctx.strokeStyle = ball.goalBound ? "rgba(255, 129, 92, 0.45)" : "rgba(255, 247, 208, 0.4)";
        ctx.lineWidth = Math.max(2, ball.radius * 0.08);
        ctx.beginPath();
        ctx.moveTo(-ball.vx * 0.045, -ball.vy * 0.045);
        ctx.lineTo(-ball.vx * 0.012, -ball.vy * 0.012);
        ctx.stroke();
      }
      ctx.shadowColor = "rgba(0,0,0,.45)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 7;
      var ballGradient = ctx.createRadialGradient(-ball.radius * 0.35, -ball.radius * 0.35, ball.radius * 0.1, 0, 0, ball.radius);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.62, "#f0f2eb");
      ballGradient.addColorStop(1, "#bfc5bd");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#1f2424";
      for (var i = 0; i < 5; i += 1) {
        var angle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        var px = Math.cos(angle) * ball.radius * 0.43;
        var py = Math.sin(angle) * ball.radius * 0.43;
        ctx.beginPath();
        ctx.arc(px, py, ball.radius * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(20,20,20,.38)";
      ctx.lineWidth = Math.max(1, ball.radius * 0.08);
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius * 0.62, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawNetRipple(ball) {
      if (ball.phase !== "netImpact" || ball.netRipple <= 0) return;
      var ripple = clamp(ball.netRipple, 0, 1);
      var age = ball.age || 0;
      var spread = ball.radius * (2.4 + age * 3.6);
      ctx.save();
      ctx.globalAlpha = ripple;
      ctx.translate(ball.x, ball.y);
      ctx.strokeStyle = "rgba(227, 255, 248, 0.4)";
      ctx.lineWidth = Math.max(1.5, ball.radius * 0.055);
      ctx.beginPath();
      ctx.ellipse(0, 0, spread, spread * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255, 174, 95, 0.34)";
      ctx.lineWidth = Math.max(1, ball.radius * 0.035);
      ctx.beginPath();
      ctx.ellipse(0, 0, spread * 0.58, spread * 0.23, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = Math.max(1, ball.radius * 0.032);
      ctx.beginPath();
      ctx.moveTo(-spread * 0.86, 0);
      ctx.quadraticCurveTo(0, ball.radius * 0.34 * ripple, spread * 0.86, 0);
      ctx.moveTo(0, -spread * 0.38);
      ctx.quadraticCurveTo(ball.radius * 0.24 * ripple, 0, 0, spread * 0.38);
      ctx.stroke();
      ctx.restore();
    }

    function drawNetImpact(ball) {
      ctx.save();
      ctx.globalAlpha = ball.alpha;
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.spin || 0);

      var depth = ball.depth || 0.35;
      var squash = 1 - depth * 0.08 + Math.sin((ball.age || 0) * 18) * ball.netRipple * 0.018;
      ctx.scale(1 + depth * 0.04, squash);

      ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6 + depth * 8;
      var ballGradient = ctx.createRadialGradient(-ball.radius * 0.38, -ball.radius * 0.42, ball.radius * 0.1, 0, 0, ball.radius);
      ballGradient.addColorStop(0, "#ffffff");
      ballGradient.addColorStop(0.56, "#edf1e8");
      ballGradient.addColorStop(1, "#aeb7ae");
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.globalAlpha = ball.alpha * 0.88;
      ctx.fillStyle = "#1f2424";
      for (var i = 0; i < 5; i += 1) {
        var angle = -Math.PI / 2 + i * ((Math.PI * 2) / 5);
        var px = Math.cos(angle) * ball.radius * 0.43;
        var py = Math.sin(angle) * ball.radius * 0.43;
        ctx.beginPath();
        ctx.arc(px, py, ball.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "rgba(20, 20, 20, 0.34)";
      ctx.lineWidth = Math.max(1, ball.radius * 0.075);
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius * 0.62, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = ball.alpha * 0.28;
      ctx.strokeStyle = "rgba(230, 255, 250, 0.78)";
      ctx.lineWidth = Math.max(1, ball.radius * 0.04);
      for (var line = -1; line <= 1; line += 1) {
        ctx.beginPath();
        ctx.moveTo(-ball.radius * 1.15, line * ball.radius * 0.42);
        ctx.quadraticCurveTo(0, line * ball.radius * 0.42 + ball.radius * 0.18, ball.radius * 1.15, line * ball.radius * 0.42);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawDragGuide() {
      if (state.running || state.ended) return;
      var y = gloves.y + gloves.radius * 0.62;
      var left = gloves.x - gloves.radius * 0.72;
      var right = gloves.x + gloves.radius * 0.72;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = Math.max(4, gloves.radius * 0.08);
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(54, 100, 82, 0.18)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.quadraticCurveTo(gloves.x, y + gloves.radius * 0.34, right, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
      for (var side = -1; side <= 1; side += 2) {
        ctx.save();
        ctx.translate(side < 0 ? left : right, y);
        ctx.rotate(side < 0 ? -0.72 : 0.72);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-gloves.radius * 0.24, -gloves.radius * 0.12);
        ctx.lineTo(-gloves.radius * 0.13, gloves.radius * 0.16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawGlove(cx, cy, side) {
      var scale = gloves.radius / 82;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.save();
      ctx.fillStyle = "rgba(34, 92, 61, 0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 55 * scale, 42 * scale, 11 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.rotate(-side * 0.045);
      ctx.scale(scale, scale);
      var gloveGradient = ctx.createLinearGradient(-32, -68, 32, 52);
      gloveGradient.addColorStop(0, "#ffffff");
      gloveGradient.addColorStop(0.56, "#f6f7f0");
      gloveGradient.addColorStop(1, "#d7ded5");
      ctx.fillStyle = gloveGradient;
      ctx.strokeStyle = "rgba(151, 171, 166, 0.8)";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";

      for (var i = 0; i < 4; i += 1) {
        var fx = -27 + i * 18;
        var lift = Math.abs(i - 1.5) * 4;
        drawRoundedRect(fx - 8, -72 - lift, 17, 66 + lift, 10);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "rgba(72, 146, 136, 0.44)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(fx, -62 - lift);
        ctx.lineTo(fx + side * 1.8, -16);
        ctx.stroke();
        ctx.strokeStyle = "rgba(151, 171, 166, 0.8)";
        ctx.lineWidth = 2.5;
      }

      ctx.save();
      ctx.translate(side * 32, -18);
      ctx.rotate(side * -0.34);
      drawRoundedRect(-9, -4, 22, 58, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawRoundedRect(-34, -26, 68, 78, 26);
      ctx.fill();
      ctx.stroke();

      var teal = ctx.createLinearGradient(-18, -10, 18, 42);
      teal.addColorStop(0, "#84cbc1");
      teal.addColorStop(1, "#3aa297");
      ctx.fillStyle = teal;
      drawRoundedRect(-19, -6, 16, 48, 8);
      ctx.fill();
      drawRoundedRect(4, -6, 16, 48, 8);
      ctx.fill();

      ctx.strokeStyle = "rgba(18, 106, 100, 0.32)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-11, 0);
      ctx.lineTo(-10, 34);
      ctx.moveTo(12, 0);
      ctx.lineTo(13, 34);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.56)";
      drawRoundedRect(-27, -16, 18, 36, 10);
      ctx.fill();

      ctx.fillStyle = "#1f2b31";
      ctx.beginPath();
      ctx.arc(side * 20, 3, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#2f9f95";
      drawRoundedRect(-24, 39, 48, 24, 8);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
      drawRoundedRect(-18, 42, 36, 4, 2);
      ctx.fill();
      ctx.restore();
    }

    function drawGloves() {
      var spread = gloves.radius * 0.52;
      drawGlove(gloves.x - spread, gloves.y, -1);
      drawGlove(gloves.x + spread, gloves.y, 1);
    }

    function drawFlash(dt) {
      if (dt) {
        flash.time = Math.max(0, flash.time - dt);
      }
      if (!flash.text || flash.time <= 0) return;
      ctx.save();
      ctx.globalAlpha = clamp(flash.time / 0.72, 0, 1);
      ctx.font = "800 " + Math.max(20, bounds.width * 0.028) + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = flash.text === "漏球" ? "#ffcf99" : "#fff7d0";
      ctx.shadowColor = "rgba(0,0,0,.5)";
      ctx.shadowBlur = 12;
      ctx.fillText(flash.text, bounds.width / 2, bounds.height * 0.23);
      ctx.restore();
    }

    function render(dt) {
      ctx.clearRect(0, 0, bounds.width, bounds.height);
      drawTrainingBackdrop();
      drawField();
      drawSideFence();
      drawRemoteShooterSource();
      drawGoal();
      drawPreviewBall();
      balls.forEach(drawLandingHalo);
      balls.forEach(drawVelocityLines);
      balls.forEach(drawNetRipple);
      balls.forEach(drawBall);
      drawDragGuide();
      drawGloves();
      drawFlash(dt);
    }

    if (startButton) {
      startButton.addEventListener("click", startRound);
    }
    if (restartButton) {
      restartButton.addEventListener("click", startRound);
    }
    if (pauseButton) {
      pauseButton.addEventListener("click", togglePause);
    }
    if (soundButton) {
      soundButton.addEventListener("click", toggleSound);
    }
    if (settingsButton) {
      settingsButton.addEventListener("click", openSettingsHint);
    }
    if (stage) {
      stage.addEventListener("pointerdown", handlePointerDown);
      stage.addEventListener("pointermove", handlePointerMove);
      stage.addEventListener("pointerup", handlePointerUp);
      stage.addEventListener("pointercancel", handlePointerUp);
    }
    window.addEventListener("resize", resize);
    resize();
    updateHud();
    requestAnimationFrame(frame);

    return {
      startRound: startRound,
      getState: function getState() {
        return Object.assign({}, state);
      },
      getBalls: function getBalls() {
        return balls.map(function copyBall(ball) {
          return Object.assign({}, ball);
        });
      },
      getBounds: function getBounds() {
        return Object.assign({}, bounds);
      },
      getSoundEvents: function getSoundEvents() {
        return soundEvents.map(function copySoundEvent(event) {
          return Object.assign({}, event);
        });
      },
    };
  }

  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function onReady() {
      root.goalkeeperRuntime = createRuntime();
    });
  }

  return {
    ROUND_DURATION: ROUND_DURATION,
    MAX_MISSES: MAX_MISSES,
    clamp: clamp,
    lerp: lerp,
    getSoundProfile: getSoundProfile,
    createAudioEngine: createAudioEngine,
    getGoalFrame: getGoalFrame,
    createInitialState: createInitialState,
    createBall: createBall,
    updateBall: updateBall,
    createNetImpactBall: createNetImpactBall,
    getCatchRadius: getCatchRadius,
    deflectBall: deflectBall,
    resolveImpact: resolveImpact,
    intersectsGloves: intersectsGloves,
    applyCatch: applyCatch,
    applyMiss: applyMiss,
    isRoundOver: isRoundOver,
    createRuntime: createRuntime,
  };
});
