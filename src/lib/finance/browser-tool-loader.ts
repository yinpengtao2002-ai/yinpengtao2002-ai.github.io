export type FinanceBrowserEngine = {
    initApp: () => void | Promise<void>;
    dispose: () => void;
};

export type FinanceBrowserEngineName =
    | "BusinessAnalysisModel"
    | "MonthlyTrendModel"
    | "ProfitBridgeSensitivity"
    | "ProfitStructureModel"
    | "PerspectiveBIModel";

type BootFinanceBrowserEngineOptions = {
    engineName: FinanceBrowserEngineName;
    importEngine: () => Promise<unknown>;
    scripts?: string[];
    isCancelled?: () => boolean;
    errorMessage: string;
    onError?: (error: unknown) => void;
};

type LoadBrowserScriptOptions = {
    timeoutMs?: number;
    globalName?: string;
};

const BROWSER_SCRIPT_GLOBALS: Record<string, string> = {
    "/vendor/plotly/plotly.min.js": "Plotly",
    "/vendor/xlsx/xlsx.full.min.js": "XLSX",
};

declare global {
    interface Window {
        __financeToolScripts?: Record<string, Promise<void> | undefined>;
        BusinessAnalysisModel?: FinanceBrowserEngine;
        MonthlyTrendModel?: FinanceBrowserEngine;
        ProfitBridgeSensitivity?: FinanceBrowserEngine;
        ProfitStructureModel?: FinanceBrowserEngine;
        PerspectiveBIModel?: FinanceBrowserEngine;
    }
}

export async function bootFinanceBrowserEngine({
    engineName,
    importEngine,
    scripts = [],
    isCancelled = () => false,
    errorMessage,
    onError,
}: BootFinanceBrowserEngineOptions): Promise<FinanceBrowserEngine | undefined> {
    let engine: FinanceBrowserEngine | undefined;
    try {
        await Promise.all(scripts.map((src) => loadBrowserScript(src)));
        await importEngine();

        engine = window[engineName];
        if (!engine) {
            throw new Error(`Finance browser engine ${engineName} was not registered`);
        }

        if (isCancelled()) {
            engine.dispose();
            return undefined;
        }

        await engine.initApp();
        if (isCancelled()) {
            engine.dispose();
            return undefined;
        }
        return engine;
    } catch (error) {
        engine?.dispose();
        console.error(errorMessage, error);
        onError?.(error);
        return undefined;
    }
}

function browserGlobalExists(globalName: string | undefined) {
    if (!globalName || typeof window === "undefined") return !globalName;
    return Boolean((window as unknown as Record<string, unknown>)[globalName]);
}

export function loadBrowserScript(src: string, options: LoadBrowserScriptOptions = {}) {
    if (typeof window === "undefined") return Promise.resolve();

    const timeoutMs = options.timeoutMs ?? 15_000;
    const globalName = options.globalName ?? BROWSER_SCRIPT_GLOBALS[src];
    if (browserGlobalExists(globalName)) return Promise.resolve();

    window.__financeToolScripts = window.__financeToolScripts || {};
    if (window.__financeToolScripts[src]) return window.__financeToolScripts[src];

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true" && browserGlobalExists(globalName)) {
        window.__financeToolScripts[src] = Promise.resolve();
        return window.__financeToolScripts[src];
    }

    const pending = new Promise<void>((resolve, reject) => {
        const script = existing || document.createElement("script");
        let settled = false;

        const cleanup = () => {
            globalThis.clearTimeout(timeoutId);
            script.removeEventListener("load", handleLoad);
            script.removeEventListener("error", handleError);
        };

        const fail = (error: Error) => {
            if (settled) return;
            settled = true;
            cleanup();
            script.remove();
            reject(error);
        };

        const handleLoad = () => {
            if (settled) return;
            if (!browserGlobalExists(globalName)) {
                fail(new Error(`Loaded ${src} but ${globalName} is unavailable`));
                return;
            }
            settled = true;
            cleanup();
            script.dataset.loaded = "true";
            resolve();
        };

        const handleError = () => fail(new Error(`Failed to load ${src}`));
        const timeoutId = globalThis.setTimeout(() => {
            fail(new Error(`Timed out loading ${src}`));
        }, timeoutMs);

        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", handleError, { once: true });

        if (!existing) {
            script.src = src;
            script.async = true;
            document.body.appendChild(script);
        }
    });

    const retryable = pending.catch((error) => {
        if (window.__financeToolScripts?.[src] === retryable) {
            delete window.__financeToolScripts[src];
        }
        throw error;
    });
    window.__financeToolScripts[src] = retryable;
    return retryable;
}

export {};
