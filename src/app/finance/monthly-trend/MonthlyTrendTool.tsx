"use client";

import { useEffect, useState } from "react";
import { bootFinanceBrowserEngine, type FinanceBrowserEngine } from "@/lib/finance/browser-tool-loader";

export default function MonthlyTrendTool() {
    const [bootAttempt, setBootAttempt] = useState(0);
    const [bootError, setBootError] = useState("");

    useEffect(() => {
        let cancelled = false;
        let engine: FinanceBrowserEngine | undefined;
        setBootError("");

        void bootFinanceBrowserEngine({
            engineName: "MonthlyTrendModel",
            importEngine: () => import("./monthly-trend-engine.js"),
            scripts: [
                "/vendor/plotly/plotly.min.js",
                "/vendor/xlsx/xlsx.full.min.js",
            ],
            isCancelled: () => cancelled,
            errorMessage: "Failed to start monthly trend model",
            onError: () => {
                if (!cancelled) setBootError("趋势引擎加载失败，请重试。");
            },
        }).then((loaded) => {
            engine = loaded;
            if (cancelled) loaded?.dispose();
        });

        return () => {
            cancelled = true;
            engine?.dispose();
        };
    }, [bootAttempt]);

    return (
        <div id="monthly-trend-root" className="monthly-trend-tool">
            {bootError ? (
                <div className="engine-load-error" role="alert">
                    <span>{bootError}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => setBootAttempt((value) => value + 1)}>重试加载</button>
                </div>
            ) : null}
            <aside id="monthly-sidebar" className="sidebar">
                <button id="monthly-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Monthly Trend Lab</div>
                    <h1 className="sidebar-heading">分月指标趋势分析模型</h1>
                    <p className="sidebar-copy">上传连续月份明细，按自定义维度查看趋势、环比同比、结构和质量变化。</p>
                    <div id="monthly-message-area" className="message-area" aria-live="polite" />
                    <section id="monthly-field-governance" className="finance-field-governance" data-finance-field-governance hidden />
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
                        <button type="button" className="btn btn-secondary" id="monthly-btn-csv-template">CSV 模板</button>
                        <button type="button" className="btn btn-secondary" id="monthly-btn-xlsx-template">Excel 模板</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">分析口径</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>关注指标</span>
                            <select id="monthly-metric-select" className="input" />
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">下钻筛选</h2>
                    <div className="form-grid filter-grid" id="monthly-filter-grid" />
                </section>

                <section className="sidebar-block sidebar-actions">
                    <button type="button" className="btn btn-primary" id="monthly-btn-reset">重置筛选</button>
                </section>
            </aside>

            <div id="monthly-sidebar-backdrop" className="sidebar-backdrop" aria-hidden="true" />

            <button id="monthly-sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} title="展开控制台" aria-label="展开控制台">
                控制台
            </button>

            <div className="main-content">
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
                                <p id="monthly-trend-caption">销量固定展示，其他总额指标自动折算为单车趋势。</p>
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

                <section className="workspace-grid single-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>结构趋势</h2>
                                <p id="monthly-structure-caption">各维度占比随月份变化。</p>
                            </div>
                        </div>
                        <div id="monthly-structure-chart" className="chart" />
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

            </div>
        </div>
    );
}
