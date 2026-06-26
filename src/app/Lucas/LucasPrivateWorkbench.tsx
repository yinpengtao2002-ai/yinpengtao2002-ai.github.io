"use client";

import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { PRIVATE_TOOL_ACCESS_HEADER } from "@/lib/private-tool-access/constants";
import styles from "./Lucas.module.css";

type LucasPrivateWorkbenchProps = {
  accessToken: string;
};

export default function LucasPrivateWorkbench({ accessToken }: LucasPrivateWorkbenchProps) {
  const [stockDecisionHtml, setStockDecisionHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStockDecisionSystem() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/lucas/stock-decision", {
          method: "GET",
          headers: {
            [PRIVATE_TOOL_ACCESS_HEADER]: accessToken,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(response.status === 401 ? "访问已过期，请刷新后重新输入访问码。" : "股票决策系统加载失败。");
        }

        const html = await response.text();

        if (!cancelled) {
          setStockDecisionHtml(html);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "股票决策系统加载失败。");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadStockDecisionSystem();

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  return (
    <main className={styles.framePage}>
      <header className={styles.frameHeader}>
        <div>
          <p className={styles.eyebrow}>Lucas Lab</p>
          <h1>股票决策系统</h1>
        </div>
        <span className={styles.heroBadge}>
          <ShieldCheck aria-hidden="true" />
          <span>Private Route</span>
        </span>
      </header>

      <section className={styles.frameShell} aria-label="股票决策系统">
        {isLoading ? (
          <div className={styles.frameState} aria-live="polite">
            <Loader2 className={styles.spin} aria-hidden="true" />
            <span>正在加载股票决策系统</span>
          </div>
        ) : null}

        {errorMessage ? (
          <div className={styles.frameError} aria-live="assertive">
            <p>{errorMessage}</p>
            <button type="button" onClick={() => window.location.reload()}>
              <RefreshCw aria-hidden="true" />
              <span>重新进入</span>
            </button>
          </div>
        ) : null}

        {stockDecisionHtml && !errorMessage ? (
          <iframe
            className={styles.stockFrame}
            title="股票决策系统"
            srcDoc={stockDecisionHtml}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : null}
      </section>
    </main>
  );
}
