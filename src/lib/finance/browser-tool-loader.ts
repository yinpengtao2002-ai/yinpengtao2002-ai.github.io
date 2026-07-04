export type FinanceBrowserEngine = {
    initApp: () => void;
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
}: BootFinanceBrowserEngineOptions) {
    try {
        await Promise.all(scripts.map(loadBrowserScript));
        await importEngine();

        if (!isCancelled()) {
            window[engineName]?.initApp();
        }
    } catch (error) {
        console.error(errorMessage, error);
    }
}

export function loadBrowserScript(src: string) {
    if (typeof window === "undefined") return Promise.resolve();

    window.__financeToolScripts = window.__financeToolScripts || {};
    if (window.__financeToolScripts[src]) return window.__financeToolScripts[src];

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded === "true") {
        window.__financeToolScripts[src] = Promise.resolve();
        return window.__financeToolScripts[src];
    }

    window.__financeToolScripts[src] = new Promise<void>((resolve, reject) => {
        const script = existing || document.createElement("script");

        const handleLoad = () => {
            script.dataset.loaded = "true";
            resolve();
        };

        script.addEventListener("load", handleLoad, { once: true });
        script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });

        if (!existing) {
            script.src = src;
            script.async = true;
            document.body.appendChild(script);
        }
    });

    return window.__financeToolScripts[src];
}

export {};
