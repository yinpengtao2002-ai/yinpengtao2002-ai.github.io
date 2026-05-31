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
                            <button type="button" className="btn btn-secondary" id="perspective-btn-csv-template">CSV 模板</button>
                            <button type="button" className="btn btn-secondary" id="perspective-btn-xlsx-template">Excel 模板</button>
                        </div>
                    </div>

                    <div id="perspective-data-summary" className="summary-grid" />

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
                            <div className="calculated-title-line">
                                <h2>计算字段管理</h2>
                                <span className="calculated-field-count" id="perspective-calculated-field-count">0 个计算字段</span>
                            </div>
                            <p>系统自动补充单车指标；你也可以用 Excel 式公式继续新建字段，生成后会作为字段加入下方 Perspective 工作台。</p>
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
                        <div className="calculated-field-manager">
                            <div className="calculated-field-manager-head">
                                <span>字段管理</span>
                                <small>自动字段和手动字段都可以单独删除</small>
                            </div>
                            <div id="perspective-calculated-field-list" className="calculated-field-list" />
                        </div>

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
                                <span>指标分类</span>
                                <select id="perspective-calculated-metric-type" className="input">
                                    <option value="unit">单位/比率指标</option>
                                    <option value="additive">累计指标</option>
                                </select>
                            </label>
                            <label className="field">
                                <span>展示格式</span>
                                <select id="perspective-calculated-format" className="input">
                                    <option value="unit">元每台</option>
                                    <option value="number">数值</option>
                                    <option value="percent">百分比</option>
                                </select>
                            </label>
                            <label className="field calculated-formula-field">
                                <span>公式</span>
                                <input
                                    id="perspective-calculated-formula"
                                    className="input"
                                    type="text"
                                    placeholder="例如：[净收入] / [销量]"
                                />
                            </label>
                        </div>
                        <div className="calculated-formula-help">
                            公式写法：用 [字段名] 引用指标，支持 + - * / 和括号；单位/比率指标会优先按除法分母做加权汇总。
                        </div>
                        <div className="calculated-dimension-field">
                            <div className="calculated-dimension-title">可用指标</div>
                            <div id="perspective-calculated-formula-fields" className="calculated-formula-fields" />
                        </div>
                        <div className="calculated-actions">
                            <button type="button" className="btn btn-primary calculated-generate-btn" id="perspective-calculated-generate">
                                添加到字段池
                            </button>
                        </div>
                        <div id="perspective-calculated-metric-status" className="calculated-metric-status" aria-live="polite" />
                    </div>
                </section>

                <section className="workspace-grid featured-grid">
                    <article className="panel perspective-panel">
                        <div className="panel-header">
                            <div>
                                <h2>可操作 BI 工作台</h2>
                                <p>右侧保留 Perspective 原生分析面板，负责分组、拆分、筛选、排序和图表切换。</p>
                            </div>
                            <div className="workbench-controls">
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
