import type { Metadata, Viewport } from "next";
import GoalkeeperLandscapeRuntime, { GOALKEEPER_SCRIPT_SRC } from "./GoalkeeperLandscapeRuntime";

const GOALKEEPER_STYLESHEET_HREF = "/tools/goalkeeper-landscape/assets/index-C3Y5dsvI.css";

export const metadata: Metadata = {
  title: "守门挑战",
  description: "横屏 3D 守门游戏，支持经典模式和点球大战。",
  manifest: "/tools/goalkeeper-landscape/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "守门挑战",
  },
  other: {
    "screen-orientation": "landscape",
    "x5-orientation": "landscape",
    "x5-fullscreen": "true",
    "full-screen": "yes",
    "mobile-web-app-capable": "yes",
  },
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
      <div className="app" aria-label="守门挑战" data-script-src={GOALKEEPER_SCRIPT_SRC}>
        <section className="game-shell">
          <div className="stage" id="stage">
            <canvas id="gameCanvas" width="1280" height="720" aria-label="守门挑战游戏" />

            <section className="game-hud broadcast-scorebug" id="gameHud" data-hud-system="broadcast-scorebug-compact-hud" aria-label="比赛状态">
              <div className="glass-panel hud-score hud-metric">
                <span className="hud-icon hud-icon-score" aria-hidden="true" />
                <span className="hud-label" id="scoreLabel">扑救分</span>
                <strong className="hud-value" id="scoreValue">0</strong>
              </div>

              <div className="glass-panel hud-time hud-metric">
                <span className="hud-icon hud-icon-time" aria-hidden="true" />
                <span className="hud-label" id="timeLabel">时间</span>
                <strong className="hud-value" id="timeValue">60</strong>
              </div>

              <div className="hud-actions">
                <div className="glass-panel hud-streak hud-metric">
                  <span className="hud-icon hud-icon-streak" aria-hidden="true" />
                  <span className="hud-label" id="streakLabel">连扑</span>
                  <strong className="hud-value" id="streakValue">0</strong>
                </div>
                <div className="glass-panel hud-goals hud-metric">
                  <span className="hud-icon hud-icon-goals" aria-hidden="true" />
                  <span className="hud-label" id="concededLabel">失球</span>
                  <strong className="hud-value" id="concededValue">0/5</strong>
                </div>
                <button className="glass-button hud-pause-button" id="pauseButton" type="button" aria-label="暂停挑战">Ⅱ</button>
              </div>
            </section>

            <section className="penalty-scoreboard hidden" id="penaltyScoreboard" data-hud-system="penalty-shootout-score-strip" aria-label="点球大战比分">
              <div className="penalty-heading">
                <strong id="penaltyRoundLabel">第 1 轮</strong>
                <span id="penaltyPhaseLabel">准备扑救</span>
              </div>
              <div className="penalty-team-row">
                <span>我方</span>
                <strong className="penalty-kick-marks" id="penaltyTeamKicks">· · · · ·</strong>
                <b id="penaltyTeamScore">0</b>
              </div>
              <div className="penalty-team-row is-opponent">
                <span>对手</span>
                <strong className="penalty-kick-marks" id="penaltyOpponentKicks">· · · · ·</strong>
                <b id="penaltyOpponentScore">0</b>
              </div>
            </section>
            <div className="penalty-announcement" id="penaltyAnnouncement" aria-live="polite" />
            <section className="penalty-round-break" id="penaltyRoundBreak" data-hud-system="penalty-round-score-break" aria-live="polite">
              <span id="penaltyRoundBreakLabel">第 1 轮结束</span>
              <strong id="penaltyRoundBreakScore">0 : 0</strong>
              <p id="penaltyRoundBreakDetail">我方罚球结果</p>
            </section>

            <div className="event-ribbon" id="eventRibbon" data-hud-system="single-match-event-feedback-layer" aria-live="polite" />
            <div className="match-status" id="matchStatus" aria-live="polite" />
            <div className="pressure-cue" id="pressureCue" aria-live="polite" />
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

            <aside className="glove-impact-review" id="gloveImpactReview" aria-live="polite">
              <div className="glove-impact-heading">
                <span>上球触点</span>
                <strong id="gloveImpactResult" />
              </div>
              <canvas id="gloveImpactCanvas" width="440" height="352" aria-hidden="true" />
              <span className="glove-impact-detail" id="gloveImpactDetail" />
            </aside>

            <div className="bottom-controls" id="bottomControls" aria-label="游戏控制">
              <div className="setup-controls">
                <div className="mode-control glass-panel" role="group" aria-label="游戏模式">
                  <button className="mode-button is-active" type="button" data-mode="timed" aria-pressed="true">经典</button>
                  <button className="mode-button" type="button" data-mode="penalty" aria-pressed="false">点球大战</button>
                </div>
                <div className="difficulty-control glass-panel" role="group" aria-label="难度">
                  <button className="difficulty-button" type="button" data-difficulty="easy" aria-pressed="false">容易</button>
                  <button className="difficulty-button is-active" type="button" data-difficulty="medium" aria-pressed="true">中等</button>
                  <button className="difficulty-button" type="button" data-difficulty="hard" aria-pressed="false">困难</button>
                  <button className="difficulty-button hidden" type="button" data-difficulty="extreme" aria-pressed="false">极难</button>
                </div>
                <button
                  className="save-assist-switch is-active"
                  id="saveAssistSwitch"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  aria-label="扑救辅助已开启"
                >
                  <span className="save-assist-label">扑救辅助</span>
                  <span className="save-assist-track" aria-hidden="true"><i /></span>
                </button>
              </div>
              <button className="glass-button utility-button" id="soundButton" type="button" aria-label="音乐与音效待启用，开始挑战后会解锁" />
              <span className="sound-status" id="soundStatus" data-audio-status-system="match-audio-status-chip" aria-live="polite">
                点开始后启用音乐与音效
              </span>
            </div>

            <div className="overlay start-overlay" id="startOverlay">
              <div className="start-panel" data-ui-system="match-hud-flow-polish">
                <p className="start-kicker" id="startKicker">经典模式</p>
                <h1 id="startTitle">守住球门</h1>
                <div className="start-rules" aria-label="比赛规则">
                  <span id="startRuleA">限时 60 秒</span>
                  <span id="startRuleB">失 5 球结束</span>
                  <span id="startRuleC">连扑加分</span>
                </div>
                <button className="start-disc" id="startButton" type="button" aria-label="开始比赛">
                  <span aria-hidden="true">▶</span>
                  <strong id="startButtonLabel">开始比赛</strong>
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
                <div className="result-scoreblock">
                  <span className="result-grade" id="resultGrade">C级</span>
                  <span className="result-kicker" id="resultReason">挑战结束</span>
                  <strong id="finalScore">0</strong>
                </div>
                <div className="result-copyblock">
                  <p className="result-verdict" id="resultVerdict">先守住中路，再去赌边角</p>
                  <p className="result-summary" id="resultSummary">再来一局，读准球路</p>
                  <div className="result-stats" aria-label="本局统计">
                    <span><i id="finalSavesLabel">扑救</i> <strong id="finalSaves">0</strong></span>
                    <span><i id="finalBestStreakLabel">连扑</i> <strong id="finalBestStreak">x0</strong></span>
                    <span><i id="finalConcededLabel">失球</i> <strong id="finalConceded">0/5</strong></span>
                  </div>
                  <p className="result-coach" id="resultCoach" data-result-coach-system="round-result-coach-note">
                    下一局先等球过半，再做大幅移动
                  </p>
                  <button id="restartButton" type="button">再来一局</button>
                </div>
              </div>
            </div>

            <div className="rotate-hint">开始后自动横屏</div>
          </div>
        </section>
      </div>
      <GoalkeeperLandscapeRuntime />
    </>
  );
}
