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
            <aside id="perspective-sidebar" className="sidebar">
                <button id="perspective-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Perspective BI</div>
                    <h1 className="sidebar-heading">Perspective BI 分析台</h1>
                    <p className="sidebar-copy">上传明细数据，直接拖动字段、切换图表、分组筛选，先把数据看懂再进入专项模型。</p>
                    <div id="perspective-message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">数据与模板</h2>
                    <div className="upload-zone" id="perspective-upload-zone">
                        <input id="perspective-file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                        <label htmlFor="perspective-file-input" className="upload-label">
                            <span className="upload-title">上传 BI 数据</span>
                            <span className="upload-hint">支持 CSV、XLSX、XLS；第一张表会进入透视工作台</span>
                        </label>
                    </div>
                    <div className="button-grid">
                        <button type="button" className="btn btn-secondary" id="perspective-btn-demo">示例数据</button>
                        <button type="button" className="btn btn-secondary" id="perspective-btn-csv-template">CSV 模板</button>
                        <button type="button" className="btn btn-secondary" id="perspective-btn-xlsx-template">Excel 模板</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">看板预设</h2>
                    <label className="field">
                        <span>当前视图</span>
                        <select id="perspective-preset-select" className="input">
                            <option value="revenue-by-region">收入按区域</option>
                            <option value="unit-quality">单车质量矩阵</option>
                            <option value="monthly-heatmap">月份热力图</option>
                            <option value="detail-table">明细透视表</option>
                        </select>
                    </label>
                    <p className="sidebar-note">预设只是起点，右侧仍可拖字段、改图表、加筛选。</p>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">数据概览</h2>
                    <div id="perspective-data-summary" className="summary-grid" />
                    <div id="perspective-field-list" className="field-list" />
                </section>

                <section className="sidebar-block sidebar-actions">
                    <button type="button" className="btn btn-primary" id="perspective-btn-reset-view">重置视图</button>
                    <button type="button" className="btn btn-secondary" id="perspective-btn-export-csv">导出当前 CSV</button>
                </section>
            </aside>

            <div id="perspective-sidebar-backdrop" className="sidebar-backdrop" aria-hidden="true" />

            <button id="perspective-sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} title="展开控制台" aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>Perspective BI 分析台</h1>
                        <p className="model-subtitle">把上传明细变成一个可拖拽、可筛选、可切换图表的网页 BI 工作台，适合先探索数据结构，再进入预算、趋势和归因模型。</p>
                    </div>
                    <div className="header-actions">
                        <div className="data-status" id="perspective-data-status">示例数据</div>
                    </div>
                </header>

                <section className="workspace-grid featured-grid">
                    <article className="panel perspective-panel">
                        <div className="panel-header">
                            <div>
                                <h2>可操作 BI 工作台</h2>
                                <p>拖动字段完成分组、拆分、筛选、排序和图表切换；上传后自动使用你的数据刷新。</p>
                            </div>
                            <span className="panel-pill">Perspective</span>
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
