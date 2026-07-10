import { describe, expect, it, vi } from "vitest";
import {
  claimGoalkeeperMount,
  installGoalkeeperRuntime,
  releaseGoalkeeperMount,
} from "../src/game/runtime-mount-guard.js";

function createRuntime() {
  return {
    dispose: vi.fn(),
  };
}

describe("goalkeeper runtime mount guard", () => {
  it("disposes a stale async boot instead of letting it replace the current mount", () => {
    const windowRef = {};
    const connectedCanvas = { isConnected: true };
    const staleRuntime = createRuntime();
    const currentRuntime = createRuntime();

    claimGoalkeeperMount(windowRef, "mount-a");
    claimGoalkeeperMount(windowRef, "mount-b");

    expect(installGoalkeeperRuntime(windowRef, "mount-a", staleRuntime, connectedCanvas)).toBe(false);
    expect(staleRuntime.dispose).toHaveBeenCalledTimes(1);
    expect(windowRef.goalkeeperRuntime).toBeUndefined();

    expect(installGoalkeeperRuntime(windowRef, "mount-b", currentRuntime, connectedCanvas)).toBe(true);
    expect(windowRef.goalkeeperRuntime).toBe(currentRuntime);
    expect(windowRef.goalkeeperRuntimeMountId).toBe("mount-b");
  });

  it("does not let stale cleanup dispose a newer runtime", () => {
    const windowRef = {};
    const runtime = createRuntime();

    claimGoalkeeperMount(windowRef, "mount-b");
    installGoalkeeperRuntime(windowRef, "mount-b", runtime, { isConnected: true });

    expect(releaseGoalkeeperMount(windowRef, "mount-a")).toBe(false);
    expect(runtime.dispose).not.toHaveBeenCalled();
    expect(windowRef.goalkeeperRuntime).toBe(runtime);

    expect(releaseGoalkeeperMount(windowRef, "mount-b")).toBe(true);
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    expect(windowRef.goalkeeperRuntime).toBeUndefined();
    expect(windowRef.goalkeeperRuntimeMountId).toBeUndefined();
    expect(windowRef.goalkeeperActiveMountId).toBeUndefined();
  });

  it("rejects a runtime whose canvas was detached before async boot completed", () => {
    const windowRef = {};
    const runtime = createRuntime();

    claimGoalkeeperMount(windowRef, "mount-a");

    expect(installGoalkeeperRuntime(windowRef, "mount-a", runtime, { isConnected: false })).toBe(false);
    expect(runtime.dispose).toHaveBeenCalledTimes(1);
    expect(windowRef.goalkeeperRuntime).toBeUndefined();
  });
});
