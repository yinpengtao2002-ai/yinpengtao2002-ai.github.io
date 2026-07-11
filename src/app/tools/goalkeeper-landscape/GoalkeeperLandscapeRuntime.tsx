"use client";

import { useEffect } from "react";

export const GOALKEEPER_SCRIPT_SRC = "/tools/goalkeeper-landscape/assets/index-I1cS7tiu.js";

type GoalkeeperGameWindow = Window & {
  goalkeeperActiveMountId?: string;
  goalkeeperRuntime?: {
    dispose?: () => void;
  };
  goalkeeperRuntimeMountId?: string;
};

function disposeGoalkeeperRuntime(gameWindow: GoalkeeperGameWindow, mountId?: string) {
  if (mountId && gameWindow.goalkeeperRuntimeMountId !== mountId) return;
  const runtime = gameWindow.goalkeeperRuntime;
  runtime?.dispose?.();
  if (gameWindow.goalkeeperRuntime === runtime) delete gameWindow.goalkeeperRuntime;
  if (!mountId || gameWindow.goalkeeperRuntimeMountId === mountId) {
    delete gameWindow.goalkeeperRuntimeMountId;
  }
}

export default function GoalkeeperLandscapeRuntime() {
  useEffect(() => {
    const gameWindow = window as GoalkeeperGameWindow;
    disposeGoalkeeperRuntime(gameWindow);
    const mountId = globalThis.crypto?.randomUUID?.() ?? `goalkeeper-${Date.now()}-${Math.random()}`;
    gameWindow.goalkeeperActiveMountId = mountId;
    const script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.src = `${GOALKEEPER_SCRIPT_SRC}?mount=${encodeURIComponent(mountId)}`;
    document.body.appendChild(script);

    return () => {
      if (gameWindow.goalkeeperActiveMountId === mountId) {
        delete gameWindow.goalkeeperActiveMountId;
      }
      disposeGoalkeeperRuntime(gameWindow, mountId);
      script.remove();
    };
  }, []);

  return null;
}
