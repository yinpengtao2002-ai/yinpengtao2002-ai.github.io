const SAMPLE_ASSETS = {
  shot: {
    url: "/tools/goalkeeper-landscape/audio/mixkit-soccer-ball-kick-2099.wav",
    gain: 0.42,
    playbackRate: 1.05,
  },
  save: {
    url: "/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav",
    gain: 0.5,
    playbackRate: 0.92,
  },
  catch: {
    url: "/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav",
    gain: 0.42,
    playbackRate: 0.78,
  },
  frame: {
    url: "/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav",
    gain: 0.46,
    playbackRate: 1.18,
  },
  goal: {
    url: "/tools/goalkeeper-landscape/audio/mixkit-basketball-ball-hitting-net-2084.wav",
    gain: 0.48,
    playbackRate: 0.82,
  },
};

const SYNTH_PROFILE = {
  shot: { frequency: 120, endFrequency: 65, duration: 0.1, gain: 0.08, type: "sine" },
  save: { frequency: 260, endFrequency: 150, duration: 0.16, gain: 0.14, type: "square" },
  catch: { frequency: 190, endFrequency: 90, duration: 0.13, gain: 0.1, type: "triangle" },
  frame: { frequency: 340, endFrequency: 190, duration: 0.12, gain: 0.11, type: "square" },
  goal: { frequency: 82, endFrequency: 42, duration: 0.28, gain: 0.1, type: "triangle" },
  tick: { frequency: 180, endFrequency: 110, duration: 0.08, gain: 0.06, type: "sine" },
};

export function getSoundAssetManifest() {
  return { ...SAMPLE_ASSETS };
}

export function createAudioEngine(root = window) {
  var AudioContextCtor = root.AudioContext || root.webkitAudioContext;
  var context = null;
  var enabled = true;
  var unlocked = false;
  var sampleBuffers = {};
  var samplePromises = {};

  function getContext() {
    if (!AudioContextCtor) return null;
    if (!context) context = new AudioContextCtor();
    return context;
  }

  function setAudioParam(param, value, time) {
    if (!param) return;
    if (param.setValueAtTime) {
      param.setValueAtTime(value, time);
    } else {
      param.value = value;
    }
  }

  function resumeContext(ctx) {
    if (!ctx || ctx.state !== "suspended" || !ctx.resume) return;
    var resumeResult = ctx.resume();
    if (resumeResult?.catch) resumeResult.catch(() => undefined);
  }

  function unlockContext(ctx) {
    if (!ctx || unlocked) return;
    resumeContext(ctx);

    try {
      if (!ctx.createOscillator || !ctx.createGain) return;
      var now = ctx.currentTime || 0;
      var oscillator = ctx.createOscillator();
      var gain = ctx.createGain();
      oscillator.type = "sine";
      setAudioParam(oscillator.frequency, 20, now);
      setAudioParam(gain.gain, 0.0001, now);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.025);
      unlocked = true;
    } catch (error) {
      // Some browsers reject synthetic unlock sounds; gameplay samples still try to play normally.
    }
  }

  function prime() {
    var ctx = getContext();
    unlockContext(ctx);
    return preload();
  }

  function getFetcher() {
    if (root.fetch) return root.fetch.bind(root);
    if (typeof fetch !== "undefined") return fetch;
    return null;
  }

  function loadSample(name) {
    var asset = SAMPLE_ASSETS[name];
    var ctx = getContext();
    var fetcher = getFetcher();
    if (!asset || !ctx || !fetcher || !ctx.decodeAudioData) return Promise.resolve(null);
    if (sampleBuffers[name]) return Promise.resolve(sampleBuffers[name]);
    if (samplePromises[name]) return samplePromises[name];

    samplePromises[name] = fetcher(asset.url)
      .then((response) => {
        if (!response || !response.ok) return null;
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => {
        if (!arrayBuffer) return null;
        return ctx.decodeAudioData(arrayBuffer);
      })
      .then((buffer) => {
        sampleBuffers[name] = buffer;
        return buffer;
      })
      .catch(() => null);
    return samplePromises[name];
  }

  function preload() {
    getContext();
    return Promise.all(Object.keys(SAMPLE_ASSETS).map(loadSample)).then(() => undefined);
  }

  function playSample(name, ctx) {
    var asset = SAMPLE_ASSETS[name];
    var buffer = sampleBuffers[name];
    if (!asset || !buffer || !ctx.createBufferSource) return false;
    var source = ctx.createBufferSource();
    var gain = ctx.createGain();
    source.buffer = buffer;
    if (source.playbackRate?.setValueAtTime) {
      source.playbackRate.setValueAtTime(asset.playbackRate || 1, ctx.currentTime);
    } else if (source.playbackRate) {
      source.playbackRate.value = asset.playbackRate || 1;
    }
    gain.gain.setValueAtTime(asset.gain || 0.35, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    return true;
  }

  function playFallback(name, ctx) {
    var profile = SYNTH_PROFILE[name];
    if (!profile || !ctx || !ctx.createOscillator) return;
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

  function play(name) {
    if (!enabled) return;
    var ctx = getContext();
    if (!ctx) return;
    resumeContext(ctx);

    if (playSample(name, ctx)) return;
    loadSample(name);
    playFallback(name, ctx);
  }

  function toggle() {
    enabled = !enabled;
    if (enabled) prime();
    return enabled;
  }

  return {
    prime,
    preload,
    play,
    toggle,
    isEnabled() {
      return enabled;
    },
  };
}
