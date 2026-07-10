"use client";

import { useEffect } from "react";

export const GOALKEEPER_SCRIPT_SRC = "/tools/goalkeeper-landscape/assets/index-Bvmpm0eX.js";

export default function GoalkeeperLandscapeRuntime() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.crossOrigin = "anonymous";
    script.src = `${GOALKEEPER_SCRIPT_SRC}?mount=${Date.now()}`;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}
