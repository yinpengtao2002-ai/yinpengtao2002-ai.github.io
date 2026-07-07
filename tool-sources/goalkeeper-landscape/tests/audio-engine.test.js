import { describe, expect, it } from "vitest";
import * as AudioModule from "../src/audio/audio-engine.js";
import { createAudioEngine, getSoundAssetManifest } from "../src/audio/audio-engine.js";

function createFakeAudioRoot() {
  var decodedBuffers = [];
  var startedSources = [];
  var fetchedUrls = [];
  var destination = {};
  var context = {
    currentTime: 1,
    state: "running",
    destination,
    resumeCalls: 0,
    resume() {
      this.resumeCalls += 1;
      this.state = "running";
      return Promise.resolve();
    },
    decodeAudioData(arrayBuffer) {
      var decoded = { kind: "decoded", bytes: arrayBuffer.byteLength, index: decodedBuffers.length };
      decodedBuffers.push(decoded);
      return Promise.resolve(decoded);
    },
    createBufferSource() {
      var source = {
        buffer: null,
        playbackRate: {
          value: 1,
          setValueAtTime(value) {
            this.value = value;
          },
        },
        connect(target) {
          this.target = target;
        },
        start(time) {
          this.startedAt = time;
          startedSources.push(this);
        },
      };
      return source;
    },
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime(value) {
            this.value = value;
          },
        },
        connect(target) {
          this.target = target;
        },
      };
    },
    createOscillator() {
      throw new Error("oscillator fallback should not be used when a sample is decoded");
    },
  };

  return {
    fetchedUrls,
    decodedBuffers,
    startedSources,
    AudioContext: function AudioContext() {
      return context;
    },
    fetch(url) {
      fetchedUrls.push(url);
      return Promise.resolve({
        ok: true,
        arrayBuffer() {
          return Promise.resolve(new ArrayBuffer(8));
        },
      });
    },
  };
}

function createUnlockAudioRoot() {
  var startedOscillators = [];
  var gainValues = [];
  var context = {
    currentTime: 2,
    state: "suspended",
    destination: {},
    resumeCalls: 0,
    resume() {
      this.resumeCalls += 1;
      this.state = "running";
      return Promise.resolve();
    },
    decodeAudioData(arrayBuffer) {
      return Promise.resolve({ kind: "decoded", bytes: arrayBuffer.byteLength });
    },
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          setValueAtTime() {},
        },
        connect(target) {
          this.target = target;
        },
        start(time) {
          startedOscillators.push(time);
        },
        stop(time) {
          this.stoppedAt = time;
        },
      };
    },
    createGain() {
      return {
        gain: {
          setValueAtTime(value) {
            gainValues.push(value);
          },
        },
        connect(target) {
          this.target = target;
        },
      };
    },
  };

  return {
    context,
    startedOscillators,
    gainValues,
    AudioContext: function AudioContext() {
      return context;
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        arrayBuffer() {
          return Promise.resolve(new ArrayBuffer(8));
        },
      });
    },
  };
}

function createLayeredAudioRoot() {
  var startedSources = [];
  var startedOscillators = [];
  var scheduledDelays = [];
  var context = {
    currentTime: 3,
    state: "running",
    destination: {},
    decodeAudioData(arrayBuffer) {
      return Promise.resolve({ kind: "decoded", bytes: arrayBuffer.byteLength });
    },
    createBufferSource() {
      var source = {
        buffer: null,
        playbackRate: {
          value: 1,
          setValueAtTime(value) {
            this.value = value;
          },
        },
        connect(target) {
          this.target = target;
        },
        start(time) {
          this.startedAt = time;
          startedSources.push(this);
        },
      };
      return source;
    },
    createGain() {
      return {
        gain: {
          value: 1,
          setValueAtTime(value) {
            this.value = value;
          },
          exponentialRampToValueAtTime(value) {
            this.value = value;
          },
        },
        connect(target) {
          this.target = target;
        },
      };
    },
    createOscillator() {
      return {
        type: "sine",
        frequency: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect(target) {
          this.target = target;
        },
        start(time) {
          this.startedAt = time;
          startedOscillators.push(this);
        },
        stop(time) {
          this.stoppedAt = time;
        },
      };
    },
  };

  return {
    context,
    startedSources,
    startedOscillators,
    scheduledDelays,
    AudioContext: function AudioContext() {
      return context;
    },
    fetch() {
      return Promise.resolve({
        ok: true,
        arrayBuffer() {
          return Promise.resolve(new ArrayBuffer(8));
        },
      });
    },
    setTimeout(callback, delay) {
      scheduledDelays.push(delay);
      callback();
      return scheduledDelays.length;
    },
  };
}

