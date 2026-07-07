import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Box, Gauge, Goal, RotateCcw, Shield, Sparkles } from "lucide-react";
import styles from "./GoalkeeperLandscapeLab.module.css";

type PhysicsScenario = {
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

type AssetCandidate = {
  name: string;
  category: string;
  source: string;
  license: string;
  status: string;
  intendedUse: string;
  performance: string;
};

const physicsScenarios: PhysicsScenario[] = [
  {
    name: "低平滚动球",
    key: "ground-roll",
    status: "ground-roll",
    intent: "验证草地接触、滚动摩擦、反弹衰减和旋转消散。",
    position: "x -1.8 / y 0.34 / z -7.2",
    velocity: "vx 4.8 / vy -0.2 / vz 10.6",
    angularVelocity: "wx 0.4 / wy 7.8 / wz -1.2",
    contact: {
      type: "ground",
      point: "x -1.2 / y 0.12 / z -5.9",
      normal: "0.00 / 1.00 / 0.00",
      strength: "0.42",
    },
    markers: ["ground contact", "roll trace", "spin decay"],
  },
  {
    name: "中路抱球",
    key: "pocket-catch",
    status: "pocket-catch",
    intent: "验证手套正面包裹、减速曲线和停球口袋感。",
    position: "x 0.0 / y 1.18 / z -5.4",
    velocity: "vx 0.3 / vy 1.1 / vz 12.4",
    angularVelocity: "wx -1.4 / wy 2.2 / wz 0.8",
    contact: {
      type: "glove-pocket",
      point: "x 0.04 / y 1.24 / z -3.2",
      normal: "-0.02 / 0.18 / -0.98",
      strength: "0.88",
    },
    markers: ["catch pocket", "normal", "stop zone"],
  },
  {
    name: "侧身拨挡",
    key: "side-parry",
    status: "side-parry",
    intent: "验证手套横扫传递、侧向折线和出球速度。",
    position: "x 1.35 / y 1.06 / z -5.0",
    velocity: "vx 5.9 / vy 0.6 / vz 11.2",
    angularVelocity: "wx 0.9 / wy -4.7 / wz 2.6",
    contact: {
      type: "glove-swipe",
      point: "x 1.56 / y 1.12 / z -3.1",
      normal: "-0.72 / 0.08 / -0.69",
      strength: "0.73",
    },
    markers: ["parry vector", "lateral impulse", "exit speed"],
  },
  {
    name: "上升掌托",
    key: "rising-palm",
    status: "rising-palm",
    intent: "验证手套上托动作、向上抬升和横梁附近的合理反弹。",
    position: "x -0.6 / y 1.62 / z -4.7",
    velocity: "vx -1.6 / vy 4.2 / vz 10.8",
    angularVelocity: "wx 2.1 / wy 1.4 / wz -3.8",
    contact: {
      type: "glove-lift",
      point: "x -0.44 / y 1.74 / z -3.0",
      normal: "0.12 / 0.66 / -0.74",
      strength: "0.81",
    },
    markers: ["lift vector", "crossbar zone", "apex"],
  },
  {
    name: "擦碰漏防",
    key: "poor-contact",
    status: "poor-contact",
    intent: "验证非正面接触、擦边减速和继续进门的边界。",
    position: "x 1.72 / y 0.92 / z -3.8",
    velocity: "vx 2.4 / vy 0.2 / vz 9.1",
    angularVelocity: "wx -0.7 / wy 5.1 / wz 1.9",
    contact: {
      type: "brush",
      point: "x 1.88 / y 0.98 / z -2.7",
      normal: "-0.36 / 0.04 / -0.93",
      strength: "0.24",
    },
    markers: ["partial deflect", "goal continuation", "miss cone"],
  },
];

const assetCandidates: AssetCandidate[] = [
  {
    name: "Khronos glTF Sample Assets",
    category: "loader",
    source: "https://github.com/KhronosGroup/glTF-Sample-Assets",
    license: "Mixed sample licenses, needs per-asset review",
    status: "needs review",
    intendedUse: "Validate GLB/GLTF loading, PBR material response, and browser fallback behavior.",
    performance: "Use only tiny validation scenes in Phase 1; keep under 1 MB for mobile smoke.",
  },
  {
    name: "Kenney official assets",
    category: "field / stadium",
    source: "https://kenney.nl/assets",
    license: "CC0 on official Kenney releases",
    status: "candidate",
    intendedUse: "Prototype low-poly pitch, stands, cones, and environmental props from official sources.",
    performance: "Good mobile candidate if meshes are batched and texture count stays low.",
  },
  {
    name: "Procedural goal and field",
    category: "goal / field",
    source: "route-local procedural primitives",
    license: "Lucas-owned generated geometry",
    status: "approved for prototype",
    intendedUse: "Replace flat demo goal lines with stable proportions while physics tests mature.",
    performance: "Near-zero asset load; useful baseline for canvas and WebGL budget comparisons.",
  },
  {
    name: "Procedural glove placeholder",
    category: "glove",
    source: "route-local primitive rig",
    license: "Lucas-owned generated geometry",
    status: "approved for prototype",
    intendedUse: "Create a clearer contact surface before importing a final glove model.",
    performance: "Keep collision proxy simple; visual mesh can be decoupled from Rapier collider.",
  },
  {
    name: "Custom material pass",
    category: "material / lighting",
    source: "local shader and texture notes",
    license: "Lucas-owned material recipe",
    status: "candidate",
    intendedUse: "Test grass roughness, net translucency, glove sheen, and ball readability.",
    performance: "Prefer baked or simple PBR maps; avoid expensive full-screen post-processing.",
  },
];

export const metadata: Metadata = {
  title: "Goalkeeper Landscape Lab｜Lucas Yin",
  description: "Hidden goalkeeper game workbench for physics scenarios and asset review.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function GoalkeeperLandscapeLabPage() {
  const activeScenario = physicsScenarios[0];

  return (
    <main className={styles.page} aria-label="Goalkeeper Landscape Lab">
      <aside className={styles.rail} aria-label="Goalkeeper Landscape Lab controls">
        <div className={styles.brandBlock}>
          <span className={styles.kicker}>Hidden Workbench</span>
          <h1>Goalkeeper Landscape Lab</h1>
          <p>物理碰撞与场景资产的内部实验台。</p>
        </div>

        <nav className={styles.modeSwitch} aria-label="Lab modes">
          <a href="#physics-lab" className={styles.modeButton}>
            <Gauge aria-hidden="true" />
            <span>Physics Lab</span>
          </a>
          <a href="#asset-lab" className={styles.modeButton}>
            <Box aria-hidden="true" />
            <span>Asset Lab</span>
          </a>
        </nav>

        <div className={styles.routeCard}>
          <span>Stable Route</span>
          <Link href="/tools/goalkeeper-landscape">/tools/goalkeeper-landscape</Link>
        </div>
      </aside>

      <section className={styles.workbench} aria-label="Goalkeeper experiment workbench">
        <section id="physics-lab" className={styles.previewPanel} aria-label="Physics Lab">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>Physics Lab</span>
              <h2>确定性球路与碰撞样例</h2>
            </div>
            <button className={styles.iconButton} type="button" aria-label="Replay selected scenario">
              <RotateCcw aria-hidden="true" />
            </button>
          </div>

          <div className={styles.pitchPreview} aria-label={`${activeScenario.name} preview`}>
            <div className={styles.goalFrame} aria-hidden="true">
              <div className={styles.netLine} />
              <Shield className={styles.gloveGhost} aria-hidden="true" />
              <div className={styles.ballTrace} />
              <div className={styles.contactMarker} />
              <div className={styles.ball} />
            </div>
            <div className={styles.previewReadout}>
              <span>{activeScenario.name}</span>
              <strong>{activeScenario.status}</strong>
            </div>
          </div>

          <div className={styles.scenarioGrid}>
            {physicsScenarios.map((scenario, index) => (
              <article className={styles.scenarioCard} key={scenario.key} aria-current={index === 0 ? "true" : undefined}>
                <div className={styles.cardTopline}>
                  <span>{scenario.name}</span>
                  <strong>{scenario.status}</strong>
                </div>
                <p>{scenario.intent}</p>
                <dl className={styles.telemetryList}>
                  <div>
                    <dt>position</dt>
                    <dd>{scenario.position}</dd>
                  </div>
                  <div>
                    <dt>velocity</dt>
                    <dd>{scenario.velocity}</dd>
                  </div>
                  <div>
                    <dt>angular velocity</dt>
                    <dd>{scenario.angularVelocity}</dd>
                  </div>
                  <div>
                    <dt>last contact</dt>
                    <dd>{scenario.contact.type}</dd>
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
              <h2>{activeScenario.name}</h2>
            </div>
            <Goal aria-hidden="true" />
          </div>

          <dl className={styles.detailGrid}>
            <div>
              <dt>contact point</dt>
              <dd>{activeScenario.contact.point}</dd>
            </div>
            <div>
              <dt>contact normal</dt>
              <dd>{activeScenario.contact.normal}</dd>
            </div>
            <div>
              <dt>contact strength</dt>
              <dd>{activeScenario.contact.strength}</dd>
            </div>
            <div>
              <dt>outcome state</dt>
              <dd>{activeScenario.status}</dd>
            </div>
          </dl>

          <div className={styles.markerStack} aria-label="Debug markers">
            {activeScenario.markers.map((marker) => (
              <span key={marker}>{marker}</span>
            ))}
          </div>
        </aside>

        <section id="asset-lab" className={styles.assetPanel} aria-label="Asset Lab">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>Asset Lab</span>
              <h2>场景资产候选清单</h2>
            </div>
            <Sparkles aria-hidden="true" />
          </div>

          <div className={styles.assetTable} role="table" aria-label="Goalkeeper asset candidates">
            <div className={styles.assetHead} role="row">
              <span role="columnheader">asset</span>
              <span role="columnheader">category</span>
              <span role="columnheader">license</span>
              <span role="columnheader">status</span>
              <span role="columnheader">source</span>
              <span role="columnheader">performance</span>
            </div>
            {assetCandidates.map((asset) => (
              <article className={styles.assetRow} role="row" key={asset.name}>
                <div role="cell">
                  <strong>{asset.name}</strong>
                  <p>{asset.intendedUse}</p>
                </div>
                <span role="cell">{asset.category}</span>
                <span role="cell">{asset.license}</span>
                <span role="cell">{asset.status}</span>
                <span role="cell">{asset.source}</span>
                <span role="cell">{asset.performance}</span>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
