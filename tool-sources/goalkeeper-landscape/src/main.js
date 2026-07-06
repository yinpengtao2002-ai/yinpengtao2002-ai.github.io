import { createThreeGameRuntime } from "./game/three-game-runtime.js";

var canvas = document.getElementById("gameCanvas");
var stage = document.getElementById("stage");

async function boot() {
  window.goalkeeperBootStatus = "boot";
  var runtime = await createThreeGameRuntime({
    canvas,
    stage,
    documentRef: document,
    windowRef: window,
  });
  window.goalkeeperRuntime = runtime;
  window.goalkeeperBootStatus = "started";
  runtime.start();
}

boot().catch(function handleBootError(error) {
  window.goalkeeperBootStatus = "failed";
  window.goalkeeperBootError = String(error?.stack || error?.message || error);
  console.error("Failed to start goalkeeper runtime", error);
});