describe("audio engine", () => {
  it("maps core game events to downloaded football-style samples", () => {
    const manifest = getSoundAssetManifest();

    expect(manifest.shot.url).toBe("/tools/goalkeeper-landscape/audio/mixkit-soccer-ball-kick-2099.wav");
    expect(manifest.save.url).toBe("/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav");
    expect(manifest.catch.url).toBe("/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav");
    expect(manifest.frame.url).toBe("/tools/goalkeeper-landscape/audio/mixkit-hitting-soccer-ball-2112.wav");
    expect(manifest.frame.playbackRate).toBeGreaterThan(manifest.save.playbackRate);
    expect(manifest.goal.url).toBe("/tools/goalkeeper-landscape/audio/mixkit-basketball-ball-hitting-net-2084.wav");
  });

  it("preloads and plays decoded samples instead of synthetic oscillators", async () => {
    const root = createFakeAudioRoot();
    const audio = createAudioEngine(root);

    await audio.preload();
    audio.play("goal");

    expect(root.fetchedUrls).toContain("/tools/goalkeeper-landscape/audio/mixkit-basketball-ball-hitting-net-2084.wav");
    expect(root.startedSources).toHaveLength(1);
    expect(root.startedSources[0].buffer).toEqual(expect.objectContaining({ kind: "decoded" }));
  });

  it("unlocks browser audio immediately when primed from the start gesture", () => {
    const root = createUnlockAudioRoot();
    const audio = createAudioEngine(root);

    audio.prime();

    expect(root.context.resumeCalls).toBe(1);
    expect(root.startedOscillators).toHaveLength(1);
    expect(root.gainValues).toContain(0.0001);
  });

  it("exposes restrained layered audio plans for high-value match events", () => {
    expect(AudioModule.getAudioEventPlan).toBeTypeOf("function");

    expect(AudioModule.getAudioEventPlan("save-streak")).toEqual([
      expect.objectContaining({ name: "save", marker: "save-streak-audio-cue" }),
      expect.objectContaining({ name: "tick", delay: expect.any(Number), gainScale: expect.any(Number) }),
    ]);
    expect(AudioModule.getAudioEventPlan("danger-goal")).toEqual([
      expect.objectContaining({ name: "goal", marker: "danger-goal-audio-cue" }),
      expect.objectContaining({ name: "frame", delay: expect.any(Number), gainScale: expect.any(Number) }),
    ]);
    expect(AudioModule.getAudioEventPlan("round-end")).toEqual([
      expect.objectContaining({ name: "frame", marker: "round-end-audio-cue" }),
      expect.objectContaining({ name: "tick", delay: expect.any(Number), gainScale: expect.any(Number) }),
    ]);
    expect(AudioModule.getAudioEventPlan("unknown")).toEqual([]);
  });

  it("plays layered match events with scheduled secondary cues", async () => {
    const root = createLayeredAudioRoot();
    const audio = createAudioEngine(root);

    await audio.preload();
    expect(audio.playEvent).toBeTypeOf("function");
    audio.playEvent("save-streak");

    expect(root.startedSources).toHaveLength(1);
    expect(root.startedOscillators).toHaveLength(1);
    expect(root.scheduledDelays).toEqual([60]);
  });
});
