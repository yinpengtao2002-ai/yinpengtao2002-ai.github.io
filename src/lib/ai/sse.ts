export type SiteSseEvent =
  | { text: string }
  | { error: string; errorCode?: string; requestId?: string }
  | { done: true };

export type SseDataDecoder = {
  push(chunk: Uint8Array): void;
  finish(): void;
};

export function createSseDataDecoder(onData: (data: string) => void): SseDataDecoder {
  const decoder = new TextDecoder();
  let buffer = "";
  let dataLines: string[] = [];
  let finished = false;

  const flushEvent = () => {
    if (dataLines.length === 0) return;
    const data = dataLines.join("\n");
    dataLines = [];
    onData(data);
  };

  const processLine = (line: string) => {
    const normalized = line.endsWith("\r") ? line.slice(0, -1) : line;
    if (!normalized) {
      flushEvent();
      return;
    }
    if (normalized.startsWith("data:")) {
      dataLines.push(normalized.slice(5).replace(/^ /, ""));
    }
  };

  const drain = (final = false) => {
    const lines = buffer.split("\n");
    buffer = final ? "" : (lines.pop() ?? "");
    for (const line of lines) processLine(line);
    if (final && buffer) processLine(buffer);
    if (final) flushEvent();
  };

  return {
    push(chunk) {
      if (finished) return;
      buffer += decoder.decode(chunk, { stream: true });
      drain(false);
    },
    finish() {
      if (finished) return;
      finished = true;
      buffer += decoder.decode();
      const finalBuffer = buffer;
      buffer = "";
      const lines = finalBuffer.split("\n");
      for (const line of lines) processLine(line);
      flushEvent();
    },
  };
}

export function createSseDecoder(onEvent: (event: SiteSseEvent) => void): SseDataDecoder {
  let done = false;
  return createSseDataDecoder((data) => {
    if (done) return;
    if (data.trim() === "[DONE]") {
      done = true;
      onEvent({ done: true });
      return;
    }
    try {
      const parsed = JSON.parse(data) as Record<string, unknown>;
      if (typeof parsed.text === "string") {
        onEvent({ text: parsed.text });
      } else if (typeof parsed.error === "string") {
        onEvent({
          error: parsed.error,
          ...(typeof parsed.errorCode === "string" ? { errorCode: parsed.errorCode } : {}),
          ...(typeof parsed.requestId === "string" ? { requestId: parsed.requestId } : {}),
        });
      }
    } catch {
      // Ignore malformed upstream events without dropping later complete events.
    }
  });
}
