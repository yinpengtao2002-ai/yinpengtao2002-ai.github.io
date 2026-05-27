"use client";

import { createElement, useEffect } from "react";

declare global {
    interface Window {
        PerspectiveBIModel?: {
            initApp: () => void;
        };
    }
}

export default function PerspectiveBITool() {
    useEffect(() => {
        let cancelled = false;

        async function bootTool() {
            try {
                await import("./perspective-bi-engine.js");

                if (!cancelled) {
                    window.PerspectiveBIModel?.initApp();
                }
            } catch (error) {
                console.error("Failed to start Perspective BI model", error);
            }
        }

        void bootTool();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div id="perspective-bi-root" className="perspective-bi-tool">
            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>Perspective BI 分析台</h1>
                        <p className="model-subtitle">上传明细后先确认字段口径，再交给 Perspective 原生面板完成拖拽、分组、筛选和图表切换。</p>
                    </div>
                    <div className="header-actions">
                        <div className="data-status" id="perspective-data-status">示例数据</div>
                    </div>
                </header>

                <section className="panel data-toolbar" aria-label="数据工具条">
                    <div className="toolbar-upload">
                        <div className="upload-zone" id="perspective-upload-zone">
                            <input id="perspective-file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                            <label htmlFor="perspective-file-input" className="upload-label">
                                <span className="upload-title">上传 BI 数据</span>
                                <span className="upload-hint">CSV / XLSX / XLS</span>
                            </label>
                        </div>
                        <div className="button-grid">
                            <button type="button" className="btn btn-secondary" id="perspective-btn-demo">示例数据</button>
                            <button type="button" className="btn btn-secondary" id="perspective-btn-csv-template">CSV 模板</button>
                            <button type="button" className="btn btn-secondary" id="perspective-btn-xlsx-template">Excel 模板</button>
                        </div>
                    </div>

                    <div id="perspective-data-summary" className="summary-grid" />

                    <div className="toolbar-actions">
                        <button type="button" className="btn btn-primary" id="perspective-btn-reset-view">重置视图</button>
                        <button type="button" className="btn btn-secondary" id="perspective-btn-export-csv">导出 CSV</button>
                    </div>

                    <div id="perspective-message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="panel field-role-panel" id="perspective-field-role-panel" aria-label="字段口径确认">
                    <div className="field-role-header">
                        <div>
                            <h2>字段口径确认</h2>
                            <p className="field-role-help">系统会先判断维度和指标，你也可以手动调整后再继续拖拽分析。</p>
                        </div>
                        <div className="field-role-actions">
                            <div className="field-role-summary" id="perspective-field-role-summary">字段待确认</div>
                            <button
                                type="button"
                                className="btn btn-primary important-action-btn"
                                id="perspective-field-roles-toggle"
                                aria-expanded="true"
                            >
                                完成字段确认
                            </button>
                        </div>
                    </div>
                    <div id="perspective-field-roles" className="field-role-list" />
                </section>

                <section className="panel calculated-metric-panel collapsed" id="perspective-calculated-metric-panel" aria-label="计算指标">
                    <div className="calculated-metric-header">
                        <div>
                            <h2>计算指标视图</h2>
                            <p>用于单车、费率、结构占比这类需要先汇总再相除的指标，结果单独展示，不写入 Perspective 字段。</p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-secondary calculated-metric-toggle"
                            id="perspective-calculated-metric-toggle"
                            aria-expanded="false"
                        >
                            添加计算指标
                        </button>
                    </div>

                    <div className="calculated-metric-body" id="perspective-calculated-metric-body">
                        <div className="calculated-form">
                            <label className="field">
                                <span>指标名称</span>
                                <input
                                    id="perspective-calculated-metric-name"
                                    className="input"
                                    type="text"
                                    placeholder="例如：单车净收入"
                                />
                            </label>
                            <label className="field">
                                <span>分子字段</span>
                                <select id="perspective-calculated-numerator" className="input" />
                            </label>
                            <label className="field">
                                <span>分母字段</span>
                                <select id="perspective-calculated-denominator" className="input" />
                            </label>
                            <label className="field">
                                <span>展示格式</span>
                                <select id="perspective-calculated-format" className="input">
                                    <option value="unit">元每台</option>
                                    <option value="number">数值</option>
                                    <option value="percent">百分比</option>
                                </select>
                            </label>
                        </div>
                        <div className="calculated-dimension-field">
                            <div className="calculated-dimension-title">分组维度</div>
                            <div id="perspective-calculated-dimensions" className="calculated-dimensions" />
                        </div>
                        <button type="button" className="btn btn-primary calculated-generate-btn" id="perspective-calculated-generate">
                            生成计算指标
                        </button>
                    </div>

                    <div id="perspective-calculated-metric-table" className="calculated-metric-table" />
                </section>

                <section className="workspace-grid featured-grid">
                    <article className="panel perspective-panel">
                        <div className="panel-header">
                            <div>
                                <h2>可操作 BI 工作台</h2>
                                <p>右侧保留 Perspective 原生分析面板，负责分组、拆分、筛选、排序和图表切换。</p>
                            </div>
                            <div className="workbench-controls">
                                <label className="field workbench-preset">
                                    <span>当前视图</span>
                                    <select id="perspective-preset-select" className="input">
                                        <option value="revenue-by-region">收入按区域</option>
                                        <option value="margin-by-region">边际按区域</option>
                                        <option value="monthly-heatmap">月份热力图</option>
                                        <option value="detail-table">明细透视表</option>
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="btn focus-action-btn"
                                    id="perspective-btn-focus-workbench"
                                    aria-pressed="false"
                                >
                                    放大工作台
                                </button>
                            </div>
                        </div>
                        <div className="viewer-frame">
                            {createElement("perspective-viewer", { id: "perspective-viewer" })}
                        </div>
                    </article>
                </section>
            </main>
        </div>
    );
}
