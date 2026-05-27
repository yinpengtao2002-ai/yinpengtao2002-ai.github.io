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
                                className="btn btn-secondary compact-btn"
                                id="perspective-field-roles-toggle"
                                aria-expanded="true"
                            >
                                收起字段
                            </button>
                        </div>
                    </div>
                    <div id="perspective-field-roles" className="field-role-list" />
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
                                        <option value="unit-quality">单车质量矩阵</option>
                                        <option value="monthly-heatmap">月份热力图</option>
                                        <option value="detail-table">明细透视表</option>
                                    </select>
                                </label>
                                <button
                                    type="button"
                                    className="btn btn-secondary compact-btn"
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
