"use client";

import { useEffect } from "react";

declare global {
    interface Window {
        ProfitBridgeSensitivity?: {
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

export default function SensitivityTool() {
    useEffect(() => {
        let cancelled = false;

        async function bootTool() {
            try {
                await Promise.all([
                    loadBrowserScript("/vendor/plotly/plotly.min.js"),
                    loadBrowserScript("/vendor/xlsx/xlsx.full.min.js"),
                ]);
                await import("./sensitivity-engine.js");

                if (!cancelled) {
                    window.ProfitBridgeSensitivity?.initApp();
                }
            } catch (error) {
                console.error("Failed to start sensitivity analysis tool", error);
            }
        }

        void bootTool();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div id="sensitivity-tool-root" className="sensitivity-tool">
            <aside id="sidebar" className="sidebar">
                <button id="sidebar-toggle" className="sidebar-toggle" type="button" title="收起控制台" aria-label="收起控制台">
                    ‹
                </button>

                <section className="sidebar-block">
                    <div className="sidebar-kicker">Sensitivity Lab</div>
                    <h1 className="sidebar-heading">利润敏感性分析</h1>
                    <p className="sidebar-copy">上传现状底表后，用百分比滑杆调整关键科目，观察边际与利润总额变化。</p>
                    <div id="message-area" className="message-area" aria-live="polite" />
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">数据与模板</h2>
                    <div className="upload-zone" id="upload-zone">
                        <input id="file-input" type="file" accept=".csv,.xlsx,.xls" hidden />
                        <label htmlFor="file-input" className="upload-label">
                            <span className="upload-title">上传假设表</span>
                            <span className="upload-hint">支持 CSV、XLSX、XLS</span>
                        </label>
                    </div>
                    <div className="button-grid">
                        <button type="button" className="btn btn-secondary" id="btn-demo">示例数据</button>
                        <button type="button" className="btn btn-secondary" id="btn-csv-template">CSV 模板</button>
                        <button type="button" className="btn btn-secondary" id="btn-xlsx-template">Excel 模板</button>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">分析口径</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>关注指标</span>
                            <select id="metric-select" className="input" defaultValue="profit">
                                <option value="profit">利润总额</option>
                                <option value="contributionMargin">边际</option>
                                <option value="netRevenue">净收入</option>
                                <option value="salesVolume">销量</option>
                                <option value="unitContributionMargin">单车边际</option>
                                <option value="contributionMarginRate">边际率</option>
                                <option value="profitRate">利润总额率</option>
                            </select>
                        </label>
                        <label className="field">
                            <span>显示单位</span>
                            <select id="unit-select" className="input" defaultValue="亿">
                                <option value="亿">亿元</option>
                                <option value="百万">百万元</option>
                            </select>
                        </label>
                        <label className="field">
                            <span>目标利润（亿元）</span>
                            <input id="target-profit-input" className="input" type="number" step="1" defaultValue="300" />
                            <span className="field-note">用于测算当前口径下达到目标利润所需销量。</span>
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">联动分析</h2>
                    <div className="form-grid">
                        <label className="field">
                            <span>横轴变量</span>
                            <select id="x-driver-select" className="input" />
                        </label>
                        <label className="field">
                            <span>纵轴变量</span>
                            <select id="y-driver-select" className="input" />
                        </label>
                        <label className="field">
                            <span>矩阵步数</span>
                            <select id="matrix-steps" className="input" defaultValue="7">
                                <option value="5">5 × 5</option>
                                <option value="7">7 × 7</option>
                                <option value="9">9 × 9</option>
                            </select>
                        </label>
                    </div>
                </section>

                <section className="sidebar-block">
                    <h2 className="sidebar-title">百分比调整</h2>
                    <div id="adjustment-inputs" className="form-grid" />
                </section>
            </aside>

            <button id="sidebar-expand" className="sidebar-expand" type="button" style={{ display: "none" }} aria-label="展开控制台">
                控制台
            </button>

            <main className="main-content">
                <header className="model-header">
                    <div>
                        <p className="eyebrow">Financial Modeling</p>
                        <h1>利润敏感性分析</h1>
                        <p className="model-subtitle">销量与收入、材料成本、变动费用共同决定边际；边际以下再考虑固定扣减项、税费和利润贡献项得到利润总额。</p>
                    </div>
                    <div className="header-actions">
                        <button type="button" className="btn btn-secondary" id="btn-reset">重置</button>
                    </div>
                </header>

                <section className="metrics-grid" id="metrics-grid" />

                <section className="workspace-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>波动 10% 对利润的影响</h2>
                                <p>所有科目统一按上下波动 10%，比较对利润总额的影响。</p>
                            </div>
                        </div>
                        <div id="tornado-chart" className="chart" />
                    </article>

                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>目标利润分析</h2>
                                <p>输入目标利润，查看当前单车边际和固定部分下需要达到的销量。</p>
                            </div>
                        </div>
                        <div id="target-profit-chart" className="chart chart-target-profit" />
                    </article>
                </section>

                <section className="workspace-grid bottom-grid">
                    <article className="panel panel-large">
                        <div className="panel-header">
                            <div>
                                <h2>双变量影响矩阵</h2>
                                <p>同时调整两个科目，查看利润总额可能落在哪个区间。</p>
                            </div>
                        </div>
                        <div id="matrix-chart" className="chart" />
                    </article>

                    <article className="panel waterfall-panel">
                        <div className="panel-header">
                            <div>
                                <h2>边际瀑布图</h2>
                                <p>净收入扣减材料成本、变动制造费用和变动销售费用后得到边际。</p>
                            </div>
                        </div>
                        <div id="margin-bridge-chart" className="chart chart-compact" />
                    </article>
                </section>

                <section className="panel waterfall-panel profit-waterfall-panel">
                    <div className="panel-header">
                        <div>
                            <h2>利润瀑布图</h2>
                            <p>从边际出发，扣减固定费用和税费，并加上利润贡献项后得到利润总额。</p>
                        </div>
                    </div>
                    <div id="profit-bridge-chart" className="chart chart-profit-waterfall" />
                </section>

                <footer className="footer">
                    <span>利润敏感性分析</span>
                    <span>销量、单车边际、固定扣减项与利润总额</span>
                </footer>
            </main>
        </div>
    );
}
