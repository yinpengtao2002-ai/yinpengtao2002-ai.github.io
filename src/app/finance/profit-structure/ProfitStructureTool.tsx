"use client";

import { useEffect } from "react";

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

export default function ProfitStructureTool() {
    useEffect(() => {
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
    }, []);

    return (
        <div id="profit-structure-root" className="profit-structure-tool">
            <aside id="profit-structure-sidebar" className="sidebar">
                <button id="profit-structure-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Structure Lab</div>
                    <h1 className="sidebar-heading">多维结构关系分析模型</h1>
                    <p className="sidebar-copy">上传通用经营明细，选择维度路径和指标角色，查看多层维度之间的结构关系。</p>
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
                    <h2 className="sidebar-title">维度路径</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>第一层维度</span>
                            <select id="profit-structure-primary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第二层维度</span>
                            <select id="profit-structure-secondary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第三层维度</span>
                            <select id="profit-structure-tertiary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第四层维度</span>
                            <select id="profit-structure-fourth-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>第五层维度</span>
                            <select id="profit-structure-fifth-dimension" className="input" />
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">指标角色</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>权重 / 横轴指标</span>
                            <select id="profit-structure-primary-metric" className="input" />
                        </label>
                        <label className="field">
                            <span>纵轴指标</span>
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
                        <h1>多维结构关系分析模型</h1>
                        <p className="model-subtitle">用同一张经营明细底表，在任意维度路径下查看指标流向和结构定位。</p>
                    </div>
                    <div className="header-actions">
                        <div className="data-status" id="profit-structure-data-status">示例数据</div>
                    </div>
                </header>

                <section className="metrics-grid" id="profit-structure-metrics-grid" />

                <section className="workspace-grid featured-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>维度路径流向</h2>
                                <p id="profit-structure-flow-caption">维度路径与权重指标会跟随控制台同步。</p>
                            </div>
                        </div>
                        <div id="profit-structure-flow-chart" className="chart chart-tall" />
                    </article>
                </section>

                <section className="workspace-grid single-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>结构定位散点</h2>
                                <p id="profit-structure-scatter-caption">维度组合在两个指标上的位置。</p>
                            </div>
                        </div>
                        <div id="profit-structure-scatter-chart" className="chart chart-tall" />
                    </article>
                </section>
            </main>
        </div>
    );
}
