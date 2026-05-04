"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        MonthlyTrendModel?: {
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

export default function MonthlyTrendTool() {
    useEffect(() => {
        let cancelled = false;

        async function bootTool() {
            try {
                await Promise.all([
                    loadBrowserScript("/vendor/plotly/plotly.min.js"),
                    loadBrowserScript("/vendor/xlsx/xlsx.full.min.js"),
                ]);
                await import("./monthly-trend-engine.js");

                if (!cancelled) {
                    window.MonthlyTrendModel?.initApp();
                }
            } catch (error) {
                console.error("Failed to start monthly trend model", error);
            }
        }

        void bootTool();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div id="monthly-trend-root" className="monthly-trend-tool">
            <aside id="monthly-sidebar" className="sidebar">
                <button id="monthly-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Monthly Trend Lab</div>
                    <h1 className="sidebar-heading">分月指标趋势分析模型</h1>
                    <p className="sidebar-copy">上传连续月份明细，按自定义维度查看趋势、环比同比、结构和质量变化。</p>
                    <div id="monthly-message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">数据与模板</h2>
                    <div className="upload-zone" id="monthly-upload-zone">
                        <input id="monthly-file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                        <label htmlFor="monthly-file-input" className="upload-label">
                            <span className="upload-title">上传分月数据</span>
                            <span className="upload-hint">支持 CSV、XLSX、XLS</span>
                        </label>
                    </div>
                    <div className="button-grid">
                        <button type="button" className="btn btn-secondary" id="monthly-btn-demo">示例数据</button>
                        <button type="button" className="btn btn-secondary" id="monthly-btn-csv-template">CSV 模板</button>
                        <button type="button" className="btn btn-secondary" id="monthly-btn-xlsx-template">Excel 模板</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">分析口径</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>月份/年月列</span>
                            <select id="monthly-month-column" className="input" />
                        </label>
                        <label className="field">
                            <span>关注指标</span>
                            <select id="monthly-metric-select" className="input" />
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">维度与筛选</h2>
                    <div className="dimension-picker" id="monthly-dimension-picker" />
                    <div className="form-grid filter-grid" id="monthly-filter-grid" />
                </section>

                <section className="sidebar-block sidebar-actions">
                    <button type="button" className="btn btn-primary" id="monthly-btn-reset">重置筛选</button>
                    <button type="button" className="btn btn-secondary" id="monthly-btn-export">导出摘要</button>
                </section>
            </aside>

            <div id="monthly-sidebar-backdrop" className="sidebar-backdrop" aria-hidden="true" />

            <button id="monthly-sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} title="展开控制台" aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>分月指标趋势分析模型</h1>
                        <p className="model-subtitle">把连续月份数据整理成销量、单车质量、同期对比、环比同比和结构占比，先看清过去几个月发生了什么。</p>
                    </div>
                    <div className="header-actions">
                        <div className="data-status" id="monthly-data-status">示例数据</div>
                    </div>
                </header>

                <section className="workspace-grid featured-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>多指标月度趋势</h2>
                                <p id="monthly-trend-caption">销量、单车净收入和单车边际分段展示。</p>
                            </div>
                        </div>
                        <div id="monthly-trend-chart" className="chart chart-tall" />
                    </article>
                </section>

                <section className="workspace-grid top-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>同期月度对比</h2>
                                <p id="monthly-cumulative-caption">当前年度与上年同月的指标水平。</p>
                            </div>
                        </div>
                        <div id="monthly-cumulative-chart" className="chart" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>环比 / 同比变化</h2>
                                <p id="monthly-mom-caption">用折线查看环比和同比变化率。</p>
                            </div>
                        </div>
                        <div id="monthly-mom-chart" className="chart" />
                    </article>
                </section>

                <section className="workspace-grid bottom-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>结构趋势</h2>
                                <p id="monthly-structure-caption">各维度占比随月份变化。</p>
                            </div>
                        </div>
                        <div id="monthly-structure-chart" className="chart" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>结构集中度</h2>
                                <p id="monthly-concentration-caption">当前层级的头部占比和集中度。</p>
                            </div>
                        </div>
                        <div id="monthly-concentration-chart" className="chart" />
                    </article>
                </section>

                <section className="workspace-grid bottom-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>同比热力图</h2>
                                <p id="monthly-heatmap-caption">按当前维度查看各月份同比变化。</p>
                            </div>
                        </div>
                        <div id="monthly-heatmap-chart" className="chart chart-heatmap" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>环比热力图</h2>
                                <p id="monthly-mom-heatmap-caption">按当前维度查看各月份环比变化。</p>
                            </div>
                        </div>
                        <div id="monthly-mom-heatmap-chart" className="chart chart-heatmap" />
                    </article>
                </section>

            </main>
        </div>
    );
}
