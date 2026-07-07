import { MAX_CONCEDED } from "../config/game-config.js";

export function createHud(documentRef) {
  var refs = {
    scoreValue: documentRef.getElementById("scoreValue"),
    timeValue: documentRef.getElementById("timeValue"),
    streakValue: documentRef.getElementById("streakValue"),
    concededValue: documentRef.getElementById("concededValue"),
    pauseButton: documentRef.getElementById("pauseButton"),
    soundButton: documentRef.getElementById("soundButton"),
    startButton: documentRef.getElementById("startButton"),
    restartButton: documentRef.getElementById("restartButton"),
    difficultyButtons: Array.from(documentRef.querySelectorAll?.("[data-difficulty]") || []),
    startOverlay: documentRef.getElementById("startOverlay"),
    endOverlay: documentRef.getElementById("endOverlay"),
    finalScore: documentRef.getElementById("finalScore"),
    resultReason: documentRef.getElementById("resultReason"),
    feedbackToast: documentRef.getElementById("feedbackToast"),
  };

  function setVisible(element, visible) {
    if (element) element.classList.toggle("hidden", !visible);
  }

  function setClass(element, className, enabled) {
    if (element) element.classList.toggle(className, enabled);
  }

  function updateFeedback(state) {
    var toast = refs.feedbackToast;
    var message = state.message;
    var isSave = message === "save";
    var isGoal = message === "goal";
    var isStreak = isSave && (state.streak || 0) >= 3;
    var visible = isSave || isGoal;

    if (toast) {
      toast.textContent = isSave ? "+" + String(state.lastSavePoints || 0) : isGoal ? "失球" : "";
      setClass(toast, "is-visible", visible);
      setClass(toast, "is-save", isSave);
      setClass(toast, "is-goal", isGoal);
      setClass(toast, "is-streak", isStreak);
    }

    setClass(refs.streakValue, "is-hot", (state.streak || 0) >= 3);
  }

  return {
    refs,
    bind(actions) {
      refs.startButton?.addEventListener("click", actions.onStart);
      refs.restartButton?.addEventListener("click", actions.onRestart);
      refs.pauseButton?.addEventListener("click", actions.onPause);
      refs.soundButton?.addEventListener("click", actions.onSound);
      refs.difficultyButtons.forEach((button) => {
        button.addEventListener("click", () => actions.onDifficulty?.(button.dataset.difficulty));
      });
    },
    updateDifficulty(selectedDifficulty) {
      refs.difficultyButtons.forEach((button) => {
        var active = button.dataset.difficulty === selectedDifficulty;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    },
    update(state, soundEnabled) {
      if (refs.scoreValue) refs.scoreValue.textContent = String(state.score);
      if (refs.timeValue) refs.timeValue.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
      if (refs.streakValue) refs.streakValue.textContent = "x" + String(state.streak || 0);
      if (refs.concededValue) refs.concededValue.textContent = state.conceded + "/" + MAX_CONCEDED;
      if (refs.pauseButton) refs.pauseButton.textContent = state.paused ? "▶ 继续" : "Ⅱ 暂停";
      if (refs.soundButton) {
        refs.soundButton.textContent = soundEnabled ? "音效开" : "静音";
        refs.soundButton.setAttribute("aria-label", soundEnabled ? "关闭音效" : "开启音效");
      }
      if (refs.finalScore) refs.finalScore.textContent = String(state.score);
      if (refs.resultReason) refs.resultReason.textContent = state.endReason === "conceded" ? "失球过多" : "挑战结束";
      updateFeedback(state);
      setVisible(refs.startOverlay, !state.running && !state.ended);
      setVisible(refs.endOverlay, state.ended);
    },
  };
}
