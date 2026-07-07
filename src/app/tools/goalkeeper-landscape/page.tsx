import type { Metadata, Viewport } from "next";
import GoalkeeperLandscapeRuntime, { GOALKEEPER_SCRIPT_SRC } from "./GoalkeeperLandscapeRuntime";

const GOALKEEPER_STYLESHEET_HREF = "/tools/goalkeeper-landscape/assets/index-hTxdIy6z.css";

export const metadata: Metadata = {
  title: "弹力手套守门挑战｜Lucas Yin",
  description: "一个横屏体验的弹力手套守门小游戏。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function GoalkeeperLandscapePage() {
  return (
    <>
      <link rel="stylesheet" crossOrigin="anonymous" href={GOALKEEPER_STYLESHEET_HREF} />
      <main className="app" aria-label="弹力手套守门挑战" data-script-src={GOALKEEPER_SCRIPT_SRC}>
        <section className="game-shell">
          <div className="stage" id="stage">
            <canvas id="gameCanvas" width="1280" height="720" aria-label="弹力手套守门挑战游戏" />

            <section className="game-hud" aria-label="比赛状态">
              <div className="glass-panel hud-score">
                <span className="hud-icon" aria-hidden="true">PTS</span>
                <span>扑救分</span>
                <strong id="scoreValue">0</strong>
              </div>

              <div className="glass-panel hud-time">
                <span className="hud-icon" aria-hidden="true">TIME</span>
                <span>时间</span>
                <strong id="timeValue">60</strong>
              </div>

              <div className="hud-actions">
                <div className="glass-panel hud-streak">
                  <span className="hud-icon" aria-hidden="true">STK</span>
                  <span>连扑</span>
                  <strong id="streakValue">0</strong>
                </div>
                <div className="glass-panel hud-goals">
                  <span className="hud-icon" aria-hidden="true">GA</span>
                  <span>失球</span>
                  <strong id="concededValue">0/5</strong>
                </div>
                <button className="glass-button" id="pauseButton" type="button" aria-label="暂停">Ⅱ 暂停</button>
              </div>
            </section>

            <div className="bottom-controls" aria-label="游戏控制">
              <div className="difficulty-control glass-panel" role="group" aria-label="难度">
                <button className="difficulty-button" type="button" data-difficulty="easy" aria-pressed="false">容易</button>
                <button className="difficulty-button is-active" type="button" data-difficulty="medium" aria-pressed="true">中等</button>
                <button className="difficulty-button" type="button" data-difficulty="hard" aria-pressed="false">困难</button>
              </div>
              <button className="glass-button utility-button" id="soundButton" type="button" aria-label="关闭音效">音效开</button>
            </div>

            <div className="overlay start-overlay" id="startOverlay">
              <button className="start-disc" id="startButton" type="button" aria-label="开始挑战">
                <span>拖动后</span>
                <strong>开始</strong>
              </button>
            </div>

            <div className="overlay end-overlay hidden" id="endOverlay" aria-live="polite">
              <div className="result-panel">
                <span className="result-kicker" id="resultReason">挑战结束</span>
                <strong id="finalScore">0</strong>
                <button id="restartButton" type="button">再来一局</button>
              </div>
            </div>

            <div className="rotate-hint">请横屏体验</div>
          </div>
        </section>
      </main>
      <GoalkeeperLandscapeRuntime />
    </>
  );
}
