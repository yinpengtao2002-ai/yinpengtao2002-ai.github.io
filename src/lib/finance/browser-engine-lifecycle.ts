type Disconnectable = { disconnect: () => void };
type Abortable = { abort: () => void; readyState?: number };

export function clearFinanceEngineBindingMarkers(root: Element | null) {
    if (!root) return;
    [root, ...Array.from(root.querySelectorAll("*"))].forEach((element) => {
        Object.keys((element as HTMLElement).dataset ?? {}).forEach((key) => {
            if (key.startsWith("bound") || key.endsWith("Bound")) {
                delete (element as HTMLElement).dataset[key];
            }
        });
    });
}

export function createFinanceEngineLifecycle() {
    let controller: AbortController | undefined;
    const observers = new Set<Disconnectable>();
    const timeouts = new Set<ReturnType<typeof globalThis.setTimeout>>();
    const intervals = new Set<ReturnType<typeof globalThis.setInterval>>();
    const frames = new Set<number>();
    const abortables = new Set<Abortable>();
    const cleanups = new Set<() => void>();

    function start() {
        dispose();
        controller = new AbortController();
        return controller.signal;
    }

    function signal() {
        return controller?.signal;
    }

    function listen(
        target: EventTarget | null | undefined,
        eventName: string,
        handler: EventListenerOrEventListenerObject,
        options: boolean | AddEventListenerOptions = {},
    ) {
        if (!target || !controller || controller.signal.aborted) return;
        const normalizedOptions = typeof options === "boolean" ? { capture: options } : options;
        target.addEventListener(eventName, handler, {
            ...normalizedOptions,
            signal: controller.signal,
        });
    }

    function timeout(callback: () => void, delay: number) {
        const id = globalThis.setTimeout(() => {
            timeouts.delete(id);
            if (!controller?.signal.aborted) callback();
        }, delay);
        timeouts.add(id);
        return id;
    }

    function interval(callback: () => void, delay: number) {
        const id = globalThis.setInterval(() => {
            if (!controller?.signal.aborted) callback();
        }, delay);
        intervals.add(id);
        return id;
    }

    function frame(callback: FrameRequestCallback) {
        if (typeof globalThis.requestAnimationFrame !== "function") return 0;
        const id = globalThis.requestAnimationFrame((timestamp) => {
            frames.delete(id);
            if (!controller?.signal.aborted) callback(timestamp);
        });
        frames.add(id);
        return id;
    }

    function observe<T extends Disconnectable>(observer: T) {
        observers.add(observer);
        return observer;
    }

    function trackAbortable<T extends Abortable>(abortable: T) {
        abortables.add(abortable);
        return abortable;
    }

    function onDispose(cleanup: () => void) {
        cleanups.add(cleanup);
        return cleanup;
    }

    function dispose() {
        controller?.abort();
        controller = undefined;
        observers.forEach((observer) => observer.disconnect());
        observers.clear();
        timeouts.forEach((id) => globalThis.clearTimeout(id));
        timeouts.clear();
        intervals.forEach((id) => globalThis.clearInterval(id));
        intervals.clear();
        frames.forEach((id) => globalThis.cancelAnimationFrame?.(id));
        frames.clear();
        abortables.forEach((abortable) => {
            try {
                abortable.abort();
            } catch {
                // Already completed or aborted.
            }
        });
        abortables.clear();
        cleanups.forEach((cleanup) => cleanup());
        cleanups.clear();
    }

    return {
        start,
        signal,
        listen,
        timeout,
        interval,
        frame,
        observe,
        trackAbortable,
        onDispose,
        dispose,
    };
}
