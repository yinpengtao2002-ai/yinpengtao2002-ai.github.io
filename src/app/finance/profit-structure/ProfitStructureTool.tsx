"use client";

import { useEffect, useState } from "react";
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

export default function ProfitStructureTool() {
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
            engineName: "ProfitStructureModel",
            importEngine: () => import("./profit-structure-engine.js"),
            scripts: [
                "/vendor/plotly/plotly.min.js",
                "/vendor/xlsx/xlsx.full.min.js",
            ],
            isCancelled: () => cancelled,
            errorMessage: "Failed to start profit structure model",
            onError: () => {
                if (!cancelled) setBootError("利润结构引擎加载失败，请重试。");
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
            {bootError ? (
                <div className="engine-load-error" role="alert">
                    <span>{bootError}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => setBootAttempt((value) => value + 1)}>重试加载</button>
                </div>
            ) : null}
            <aside id="profit-structure-sidebar" className="sidebar">
                <button id="profit-structure-sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Quality Lab</div>
                    <h1 className="sidebar-heading">多维利润质量诊断模型</h1>
                    <p className="sidebar-copy">上传经营明细，选择质量指标和诊断粒度，判断先看哪个维度、哪些组合正在拖累整体质量。</p>
                    <div id="profit-structure-message-area" className="message-area" aria-live="polite" />
                    <section id="profit-structure-field-governance" className="finance-field-governance" data-finance-field-governance hidden />
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

            <div className="main-content">
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
            </div>
        </div>
    );
}
