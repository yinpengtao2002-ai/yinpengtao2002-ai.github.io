export const FINANCE_WORKBENCH_MOBILE_BREAKPOINT_PX = 900;
export const FINANCE_WORKBENCH_MOBILE_QUERY = `(max-width: ${FINANCE_WORKBENCH_MOBILE_BREAKPOINT_PX}px)`;

export function isFinanceWorkbenchMobileViewport() {
    return typeof window !== "undefined" && window.matchMedia(FINANCE_WORKBENCH_MOBILE_QUERY).matches;
}
