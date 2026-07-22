import type { FinanceFieldRole } from "./core";

export type FinanceMappableFieldRole = Extract<FinanceFieldRole, "dimension" | "metric" | "ignore">;

export type FinanceFieldGovernanceOptions = {
    host: HTMLElement | null;
    columns: string[];
    title?: string;
    description?: string;
    roles?: FinanceMappableFieldRole[];
    onConfirm: (overrides: Record<string, FinanceMappableFieldRole>) => void;
    onCancel?: () => void;
};

const ROLE_OPTIONS: Array<{ value: FinanceMappableFieldRole; label: string }> = [
    { value: "dimension", label: "维度" },
    { value: "metric", label: "数值指标" },
    { value: "ignore", label: "忽略" },
];

export function normalizeFinanceFieldRoleOverrides(
    columns: string[],
    values: Record<string, unknown>,
): Record<string, FinanceMappableFieldRole> {
    const allowedColumns = new Set(columns.map((column) => String(column)));
    const allowedRoles = new Set<FinanceMappableFieldRole>(ROLE_OPTIONS.map((option) => option.value));
    return Object.fromEntries(
        Object.entries(values).filter(([column, role]) => (
            allowedColumns.has(column) && allowedRoles.has(role as FinanceMappableFieldRole)
        )),
    ) as Record<string, FinanceMappableFieldRole>;
}

export function closeFinanceFieldGovernance(host: HTMLElement | null) {
    if (!host) return;
    host.replaceChildren();
    host.hidden = true;
}

export function showFinanceFieldGovernance({
    host,
    columns,
    title = "确认字段用途",
    description = "这些字段缺少样本值，暂时无法判断用途。确认后再开始计算。",
    roles = ROLE_OPTIONS.map((option) => option.value),
    onConfirm,
    onCancel,
}: FinanceFieldGovernanceOptions) {
    if (!host || !columns.length) return () => undefined;
    closeFinanceFieldGovernance(host);
    host.hidden = false;

    const heading = document.createElement("h3");
    heading.className = "finance-field-governance-title";
    heading.textContent = title;

    const copy = document.createElement("p");
    copy.className = "finance-field-governance-copy";
    copy.textContent = description;

    const fields = document.createElement("div");
    fields.className = "finance-field-governance-fields";
    const selects = new Map<string, HTMLSelectElement>();

    columns.forEach((column) => {
        const label = document.createElement("label");
        label.className = "finance-field-governance-field";
        const name = document.createElement("span");
        name.textContent = column;
        const select = document.createElement("select");
        select.className = "input finance-field-governance-select";
        select.setAttribute("aria-label", `${column}字段用途`);
        ROLE_OPTIONS.filter((role) => roles.includes(role.value)).forEach((role) => {
            select.add(new Option(role.label, role.value));
        });
        label.append(name, select);
        fields.append(label);
        selects.set(column, select);
    });

    const actions = document.createElement("div");
    actions.className = "finance-field-governance-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-secondary";
    cancel.textContent = "取消";
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "btn btn-primary";
    confirm.textContent = "确认并继续";
    actions.append(cancel, confirm);

    host.append(heading, copy, fields, actions);

    const close = () => closeFinanceFieldGovernance(host);
    cancel.addEventListener("click", () => {
        close();
        onCancel?.();
    }, { once: true });
    confirm.addEventListener("click", () => {
        const values = Object.fromEntries(
            Array.from(selects, ([column, select]) => [column, select.value]),
        );
        const overrides = normalizeFinanceFieldRoleOverrides(columns, values);
        close();
        onConfirm(overrides);
    }, { once: true });

    return close;
}
