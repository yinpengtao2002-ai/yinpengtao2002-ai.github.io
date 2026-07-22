"use client";

import { Suspense, lazy, useState } from "react";
import { KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { PRIVATE_TOOL_ACCESS_ENDPOINT } from "@/lib/private-tool-access/constants";
import styles from "./Lucas.module.css";

const LucasPrivateWorkbench = lazy(() => import("./LucasPrivateWorkbench"));

type AccessResponse = {
  token?: string;
  message?: string;
  errorCode?: string;
};

function getAccessErrorMessage(payload: AccessResponse, fallback: string) {
  if (payload.errorCode === "access_not_configured") {
    return "访问码还没有在部署环境配置。";
  }

  if (payload.errorCode === "access_denied") {
    return "访问码不正确。";
  }

  return payload.message || fallback;
}

export default function LucasAccessGate() {
  const [accessToken, setAccessToken] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessError, setAccessError] = useState("");

  async function handleAccessSubmit() {
    const key = accessKey.trim();

    if (!key) {
      setAccessError("请输入访问码。");
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
      const payload = (await response.json().catch(() => ({}))) as AccessResponse;

      if (!response.ok || !payload.token) {
        throw new Error(getAccessErrorMessage(payload, "访问码校验失败。"));
      }

      setAccessToken(payload.token);
      setAccessKey("");
    } catch (error) {
      setAccessError(error instanceof Error ? error.message : "访问码校验失败。");
    } finally {
      setAccessBusy(false);
    }
  }

  if (accessToken) {
    return (
      <Suspense
        fallback={
          <main className={styles.page}>
            <section className={styles.loadingPanel} aria-live="polite">
              <Loader2 className={styles.spin} aria-hidden="true" />
              <span>正在打开 Lucas 工作台</span>
            </section>
          </main>
        }
      >
        <LucasPrivateWorkbench accessToken={accessToken} />
      </Suspense>
    );
  }

  return (
    <main className={styles.gatePage}>
      <section className={styles.gateCard} aria-label="Lucas private access">
        <span className={styles.gateIcon} aria-hidden="true">
          <KeyRound />
        </span>
        <div className={styles.gateCopy}>
          <p className={styles.eyebrow}>Private</p>
          <h1>Lucas</h1>
        </div>
        <form
          className={styles.gateForm}
          onSubmit={(event) => {
            event.preventDefault();
            void handleAccessSubmit();
          }}
        >
          <label className={styles.gateField}>
            <span>访问码</span>
            <input
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              placeholder="输入访问码"
              type="password"
              autoComplete="off"
              disabled={accessBusy}
            />
          </label>
          <button type="submit" disabled={accessBusy || !accessKey.trim()}>
            {accessBusy ? <Loader2 className={styles.spin} aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            <span>进入</span>
          </button>
        </form>
        {accessError ? <p className={styles.gateError}>{accessError}</p> : null}
      </section>
    </main>
  );
}
