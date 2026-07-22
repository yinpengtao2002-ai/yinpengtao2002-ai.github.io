"use client";

import { useEffect, useState } from "react";
import { bootFinanceBrowserEngine, type FinanceBrowserEngine } from "@/lib/finance/browser-tool-loader";

export default function BusinessAnalysisTool() {
    const [bootAttempt, setBootAttempt] = useState(0);
    const [bootError, setBootError] = useState("");

    useEffect(() => {
        let cancelled = false;
        let engine: FinanceBrowserEngine | undefined;
        setBootError("");

        void bootFinanceBrowserEngine({
            engineName: "BusinessAnalysisModel",
            importEngine: () => import("./business-analysis-engine.js"),
            scripts: [
                "/vendor/plotly/plotly.min.js",
                "/vendor/xlsx/xlsx.full.min.js",
            ],
            isCancelled: () => cancelled,
            errorMessage: "Failed to start business analysis model",
            onError: () => {
                if (!cancelled) setBootError("分析引擎加载失败，请重试。");
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
        <div id="business-analysis-root" className="business-tool">
            {bootError ? (
                <div className="engine-load-error" role="alert">
                    <span>{bootError}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => setBootAttempt((value) => value + 1)}>重试加载</button>
                </div>
            ) : null}
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

                <section className="sidebar-block sidebar-dimension-order-block">
                    <h2 className="sidebar-title">下钻顺序</h2>
                    <div className="drill-train-head">
                        <span>维度路径</span>
                        <strong id="sidebar-dimension-train-summary" data-dimension-train-summary />
                    </div>
                    <div id="sidebar-dimension-train" className="dimension-train sidebar-dimension-train" data-dimension-train aria-label="左侧维度下钻顺序" />
                    <p className="dimension-train-hint">拖动维度卡片调整顺序，已下钻层级会保留。</p>
                </section>

                <section className="sidebar-block sidebar-dimension-drill-block">
                    <h2 className="sidebar-title">维度钻取</h2>
                    <p id="sidebar-current-layer-summary" className="sidebar-filter-note">当前层：未配置</p>
                    <div className="current-layer-filter sidebar-layer-filter" data-current-layer-filter="sidebar" aria-label="左侧当前层筛选">
                        <span data-current-layer-label>筛选当前层</span>
                        <button type="button" className="current-layer-filter-trigger" data-current-layer-trigger aria-haspopup="menu" aria-expanded="false" />
                        <div className="business-excel-filter-menu" data-current-layer-menu hidden />
                    </div>
                    <div id="dimension-filter-grid" className="form-grid dimension-filter-grid-hidden" aria-hidden="true" />
                </section>

                <section className="sidebar-block sidebar-actions">
                        <button type="button" className="btn btn-primary" id="btn-reset">重置筛选</button>
                    <button type="button" className="btn btn-secondary" id="btn-export">导出摘要</button>
                </section>
            </aside>

            <div id="sidebar-backdrop" className="sidebar-backdrop" aria-hidden="true" />

            <button id="sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} title="展开控制台" aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>预算实际对比模型</h1>
                    </div>
                </header>

                <section className="metrics-grid" id="metrics-grid" />

                <section className="workspace-grid single-grid">
                    <article className="panel table-panel">
                        <div className="panel-header">
                            <div>
                                <h2>维度经营实绩</h2>
                                <p>从预算边际总额出发，按当前维度桥接到实际边际总额，并逐层定位预算缺口来源。</p>
                            </div>
                        </div>
                        <div className="ranking-toolbar" aria-label="维度经营实绩操作台">
                            <div className="drill-path-panel">
                                <div className="toolbar-label-row">
                                    <span>下钻路径</span>
                                    <strong id="dimension-train-summary" data-dimension-train-summary />
                                </div>
                                <div id="ranking-drill-path" className="drill-path-rail" data-ranking-drill-path aria-label="维度下钻路径" />
                            </div>
                            <div className="ranking-toolbar-actions">
                                <div className="current-layer-filter" data-current-layer-filter="main" aria-label="当前层筛选">
                                    <span id="ranking-current-filter-label" data-current-layer-label>筛选当前层</span>
                                    <button type="button" id="ranking-current-filter-trigger" className="current-layer-filter-trigger" data-current-layer-trigger aria-haspopup="menu" aria-expanded="false" />
                                    <div id="ranking-current-filter-menu" className="business-excel-filter-menu" data-current-layer-menu hidden />
                                </div>
                                <div className="waterfall-metric-pill">指标：边际总额</div>
                                <button type="button" className="btn btn-secondary ranking-clear" id="btn-ranking-clear" data-ranking-clear>退一层</button>
                                <button type="button" className="btn btn-secondary ranking-reset" id="btn-ranking-reset-path" data-ranking-reset-path>清空下钻</button>
                            </div>
                        </div>
                        <div id="ranking-filter-status" className="ranking-filter-status" />
                        <div className="waterfall-interaction-note" aria-label="维度瀑布图交互方式">
                            <span><strong>电脑端</strong> 悬停柱子查看实际、预算、差异；点击柱子下钻。</span>
                            <span><strong>手机端</strong> 点击柱子进入明细层，用返回键回到图表。</span>
                        </div>
                        <div id="ranking-visual" className="dimension-waterfall" />
                    </article>
                </section>

                <section className="workspace-grid single-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>单车净收入 × 单车边际</h2>
                                <p>每个维度一个点，横轴单车净收入，纵轴单车边际，气泡代表销量规模。</p>
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
                    <span>销量、净收入总额、单车净收入、边际总额、单车边际、利润总额与维度归因</span>
                </footer>
            </main>
        </div>
    );
}
