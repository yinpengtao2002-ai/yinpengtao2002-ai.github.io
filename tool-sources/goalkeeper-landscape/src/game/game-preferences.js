const STORAGE_KEY = "goalkeeper-preferences-v1";

function normalize(values = {}) {
  return {
    mode: values?.mode === "penalty" ? "penalty" : "timed",
    timedDifficulty: ["easy", "medium", "hard"].includes(values?.timedDifficulty) ? values.timedDifficulty : "medium",
    penaltyDifficulty: values?.penaltyDifficulty === "hard" ? "hard" : "extreme",
    sound: typeof values?.sound === "boolean" ? values.sound : true,
    assist: typeof values?.assist === "boolean" ? values.assist : true,
  };
}

export function readGamePreferences(windowRef) {
  var saved;
  try {
    saved = JSON.parse(windowRef?.localStorage?.getItem(STORAGE_KEY) || "null");
  } catch {
    // Privacy settings or old, invalid storage must never prevent game startup.
  }
  var preferences = normalize(saved);
  var params = new URLSearchParams(windowRef?.location?.search || "");
  if (params.has("mode")) preferences.mode = params.get("mode") === "penalty" ? "penalty" : "timed";
  if (params.has("difficulty")) {
    var value = params.get("difficulty");
    if (preferences.mode === "penalty") preferences.penaltyDifficulty = value === "hard" ? "hard" : "extreme";
    else preferences.timedDifficulty = ["easy", "medium", "hard"].includes(value) ? value : "medium";
  }
  return preferences;
}

export function saveGamePreferences(windowRef, preferences) {
  try {
    windowRef?.localStorage?.setItem(STORAGE_KEY, JSON.stringify(normalize(preferences)));
  } catch {
    // Settings still apply to the current session when storage is unavailable.
  }
}
