"use client";

import { createElement, useEffect, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { bootFinanceBrowserEngine, type FinanceBrowserEngine } from "@/lib/finance/browser-tool-loader";
import { PRIVATE_TOOL_ACCESS_ENDPOINT } from "@/lib/private-tool-access/constants";

type AccessResponse = {
    token?: string;
    message?: string;
    errorCode?: string;
};

function getAccessErrorMessage(payload: AccessResponse, fallback: string) {
    if (payload.errorCode === "access_not_configured") {
        return "内测密钥还没有在部署环境配置。";
    }

    if (payload.errorCode === "access_denied") {
        return "内测密钥不正确。";
    }

    return payload.message || fallback;
}

export default function PerspectiveBITool() {
    const [accessToken, setAccessToken] = useState("");
    const [accessKey, setAccessKey] = useState("");
    const [accessBusy, setAccessBusy] = useState(false);
    const [accessError, setAccessError] = useState("");
    const [bootAttempt, setBootAttempt] = useState(0);
    const [bootError, setBootError] = useState("");

    useEffect(() => {
        if (!accessToken) {
            return;
        }

        let cancelled = false;
        let engine: FinanceBrowserEngine | undefined;
        setBootError("");

        void bootFinanceBrowserEngine({
            engineName: "PerspectiveBIModel",
            importEngine: () => import("./perspective-bi-engine.js"),
            isCancelled: () => cancelled,
            errorMessage: "Failed to start Perspective BI model",
            onError: () => {
                if (!cancelled) setBootError("BI 引擎加载失败，请重试。");
            },
        }).then((loaded) => {
            engine = loaded;
            if (cancelled) loaded?.dispose();
        });

        return () => {
            cancelled = true;
            engine?.dispose();
        };
    }, [accessToken, bootAttempt]);

    async function handleAccessSubmit() {
        const key = accessKey.trim();

        if (!key) {
            setAccessError("请输入内测密钥。");
            return;
        }

        setAccessBusy(true);
        setAccessError("");

        try {
            const response = await fetch(PRIVATE_TOOL_ACCESS_ENDPOINT, {
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
            <div id="perspective-bi-root" className="perspective-bi-tool">
                <section className="perspective-access-gate" aria-label="Perspective BI 分析台内测访问">
                    <div className="perspective-access-card">
                        <span className="perspective-access-icon" aria-hidden="true">
                            <KeyRound />
                        </span>
                        <div>
                            <p className="eyebrow">Private Beta</p>
                            <h1>输入内测密钥</h1>
                            <p>这个分析台还在内测中。通过后再上传或探索明细，数据仍只保留在当前页面会话里。</p>
                        </div>
                        <form
                            className="perspective-access-form"
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
                                {accessBusy ? <Loader2 className="perspective-spin" aria-hidden="true" /> : "进入"}
                            </button>
                        </form>
                        {accessError ? <p className="perspective-access-error">{accessError}</p> : null}
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div id="perspective-bi-root" className="perspective-bi-tool">
            {bootError ? (
                <div className="engine-load-error" role="alert">
                    <span>{bootError}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => setBootAttempt((value) => value + 1)}>重试加载</button>
                </div>
            ) : null}
            <div className="main-content">
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
                            <h2>字段治理</h2>
                            <p className="field-role-help">系统会先按时间维度、业务维度、金额指标三类整理字段，用户可以一键采用建议，也可以逐项修正。</p>
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
                    <div className="field-governance-toolbar" id="perspective-field-governance-toolbar" aria-label="字段治理批量动作">
                        <button type="button" className="btn btn-secondary compact-btn governance-action-btn" data-field-governance-action="use-suggestion">
                            采用系统建议
                        </button>
                        <button type="button" className="btn btn-secondary compact-btn governance-action-btn" data-field-governance-action="unit-average">
                            单位/比率用平均
                        </button>
                        <button type="button" className="btn btn-secondary compact-btn governance-action-btn" data-field-governance-action="amount-sum">
                            金额/规模用求和
                        </button>
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
                        <div id="perspective-workbench-guide" className="workbench-guide" aria-live="polite" />
                        <div className="viewer-frame">
                            {createElement("perspective-viewer", { id: "perspective-viewer" })}
                        </div>
                    </article>
                </section>
            </div>
        </div>
    );
}
