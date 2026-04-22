export function scrollToSection(targetId: string) {
    if (typeof window === "undefined") return;

    const target = document.getElementById(targetId);
    if (!target) return;

    target.scrollIntoView({
        behavior: "smooth",
        block: "start",
    });

    const nextUrl = `${window.location.pathname}${window.location.search}#${targetId}`;
    window.history.replaceState(window.history.state, "", nextUrl);
}
