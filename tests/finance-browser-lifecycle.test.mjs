import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const loaderUrl = new URL("../src/lib/finance/browser-tool-loader.ts", import.meta.url);
const loader = await import(loaderUrl);
const sharedLifecycleSource = await readFile(
  new URL("../src/lib/finance/browser-engine-lifecycle.ts", import.meta.url),
  "utf8",
);

const engineFixtures = [
  ["BusinessAnalysisModel", "../src/app/finance/business-analysis/business-analysis-engine.js", ".business-tool .js-plotly-plot"],
  ["MonthlyTrendModel", "../src/app/finance/monthly-trend/monthly-trend-engine.js", ".monthly-trend-tool .js-plotly-plot"],
  ["ProfitBridgeSensitivity", "../src/app/finance/sensitivity-analysis/sensitivity-engine.js", ".sensitivity-tool .js-plotly-plot"],
  ["ProfitStructureModel", "../src/app/finance/profit-structure/profit-structure-engine.js", ".profit-structure-tool .js-plotly-plot"],
  ["PerspectiveBIModel", "../src/app/finance/perspective-bi/perspective-bi-engine.js", "perspective-viewer"],
];

class FakeScript extends EventTarget {
  constructor() {
    super();
    this.dataset = {};
    this.src = "";
    this.async = false;
    this.removed = false;
  }

  remove() {
    this.removed = true;
  }
}

function installFakeBrowser(onAppend) {
  const scripts = [];
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { __financeToolScripts: {} };
  globalThis.document = {
    querySelector(selector) {
      const src = selector.match(/script\[src="(.+)"\]/)?.[1];
      return scripts.find((script) => script.src === src && !script.removed) ?? null;
    },
    createElement(tag) {
      assert.equal(tag, "script");
      return new FakeScript();
    },
    body: {
      appendChild(script) {
        scripts.push(script);
        onAppend?.(script);
      },
    },
  };
  return {
    scripts,
    restore() {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    },
  };
}

test("browser engine boot returns the initialized engine and disposes a cancelled boot", async () => {
  const originalWindow = globalThis.window;
  let initCount = 0;
  let disposeCount = 0;
  const engine = {
    initApp() { initCount += 1; },
    dispose() { disposeCount += 1; },
  };
  globalThis.window = { BusinessAnalysisModel: engine };
  try {
    const loaded = await loader.bootFinanceBrowserEngine({
      engineName: "BusinessAnalysisModel",
      importEngine: async () => undefined,
      errorMessage: "boot failed",
    });
    assert.equal(loaded, engine);
    assert.equal(initCount, 1);

    const cancelled = await loader.bootFinanceBrowserEngine({
      engineName: "BusinessAnalysisModel",
      importEngine: async () => undefined,
      isCancelled: () => true,
      errorMessage: "boot failed",
    });
    assert.equal(cancelled, undefined);
    assert.equal(disposeCount, 1);
  } finally {
    globalThis.window = originalWindow;
  }
});

test("browser engine boot surfaces asynchronous initialization failures", async () => {
  const originalWindow = globalThis.window;
  const originalConsoleError = console.error;
  const failure = new Error("async initialization failed");
  let reported;
  let disposeCount = 0;
  globalThis.window = {
    PerspectiveBIModel: {
      async initApp() { throw failure; },
      dispose() { disposeCount += 1; },
    },
  };
  console.error = () => {};
  try {
    const loaded = await loader.bootFinanceBrowserEngine({
      engineName: "PerspectiveBIModel",
      importEngine: async () => undefined,
      errorMessage: "boot failed",
      onError(error) { reported = error; },
    });
    assert.equal(loaded, undefined);
    assert.equal(reported, failure);
    assert.equal(disposeCount, 1);
  } finally {
    console.error = originalConsoleError;
    globalThis.window = originalWindow;
  }
});

test("failed browser scripts leave the cache retryable", async () => {
  let attempt = 0;
  const browser = installFakeBrowser((script) => {
    attempt += 1;
    queueMicrotask(() => {
      if (attempt === 1) {
        script.dispatchEvent(new Event("error"));
        return;
      }
      globalThis.window.TestLibrary = {};
      script.dispatchEvent(new Event("load"));
    });
  });
  try {
    await assert.rejects(
      loader.loadBrowserScript("/test-library.js", { globalName: "TestLibrary", timeoutMs: 100 }),
      /Failed to load/,
    );
    assert.equal(globalThis.window.__financeToolScripts["/test-library.js"], undefined);

    await loader.loadBrowserScript("/test-library.js", { globalName: "TestLibrary", timeoutMs: 100 });
    assert.equal(attempt, 2);
    assert.ok(globalThis.window.TestLibrary);
  } finally {
    browser.restore();
  }
});

test("browser script loading detects an existing global and enforces a timeout", async () => {
  const browser = installFakeBrowser();
  try {
    globalThis.window.ReadyLibrary = {};
    await loader.loadBrowserScript("/ready.js", { globalName: "ReadyLibrary", timeoutMs: 10 });
    assert.equal(browser.scripts.length, 0);

    await assert.rejects(
      loader.loadBrowserScript("/never.js", { globalName: "NeverLibrary", timeoutMs: 10 }),
      /Timed out loading/,
    );
    assert.equal(globalThis.window.__financeToolScripts["/never.js"], undefined);
  } finally {
    browser.restore();
  }
});

test("finance browser engines expose repeatable disposal boundaries", async () => {
  for (const [engineName, path, purgeSelector] of engineFixtures) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    const lifecycleBoundary = `${source}\n${sharedLifecycleSource}`;
    assert.match(source, /function dispose\(\)/, `${engineName} should define dispose()`);
    assert.match(source, new RegExp(`window\\.${engineName}\\s*=\\s*\\{\\s*initApp,\\s*dispose\\s*\\}`), `${engineName} should expose dispose()`);
    assert.match(source, /createFinanceEngineLifecycle/, `${engineName} should use the shared lifecycle boundary`);
    assert.match(lifecycleBoundary, /AbortController|\.abort\(\)/, `${engineName} should abort listeners and async work`);
    assert.match(lifecycleBoundary, /\.disconnect\(\)/, `${engineName} should disconnect observers`);
    assert.match(lifecycleBoundary, /clearTimeout|clearInterval|cancelAnimationFrame/, `${engineName} should clear scheduled work`);
    assert.ok(source.includes(purgeSelector), `${engineName} should clean ${purgeSelector}`);
  }
});

test("finance tool wrappers dispose loaded engines and expose a retry action", async () => {
  const wrappers = [
    "../src/app/finance/business-analysis/BusinessAnalysisTool.tsx",
    "../src/app/finance/monthly-trend/MonthlyTrendTool.tsx",
    "../src/app/finance/profit-structure/ProfitStructureTool.tsx",
    "../src/app/finance/sensitivity-analysis/SensitivityTool.tsx",
    "../src/app/finance/perspective-bi/PerspectiveBITool.tsx",
  ];
  for (const path of wrappers) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /engine\?\.dispose\(\)/, `${path} should dispose the initialized engine`);
    assert.match(source, /onError:/, `${path} should surface boot errors`);
    assert.match(source, /重试加载/, `${path} should expose a retry action`);
  }
  const globalStyles = await readFile(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(globalStyles, /\.engine-load-error\s*\{/, "retry feedback should remain visible above the tool shell");
});
