"use client";

import { useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

declare global {
    interface Window {
        ProfitStructureModel?: {
            initApp: () => void;
        };
        __financeToolScripts?: Record<string, Promise<void> | undefined>;
    }
}

function loadBrowserScript(src: string) {
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

type AccessResponse = {
    token?: string;
    error?: string;
    errorCode?: string;
};

function getAccessErrorMessage(payload: AccessResponse, fallback: string) {
    if (payload.errorCode === "access_not_configured") {
        return "内测密钥还没有在部署环境配置，请先配置 FINANCE_AI_ACCESS_KEY。";
    }

    if (payload.errorCode === "access_denied") {
        return "内测密钥不正确。";
    }

    return payload.error || fallback;
}

export default function ProfitStructureTool() {
    const [accessToken, setAccessToken] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [accessBusy, setAccessBusy] = useState(false);
    const [accessError, setAccessError] = useState("");

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        let cancelled = false;

        async function bootTool() {
            try {
                await Promise.all([
                    loadBrowserScript("/vendor/plotly/plotly.min.js"),
                    loadBrowserScript("/vendor/xlsx/xlsx.full.min.js"),
                ]);
                await import("./profit-structure-engine.js");

                if (!cancelled) {
                    window.ProfitStructureModel?.initApp();
                }
            } catch (error) {
                console.error("Failed to start profit structure model", error);
            }
        }

        void bootTool();

        return () => {
            cancelled = true;
        };
    }, [accessToken]);

    async function handleAccessSubmit() {
        const key = accessKey.trim();

        if (!key) {
            setAccessError("请输入内测密钥。");
            return;
        }

        setAccessBusy(true);
        setAccessError("");

        try {
            const response = await fetch("/api/tools/finance-ai-assistant/access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
            });
            const payload = await response.json().catch(() => ({})) as AccessResponse;

            if (!response.ok || !payload.token) {
                throw new Error(getAccessErrorMessage(payload, "内测密钥校验失败。"));
            }

            setAccessToken(payload.token);
            setAccessKey("");
        } catch (error) {
            setAccessError(error instanceof Error ? error.message : "内测密钥校验失败。");
        } finally {
            setAccessBusy(false);
        }
    }

    if (!accessToken) {
        return (
            <div id="profit-structure-root" className="profit-structure-tool">
                <section className="profit-structure-access-gate" aria-label="多维利润质量诊断模型内测访问">
                    <div className="profit-structure-access-card">
                        <span className="profit-structure-access-icon" aria-hidden="true">
                            <KeyRound />
                        </span>
                        <div>
                            <p className="eyebrow">Private Beta</p>
                            <h1>输入内测密钥</h1>
                            <p>这个模型还在打磨中。通过后再上传底表，数据仍只保留在当前页面会话里。</p>
                        </div>
                        <form
                            className="profit-structure-access-form"
                            onSubmit={(event) => {
                                event.preventDefault();
                                void handleAccessSubmit();
                            }}
                        >
                            <input
                                value={accessKey}
                                onChange={(event) => setAccessKey(event.target.value)}
                                placeholder="输入内测密钥"
                                type="password"
                                autoComplete="off"
                                disabled={accessBusy}
                            />
                            <button type="submit" disabled={accessBusy || !accessKey.trim()}>
                                {accessBusy ? <Loader2 className="profit-structure-spin" aria-hidden="true" /> : "进入"}
                            </button>
                        </form>
                        {accessError ? <p className="profit-structure-access-error">{accessError}</p> : null}
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div id="profit-structure-root" className="profit-structure-tool">
            <aside id="profit-structure-sidebar" className="sidebar">
                <button id="profit-structure-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Quality Lab</div>
                    <h1 className="sidebar-heading">多维利润质量诊断模型</h1>
                    <p className="sidebar-copy">上传经营明细，选择质量指标和诊断粒度，判断先看哪个维度、哪些组合正在拖累整体质量。</p>
                    <div id="profit-structure-message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">数据与模板</h2>
                    <div className="upload-zone" id="profit-structure-upload-zone">
                        <input id="profit-structure-file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                        <label htmlFor="profit-structure-file-input" className="upload-label">
                            <span className="upload-title">上传经营明细</span>
                            <span className="upload-hint">支持 CSV、XLSX、XLS；沿用月份、维度、销量、上传指标底表</span>
                        </label>
                    </div>
                    <div className="button-grid">
                        <button type="button" className="btn btn-primary full-row" id="profit-structure-btn-demo">示例数据</button>
                        <button type="button" className="btn btn-secondary" id="profit-structure-btn-csv-template">CSV 模板</button>
                        <button type="button" className="btn btn-secondary" id="profit-structure-btn-xlsx-template">Excel 模板</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">诊断粒度</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>第一诊断维度</span>
                            <select id="profit-structure-primary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第二诊断维度</span>
                            <select id="profit-structure-secondary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第三诊断维度</span>
                            <select id="profit-structure-tertiary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第四诊断维度</span>
                            <select id="profit-structure-fourth-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第五诊断维度</span>
                            <select id="profit-structure-fifth-dimension" className="input" />
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">诊断指标</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>质量指标</span>
                            <select id="profit-structure-primary-metric" className="input" />
                        </label>
                        <label className="field">
                            <span>参考指标</span>
                            <select id="profit-structure-secondary-metric" className="input" />
                        </label>
                        <label className="field">
                            <span>期间范围</span>
                            <select id="profit-structure-month-select" className="input" />
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">筛选条件</h2>
                    <div className="form-grid filter-grid" id="profit-structure-filter-grid" />
                </section>

                <section className="sidebar-block sidebar-actions">
                    <button type="button" className="btn btn-primary" id="profit-structure-btn-reset">重置筛选</button>
                </section>
            </aside>

            <div id="profit-structure-sidebar-backdrop" className="sidebar-backdrop" aria-hidden="true" />

            <button id="profit-structure-sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} title="展开控制台" aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>多维利润质量诊断模型</h1>
                        <p className="model-subtitle">用同一张经营明细底表，找出最该优先下钻的维度，以及正在拉低整体质量的组合。</p>
                    </div>
                    <div className="header-actions">
                        <div className="data-status" id="profit-structure-data-status">示例数据</div>
                    </div>
                </header>

                <section className="metrics-grid" id="profit-structure-metrics-grid" />

                <section className="diagnostic-summary-grid" id="profit-structure-diagnostic-summary" />

                <section className="workspace-grid featured-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>维度解释力</h2>
                                <p id="profit-structure-dimension-caption">判断哪个维度最能解释单位质量差异和负向拖累。</p>
                            </div>
                        </div>
                        <div id="profit-structure-dimension-chart" className="chart chart-medium" />
                    </article>
                </section>

                <section className="workspace-grid middle-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>结构质量地图</h2>
                                <p id="profit-structure-quality-caption">按规模占比和单位质量偏离定位核心组合。</p>
                            </div>
                        </div>
                        <div id="profit-structure-quality-map" className="chart chart-tall" />
                    </article>
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>拖累贡献</h2>
                                <p id="profit-structure-drag-caption">按销量与单位质量差，列出最拉低整体质量的组合。</p>
                            </div>
                        </div>
                        <div id="profit-structure-drag-list" className="drag-panel" />
                    </article>
                </section>
            </main>
        </div>
    );
}
