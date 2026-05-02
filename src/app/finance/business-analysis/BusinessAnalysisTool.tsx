"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        BusinessAnalysisModel?: {
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

export default function BusinessAnalysisTool() {
    useEffect(() => {
        let cancelled = false;

        async function bootTool() {
            try {
                await Promise.all([
                    loadBrowserScript("/vendor/plotly/plotly.min.js"),
                    loadBrowserScript("/vendor/xlsx/xlsx.full.min.js"),
                ]);
                await import("./business-analysis-engine.js");

                if (!cancelled) {
                    window.BusinessAnalysisModel?.initApp();
                }
            } catch (error) {
                console.error("Failed to start business analysis model", error);
            }
        }

        void bootTool();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div id="business-analysis-root" className="business-tool">
            <aside id="business-sidebar" className="sidebar">
                <button id="sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Budget Variance Lab</div>
                    <h1 className="sidebar-heading">预算实际对比模型</h1>
                    <p className="sidebar-copy">上传实际与预算两张子表，经营明细负责维度下钻，固定科目可在下方直接维护。</p>
                    <div id="message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">上传与填报</h2>
                    <div className="upload-stack">
                        <div className="upload-block">
                            <div className="upload-block-title">
                                <span>1</span>
                                <strong>经营明细（边际以上）</strong>
                            </div>
                            <div className="upload-zone" id="operation-upload-zone">
                                <input id="operation-file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                                <label htmlFor="operation-file-input" className="upload-label">
                                    <span className="upload-title">上传经营明细</span>
                                    <span className="upload-hint">发车量、净收入、变动成本；国家和品牌市场分列</span>
                                </label>
                            </div>
                            <div className="button-grid template-button-grid">
                                <button type="button" className="btn btn-secondary" id="btn-csv-template">CSV 模板</button>
                                <button type="button" className="btn btn-secondary" id="btn-xlsx-template">Excel 模板</button>
                            </div>
                        </div>

                        <div className="upload-block subject-upload-block">
                            <div className="upload-block-title">
                                <span>2</span>
                                <strong>固定科目（边际以下）</strong>
                            </div>
                            <div className="manual-subject-panel" aria-label="手工固定科目">
                                <div className="manual-subject-head">
                                    <span>边际以下固定科目</span>
                                    <div className="manual-subject-meta">
                                        <b>亿元</b>
                                    </div>
                                </div>
                                <textarea
                                    id="manual-subject-paste"
                                    className="manual-paste-box"
                                    rows={3}
                                    placeholder={"请将内容粘贴到此处\n粘贴后覆盖下方内容"}
                                    aria-label="粘贴固定科目表格"
                                />
                                <div className="manual-table-wrap">
                                    <table className="manual-subject-table">
                                        <thead>
                                            <tr>
                                                <th>科目</th>
                                                <th>实际</th>
                                                <th>预算</th>
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody id="manual-subject-body" />
                                    </table>
                                </div>
                                <div className="manual-subject-actions">
                                    <button type="button" className="btn btn-secondary" id="btn-add-subject-row">新增科目</button>
                                    <button type="button" className="btn btn-primary" id="btn-apply-subjects">应用科目</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="button-grid">
                        <button type="button" className="btn btn-secondary" id="btn-demo">示例数据</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">维度筛选</h2>
                    <div className="dimension-display-panel">
                        <div className="dimension-display-title">
                            <span>展示维度</span>
                            <strong id="dimension-display-summary" />
                        </div>
                        <div id="dimension-display-grid" className="dimension-display-grid" />
                    </div>
                    <div id="dimension-filter-grid" className="form-grid" />
                    <div id="drill-path" className="drill-path" />
                </section>

                <section className="sidebar-block sidebar-actions">
                        <button type="button" className="btn btn-primary" id="btn-reset">重置筛选</button>
                    <button type="button" className="btn btn-secondary" id="btn-export">导出摘要</button>
                </section>
            </aside>

            <button id="sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>预算实际对比模型</h1>
                        <p className="model-subtitle">以总部经营明细为主表，核心看单车净收入、单车边际、净收入总额、边际总额、边际率和利润总额；预算口径用于判断偏离，并通过维度归因回答差在哪个国家、业务单元或车型。</p>
                    </div>
                </header>

                <section className="metrics-grid" id="metrics-grid" />

                <section className="workspace-grid single-grid">
                    <article className="panel table-panel">
                        <div className="panel-header">
                            <div>
                                <h2>维度经营实绩</h2>
                                <p>按当前维度查看实际规模、实际边际和选定指标的预算偏离。</p>
                            </div>
                        </div>
                        <div className="ranking-toolbar" aria-label="维度经营实绩筛选">
                            <label className="toolbar-field">
                                <span>排名维度</span>
                                <select id="ranking-dimension-select" className="input compact-input" />
                            </label>
                            <label className="toolbar-field">
                                <span>对照指标</span>
                                <select id="ranking-metric-select" className="input compact-input" defaultValue="contributionMargin">
                                    <option value="contributionMargin">边际总额</option>
                                    <option value="netRevenue">净收入总额</option>
                                    <option value="unitNetRevenue">单车净收入</option>
                                    <option value="unitContributionMargin">单车边际</option>
                                </select>
                            </label>
                            <button type="button" className="btn btn-secondary ranking-clear" id="btn-ranking-clear">清空下钻</button>
                        </div>
                        <div id="ranking-filter-status" className="ranking-filter-status" />
                        <div className="table-wrap">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th id="ranking-dimension-head">维度</th>
                                        <th>实际发车</th>
                                        <th>实际净收入</th>
                                        <th>实际边际</th>
                                        <th id="ranking-focus-head">预算差异</th>
                                        <th>实际利润率</th>
                                    </tr>
                                </thead>
                                <tbody id="ranking-table-body" />
                            </table>
                        </div>
                    </article>
                </section>

                <section className="workspace-grid bottom-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>边际预算缺口归因</h2>
                                <p>当前筛选后，按下一层维度拆解边际总额相对预算的缺口。</p>
                            </div>
                        </div>
                        <div id="dimension-chart" className="chart" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>单车净收入 × 单车边际</h2>
                                <p>每个维度一个点，横轴单车净收入，纵轴单车边际，气泡代表净收入规模。</p>
                            </div>
                        </div>
                        <div id="unit-margin-chart" className="chart" />
                    </article>
                </section>

                <section className="workspace-grid bottom-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2 id="variance-bridge-title">利润变动桥</h2>
                                <p id="variance-bridge-subtitle">从预算利润出发，按收入、变动成本和固定科目差异桥接到实际利润。</p>
                            </div>
                        </div>
                        <div id="variance-chart" className="chart" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2 id="profit-bridge-title">利润桥</h2>
                                <p id="profit-bridge-subtitle">从实际净收入扣减变动成本和固定科目得到实际利润。</p>
                            </div>
                        </div>
                        <div id="profit-bridge-chart" className="chart" />
                    </article>
                </section>

                <footer className="footer">
                    <span>预算实际对比模型</span>
                    <span>单车净收入、单车边际、净收入总额、边际总额、边际率、利润总额与维度归因</span>
                </footer>
            </main>
        </div>
    );
}
