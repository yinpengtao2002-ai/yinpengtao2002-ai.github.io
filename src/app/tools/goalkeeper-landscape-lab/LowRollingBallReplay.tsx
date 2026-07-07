"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Goal, RotateCcw, Shield } from "lucide-react";
import styles from "./GoalkeeperLandscapeLab.module.css";

type Scenario = {
  name: string;
  key: string;
  status: string;
  intent: string;
  position: string;
  velocity: string;
  angularVelocity: string;
  contact: {
    type: string;
    point: string;
    normal: string;
    strength: string;
  };
  markers: string[];
};

type Vector3 = {
  x: number;
  y: number;
  z: number;
};

type ReplaySample = {
  frame: number;
  time: number;
  outcome: string;
  position: Vector3;
  velocity: Vector3;
  angularVelocity: Vector3;
};

type ReplayTelemetry = {
  key: string;
  name: string;
  outcome: string;
  position: Vector3 | null;
  velocity: Vector3 | null;
  angularVelocity: Vector3 | null;
  groundClearance: number | null;
  contact: {
    type: string;
    point: Vector3 | null;
    normal: Vector3 | null;
    strength: number;
  };
  samples: ReplaySample[];
};

type ReplayState =
  | { status: "loading"; telemetry: null; error: null }
  | { status: "ready"; telemetry: ReplayTelemetry; error: null }
  | { status: "error"; telemetry: null; error: string };

const REPLAY_API_PATH = "/api/tools/goalkeeper-landscape-lab/low-rolling-ball";

function formatNumber(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(2);
}

function formatVector(vector: Vector3 | null | undefined) {
  if (!vector) return "-";
  return `x ${formatNumber(vector.x)} / y ${formatNumber(vector.y)} / z ${formatNumber(vector.z)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function sampleStyle(sample: ReplaySample) {
  return {
    left: `${clamp(50 + sample.position.x * 10, 8, 92)}%`,
    bottom: `${clamp(8 + sample.position.y * 26, 10, 78)}%`,
  };
}

export default function LowRollingBallReplay({
  scenario,
  scenarios,
}: {
  scenario: Scenario;
  scenarios: Scenario[];
}) {
  const [replayState, setReplayState] = useState<ReplayState>({
    status: "loading",
    telemetry: null,
    error: null,
  });

  const loadReplay = useCallback(async (signal?: AbortSignal) => {
    setReplayState({ status: "loading", telemetry: null, error: null });

    try {
      const response = await fetch(REPLAY_API_PATH, { cache: "no-store", signal });
      if (!response.ok) {
        throw new Error(`Replay API returned ${response.status}`);
      }
      const telemetry = (await response.json()) as ReplayTelemetry;
      setReplayState({ status: "ready", telemetry, error: null });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setReplayState({
        status: "error",
        telemetry: null,
        error: error instanceof Error ? error.message : "Replay failed",
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadReplay(controller.signal);
    return () => controller.abort();
  }, [loadReplay]);

  const telemetry = replayState.telemetry;
  const traceSamples = useMemo(() => {
    if (!telemetry?.samples.length) return [];
    return telemetry.samples.filter((_, index) => index % 9 === 0).slice(0, 10);
  }, [telemetry]);
  const statusLabel =
    replayState.status === "loading"
      ? "running Rapier"
      : replayState.status === "error"
        ? "api-error"
        : (telemetry?.outcome ?? scenario.status);

  return (
    <>
      <section
        id="physics-lab"
        className={styles.previewPanel}
        aria-label="Physics Lab"
        data-live-telemetry={replayState.status}
      >
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.kicker}>Physics Lab</span>
            <h2>确定性球路与碰撞样例</h2>
          </div>
          <button
            className={styles.iconButton}
            type="button"
            aria-label="Replay selected scenario"
            disabled={replayState.status === "loading"}
            onClick={() => loadReplay()}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        </div>

        <div className={styles.pitchPreview} aria-label={`${scenario.name} preview`}>
          <div className={styles.goalFrame} aria-hidden="true">
            <div className={styles.netLine} />
            <Shield className={styles.gloveGhost} aria-hidden="true" />
            <div className={styles.ballTrace} />
            {traceSamples.map((sample) => (
              <span className={styles.traceDot} style={sampleStyle(sample)} key={sample.frame} />
            ))}
            <div className={styles.contactMarker} />
            <div className={styles.ball} />
          </div>
          <div className={styles.previewReadout}>
            <span>{scenario.name}</span>
            <strong>{statusLabel}</strong>
          </div>
        </div>

        <div className={styles.scenarioGrid}>
          {scenarios.map((item, index) => (
            <article className={styles.scenarioCard} key={item.key} aria-current={index === 0 ? "true" : undefined}>
              <div className={styles.cardTopline}>
                <span>{item.name}</span>
                <strong>{index === 0 ? statusLabel : item.status}</strong>
              </div>
              <p>{item.intent}</p>
              <dl className={styles.telemetryList}>
                <div>
                  <dt>position</dt>
                  <dd>{index === 0 && telemetry ? formatVector(telemetry.position) : item.position}</dd>
                </div>
                <div>
                  <dt>velocity</dt>
                  <dd>{index === 0 && telemetry ? formatVector(telemetry.velocity) : item.velocity}</dd>
                </div>
                <div>
                  <dt>angular velocity</dt>
                  <dd>{index === 0 && telemetry ? formatVector(telemetry.angularVelocity) : item.angularVelocity}</dd>
                </div>
                <div>
                  <dt>last contact</dt>
                  <dd>{index === 0 && telemetry ? telemetry.contact.type : item.contact.type}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <aside className={styles.telemetryPanel} aria-label="Selected scenario telemetry">
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.kicker}>Contact Telemetry</span>
            <h2>{scenario.name}</h2>
          </div>
          <Goal aria-hidden="true" />
        </div>

        {replayState.status === "error" ? (
          <p className={styles.statusText}>{replayState.error}</p>
        ) : (
          <dl className={styles.detailGrid}>
            <div>
              <dt>contact point</dt>
              <dd>{telemetry ? formatVector(telemetry.contact.point) : scenario.contact.point}</dd>
            </div>
            <div>
              <dt>contact normal</dt>
              <dd>{telemetry ? formatVector(telemetry.contact.normal) : scenario.contact.normal}</dd>
            </div>
            <div>
              <dt>contact strength</dt>
              <dd>{telemetry ? formatNumber(telemetry.contact.strength) : scenario.contact.strength}</dd>
            </div>
            <div>
              <dt>ground clearance</dt>
              <dd>{telemetry ? formatNumber(telemetry.groundClearance) : "-"}</dd>
            </div>
            <div>
              <dt>outcome state</dt>
              <dd>{statusLabel}</dd>
            </div>
          </dl>
        )}

        <div className={styles.markerStack} aria-label="Debug markers">
          {scenario.markers.map((marker) => (
            <span key={marker}>{marker}</span>
          ))}
        </div>
      </aside>
    </>
  );
}
