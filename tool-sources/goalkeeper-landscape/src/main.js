import { createThreeGameRuntime } from "./game/three-game-runtime.js";
import {
  claimGoalkeeperMount,
  installGoalkeeperRuntime,
  releaseGoalkeeperMount,
} from "./game/runtime-mount-guard.js";
import {
  requestLandscapeOrientation,
  syncMobileLandscape,
} from "./ui/mobile-landscape.js";

var canvas = document.getElementById("gameCanvas");
var stage = document.getElementById("stage");
var requestedMountId = new URL(import.meta.url).searchParams.get("mount");
var mountId = requestedMountId || "standalone-goalkeeper";

syncMobileLandscape(stage, window);
void requestLandscapeOrientation(window, stage);

if (!requestedMountId) claimGoalkeeperMount(window, mountId);

async function boot() {
  window.goalkeeperBootStatus = "boot";
  var runtime = await createThreeGameRuntime({
    canvas,
    stage,
    documentRef: document,
    windowRef: window,
  });
  if (!installGoalkeeperRuntime(window, mountId, runtime, canvas)) return;
  window.goalkeeperBootStatus = "started";
  try {
    runtime.start();
  } catch (error) {
    releaseGoalkeeperMount(window, mountId);
    throw error;
  }
}

boot().catch(function handleBootError(error) {
  if (window.goalkeeperActiveMountId !== mountId) return;
  window.goalkeeperBootStatus = "failed";
  window.goalkeeperBootError = String(error?.stack || error?.message || error);
  console.error("Failed to start goalkeeper runtime", error);
});
