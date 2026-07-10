export function claimGoalkeeperMount(windowRef, mountId) {
  windowRef.goalkeeperActiveMountId = mountId;
  return mountId;
}

export function installGoalkeeperRuntime(windowRef, mountId, runtime, canvas) {
  var isCurrentMount = windowRef.goalkeeperActiveMountId === mountId;
  var isConnected = canvas?.isConnected !== false;

  if (!isCurrentMount || !isConnected) {
    runtime?.dispose?.();
    return false;
  }

  var previousRuntime = windowRef.goalkeeperRuntime;
  if (previousRuntime && previousRuntime !== runtime) previousRuntime.dispose?.();

  windowRef.goalkeeperRuntime = runtime;
  windowRef.goalkeeperRuntimeMountId = mountId;
  return true;
}

export function releaseGoalkeeperMount(windowRef, mountId) {
  var released = false;

  if (windowRef.goalkeeperActiveMountId === mountId) {
    delete windowRef.goalkeeperActiveMountId;
    released = true;
  }

  if (windowRef.goalkeeperRuntimeMountId === mountId) {
    windowRef.goalkeeperRuntime?.dispose?.();
    delete windowRef.goalkeeperRuntime;
    delete windowRef.goalkeeperRuntimeMountId;
    released = true;
  }

  return released;
}
