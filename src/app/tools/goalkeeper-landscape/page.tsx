import type { Metadata, Viewport } from "next";
import GoalkeeperLandscapeRuntime, { GOALKEEPER_SCRIPT_SRC } from "./GoalkeeperLandscapeRuntime";

const GOALKEEPER_STYLESHEET_HREF = "/tools/goalkeeper-landscape/assets/index-C_3_ZRGc.css";

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

            <section className="game-hud broadcast-scorebug" id="gameHud" data-hud-system="broadcast-scorebug-compact-hud" aria-label="比赛状态">
              <div className="glass-panel hud-score hud-metric">
                <span className="hud-icon hud-icon-score" aria-hidden="true" />
                <span className="hud-label">扑救分</span>
                <strong className="hud-value" id="scoreValue">0</strong>
              </div>

              <div className="glass-panel hud-time hud-metric">
                <span className="hud-icon hud-icon-time" aria-hidden="true" />
                <span className="hud-label">时间</span>
                <strong className="hud-value" id="timeValue">60</strong>
              </div>

              <div className="hud-actions">
                <div className="glass-panel hud-streak hud-metric">
                  <span className="hud-icon hud-icon-streak" aria-hidden="true" />
                  <span className="hud-label">连扑</span>
                  <strong className="hud-value" id="streakValue">0</strong>
                </div>
                <div className="glass-panel hud-goals hud-metric">
                  <span className="hud-icon hud-icon-goals" aria-hidden="true" />
                  <span className="hud-label">失球</span>
                  <strong className="hud-value" id="concededValue">0/5</strong>
                </div>
                <button className="glass-button hud-pause-button" id="pauseButton" type="button" aria-label="暂停挑战">Ⅱ 暂停</button>
              </div>
            </section>

            <div className="feedback-toast" id="feedbackToast" aria-live="polite" />
            <div className="event-ribbon" id="eventRibbon" data-hud-system="broadcast-event-ribbon-hud" aria-live="polite" />
            <div className="match-status" id="matchStatus" aria-live="polite" />
            <div className="pressure-cue" id="pressureCue" aria-live="polite" />
            <div className="match-atmosphere" id="matchAtmosphere" data-hud-system="match-atmosphere-event-rail" aria-live="polite">
              <span className="match-atmosphere-fill" id="matchAtmosphereFill" />
              <span className="match-atmosphere-copy" id="matchAtmosphereCopy" />
            </div>
            <div
              className="match-progress"
              id="matchProgress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={60}
              aria-valuenow={60}
              aria-valuetext="剩余 60 秒"
              data-hud-system="match-progress-hud"
            >
              <span className="match-progress-fill" id="matchProgressFill" />
            </div>

            <div className="bottom-controls" id="bottomControls" aria-label="游戏控制">
              <div className="difficulty-control glass-panel" role="group" aria-label="难度">
                <button className="difficulty-button" type="button" data-difficulty="easy" aria-pressed="false">容易</button>
                <button className="difficulty-button is-active" type="button" data-difficulty="medium" aria-pressed="true">中等</button>
                <button className="difficulty-button" type="button" data-difficulty="hard" aria-pressed="false">困难</button>
              </div>
              <button className="glass-button utility-button" id="soundButton" type="button" aria-label="音效待启用，开始挑战后会解锁">待启用</button>
              <span className="sound-status" id="soundStatus" data-audio-status-system="match-audio-status-chip" aria-live="polite">
                点开始后启用音效
              </span>
            </div>

            <div className="overlay start-overlay" id="startOverlay">
              <div className="start-panel" data-ui-system="match-hud-flow-polish">
                <p className="start-kicker">60 秒守门挑战</p>
                <h1>弹力手套守门</h1>
                <div className="start-rules" aria-label="挑战规则">
                  <span><strong>60</strong> 秒</span>
                  <span><strong>5</strong> 失球</span>
                  <span><strong>x3</strong> 连扑</span>
                </div>
                <button className="start-disc" id="startButton" type="button" aria-label="开始挑战">
                  <span>准备好</span>
                  <strong>开始</strong>
                </button>
              </div>
            </div>

            <div className="overlay pause-overlay hidden" id="pauseOverlay" aria-live="polite">
              <div className="pause-panel">
                <div className="pause-copy">
                  <span>比赛暂停</span>
                  <p className="pause-hint" id="pauseHint" data-pause-hint-system="match-pause-coach-hint">
                    先盯球速，再移动手套
                  </p>
                </div>
                <button className="glass-button pause-resume-button" id="pauseResumeButton" type="button" aria-label="继续挑战">▶ 继续</button>
              </div>
            </div>

            <div className="overlay end-overlay hidden" id="endOverlay" aria-live="polite">
              <div className="result-panel">
                <span className="result-grade" id="resultGrade">C级</span>
                <span className="result-kicker" id="resultReason">挑战结束</span>
                <strong id="finalScore">0</strong>
                <p className="result-verdict" id="resultVerdict">先守住中路，再去赌边角</p>
                <p className="result-summary" id="resultSummary">再来一局，读准球路</p>
                <p className="result-coach" id="resultCoach" data-result-coach-system="round-result-coach-note">
                  下一局先等球过半，再做大幅移动
                </p>
                <div className="result-review" id="resultReview" data-result-review-system="round-result-review-cards" aria-label="本局复盘">
                  <span>亮点 <strong id="finalHighlight">先读第一脚球</strong></span>
                  <span>短板 <strong id="finalWeakness">出手再慢一点</strong></span>
                  <span>目标 <strong id="finalNextTarget">先完成 3 次扑救</strong></span>
                </div>
                <div className="result-stats" aria-label="本局统计">
                  <span>扑救 <strong id="finalSaves">0</strong></span>
                  <span>连扑 <strong id="finalBestStreak">x0</strong></span>
                  <span>失球 <strong id="finalConceded">0/5</strong></span>
                </div>
                <div className="result-tags" id="resultTags" data-result-tags-system="round-result-performance-tags" aria-label="表现标签">
                  <span>扑救率 <strong id="finalSaveRate">0%</strong></span>
                  <span>节奏 <strong id="finalRhythmTag">待机</strong></span>
                  <span>防线 <strong id="finalControlTag">稳住</strong></span>
                </div>
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
