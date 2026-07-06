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
    startOverlay: documentRef.getElementById("startOverlay"),
    endOverlay: documentRef.getElementById("endOverlay"),
    finalScore: documentRef.getElementById("finalScore"),
    resultReason: documentRef.getElementById("resultReason"),
  };

  function setVisible(element, visible) {
    if (element) element.classList.toggle("hidden", !visible);
  }

  return {
    refs,
    bind(actions) {
      refs.startButton?.addEventListener("click", actions.onStart);
      refs.restartButton?.addEventListener("click", actions.onRestart);
      refs.pauseButton?.addEventListener("click", actions.onPause);
      refs.soundButton?.addEventListener("click", actions.onSound);
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
      setVisible(refs.startOverlay, !state.running && !state.ended);
      setVisible(refs.endOverlay, state.ended);
    },
  };
}
