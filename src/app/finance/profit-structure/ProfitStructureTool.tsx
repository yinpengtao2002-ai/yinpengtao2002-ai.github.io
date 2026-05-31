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
                    <div className="sidebar-kicker">Profit Structure Lab</div>
                    <h1 className="sidebar-heading">多维度结构分析模型</h1>
                    <p className="sidebar-copy">上传通用经营明细，选择任意维度、任意指标，观察规模、单位值和结构分层。</p>
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
                    <h2 className="sidebar-title">分析口径</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>当前分析维度</span>
                            <select id="profit-structure-primary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>组合维度</span>
                            <select id="profit-structure-secondary-dimension" className="input" />
                        </label>
                        <label className="field">
                            <span>矩阵横轴指标</span>
                            <select id="profit-structure-primary-metric" className="input" />
                        </label>
                        <label className="field">
                            <span>矩阵纵轴指标</span>
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
                        <h1>多维度结构分析模型</h1>
                        <p className="model-subtitle">用同一张经营明细底表，在任意维度下跟随上传指标生成结构矩阵和候选图表。</p>
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
                                <h2>盈利结构矩阵</h2>
                                <p id="profit-structure-matrix-caption">横轴和纵轴会跟随当前选择的上传指标动态切换。</p>
                            </div>
                        </div>
                        <div id="profit-structure-matrix-chart" className="chart chart-tall" />
                    </article>
                </section>

                <section className="workspace-grid middle-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>候选图表</h2>
                                <p id="profit-structure-chart-gallery-caption">根据上传指标生成少量候选图，先用于评审取舍。</p>
                            </div>
                        </div>
                        <div id="profit-structure-chart-gallery" className="chart-gallery" />
                    </article>

                    <article className="panel insight-panel">
                        <div className="panel-header">
                            <div>
                                <h2>结构提示</h2>
                                <p>优先看低值对象、规模对象和当前主指标核心来源。</p>
                            </div>
                        </div>
                        <div id="profit-structure-insight-list" className="insight-list" />
                    </article>
                </section>

                <section className="workspace-grid single-grid">
                    <article className="panel table-panel">
                        <div className="panel-header">
                            <div>
                                <h2>经营对象盈利明细</h2>
                                <p id="profit-structure-table-caption">按当前分析维度排序，展示销量、分层、上传指标和单位值。</p>
                            </div>
                        </div>
                        <div id="profit-structure-table-wrap" className="table-wrap" />
                    </article>
                </section>
            </main>
        </div>
    );
}
