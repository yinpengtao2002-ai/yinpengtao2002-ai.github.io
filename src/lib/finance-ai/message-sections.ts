export type AssistantMetricTextSplit = {
  introText: string;
  analysisText: string;
};

function isEscaped(text: string, index: number) {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function findNextStrongMarker(text: string, startIndex: number) {
  for (let index = startIndex; index < text.length - 1; index += 1) {
    if (text[index] === "*" && text[index + 1] === "*" && !isEscaped(text, index)) {
      return index;
    }
  }

  return -1;
}

function isInsideStrongEmphasis(text: string, splitIndex: number) {
  let markerCount = 0;
  let cursor = 0;

  while (cursor < splitIndex) {
    const markerIndex = findNextStrongMarker(text, cursor);
    if (markerIndex === -1 || markerIndex >= splitIndex) {
      break;
    }

    markerCount += 1;
    cursor = markerIndex + 2;
  }

  return markerCount % 2 === 1;
}

function getSafeMarkdownSplitIndex(text: string, splitIndex: number) {
  if (!isInsideStrongEmphasis(text, splitIndex)) {
    return splitIndex;
  }

  const closingMarkerIndex = findNextStrongMarker(text, splitIndex);
  return closingMarkerIndex === -1 ? null : closingMarkerIndex + 2;
}

function splitAtSafeIndex(text: string, splitIndex: number): AssistantMetricTextSplit | null {
  const safeSplitIndex = getSafeMarkdownSplitIndex(text, splitIndex);
  if (safeSplitIndex === null) {
    return null;
  }

  const introText = text.slice(0, safeSplitIndex).trim();
  const analysisText = text.slice(safeSplitIndex).trim();

  if (!introText || !analysisText) {
    return null;
  }

  return { introText, analysisText };
}

export function splitAssistantTextForMetricCards(text: string, hasMetricCards: boolean): AssistantMetricTextSplit {
  const normalizedText = text.trim();

  if (!hasMetricCards || !normalizedText) {
    return { introText: text, analysisText: "" };
  }

  const paragraphMatch = normalizedText.match(/\n\s*\n/);
  if (paragraphMatch?.index !== undefined) {
    const split = splitAtSafeIndex(normalizedText, paragraphMatch.index);
    if (split) {
      return split;
    }
  }

  const sentenceMatch = normalizedText.match(/[。！？]/);
  if (sentenceMatch?.index !== undefined && sentenceMatch.index < normalizedText.length - 12) {
    const split = splitAtSafeIndex(normalizedText, sentenceMatch.index + sentenceMatch[0].length);
    if (split) {
      return split;
    }
  }

  return { introText: normalizedText, analysisText: "" };
}
