export function neutralizeSpreadsheetText<T>(value: T): T | string {
  if (typeof value !== "string") return value;
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}
