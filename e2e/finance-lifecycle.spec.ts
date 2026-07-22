import { expect, test } from "@playwright/test";

type ResourceSnapshot = {
  signalListeners: number;
  resizeObservers: number;
};

test("finance engines release listeners, observers and Plotly nodes across navigation", async ({ page }) => {
  await page.addInitScript(() => {
    const activeSignalListeners = new Set<object>();
    const activeResizeObservers = new Set<object>();
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
    const NativeResizeObserver = window.ResizeObserver;

    type SignalRegistration = {
      target: EventTarget;
      type: string;
      listener: EventListenerOrEventListenerObject;
      capture: boolean;
    };

    const registrations = new Set<SignalRegistration>();
    const captureValue = (options?: boolean | AddEventListenerOptions) =>
      typeof options === "boolean" ? options : Boolean(options?.capture);

    EventTarget.prototype.addEventListener = function trackedAddEventListener(
      type,
      listener,
      options,
    ) {
      const signal = typeof options === "object" && options ? options.signal : undefined;
      if (listener && signal && !signal.aborted) {
        const capture = captureValue(options);
        const duplicate = Array.from(registrations).some(
          (entry) =>
            entry.target === this &&
            entry.type === type &&
            entry.listener === listener &&
            entry.capture === capture,
        );
        if (!duplicate) {
          const registration = { target: this, type, listener, capture };
          registrations.add(registration);
          activeSignalListeners.add(registration);
          originalAddEventListener.call(
            signal,
            "abort",
            () => {
              activeSignalListeners.delete(registration);
              registrations.delete(registration);
            },
            { once: true },
          );
        }
      }
      originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function trackedRemoveEventListener(
      type,
      listener,
      options,
    ) {
      const capture = captureValue(options);
      registrations.forEach((registration) => {
        if (
          registration.target === this &&
          registration.type === type &&
          registration.listener === listener &&
          registration.capture === capture
        ) {
          activeSignalListeners.delete(registration);
          registrations.delete(registration);
        }
      });
      originalRemoveEventListener.call(this, type, listener, options);
    };

    if (NativeResizeObserver) {
      window.ResizeObserver = class TrackedResizeObserver extends NativeResizeObserver {
        observe(target: Element, options?: ResizeObserverOptions) {
          activeResizeObservers.add(this);
          super.observe(target, options);
        }

        disconnect() {
          activeResizeObservers.delete(this);
          super.disconnect();
        }
      };
    }

    Object.defineProperty(window, "__financeResourceSnapshot", {
      configurable: false,
      value: () => ({
        signalListeners: activeSignalListeners.size,
        resizeObservers: activeResizeObservers.size,
      }),
    });
  });

  await page.goto("/finance/");
  const snapshots: ResourceSnapshot[] = [];

  for (let cycle = 0; cycle < 2; cycle += 1) {
    await page.locator('a[href="/finance/business-analysis/"]').click();
    await page.waitForURL("**/finance/business-analysis/");
    await expect(page.locator(".business-tool .js-plotly-plot").first()).toBeVisible();

    await page.getByRole("button", { name: "返回上一页" }).click();
    await page.waitForURL("**/finance/");
    await expect(page.locator(".js-plotly-plot")).toHaveCount(0);

    snapshots.push(
      await page.evaluate(() =>
        (window as typeof window & {
          __financeResourceSnapshot: () => ResourceSnapshot;
        }).__financeResourceSnapshot(),
      ),
    );
  }

  expect(snapshots[1]).toEqual(snapshots[0]);
});
