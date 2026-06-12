function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

function removeNumericSeparators(value: string) {
  return value.replace(/[,\s，]/g, "");
}

export function filterTableValueBySearchText(value: string, searchText: string) {
  const query = normalizeSearchText(searchText);

  if (!query) {
    return true;
  }

  const displayText = normalizeSearchText(value || "空白");
  const compactDisplayText = removeNumericSeparators(displayText);
  const compactQuery = removeNumericSeparators(query);

  return displayText.includes(query) || compactDisplayText.includes(compactQuery);
}
