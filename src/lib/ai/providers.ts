export type ChatProvider = {
  model: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export type SpeechProvider = {
  model: string;
  voice: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export const AI_PRIMARY_API_KEY_ENV = "AI_PRIMARY_API_KEY";
export const AI_PRIMARY_API_URL_ENV = "AI_PRIMARY_API_URL";
export const AI_PRIMARY_MODEL_ENV = "AI_PRIMARY_MODEL";
export const AI_PRIMARY_TTS_MODEL_ENV = "AI_PRIMARY_TTS_MODEL";
export const AI_PRIMARY_TTS_VOICE_ENV = "AI_PRIMARY_TTS_VOICE";
export const AI_PROVIDER_ORDER_ENV = "AI_PROVIDER_ORDER";

const AI_PRIMARY_API_URL = "https://api.dstopology.com";
const AI_PRIMARY_MODEL = "gpt-5.5";
const AI_PRIMARY_TTS_MODEL = "tts-1-hd";
const AI_PRIMARY_TTS_VOICE = "nova";
const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-v4-pro";

function readEnv(value?: string) {
  return value?.trim() || "";
}

function normalizeChatCompletionsUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/\/chat\/completions$/i.test(trimmed)) return trimmed;
  if (/\/v1$/i.test(trimmed)) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

function normalizeOpenAiBaseUrl(value: string) {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/v1\/chat\/completions$/i, "")
    .replace(/\/chat\/completions$/i, "")
    .replace(/\/v1\/audio\/speech$/i, "")
    .replace(/\/audio\/speech$/i, "")
    .replace(/\/v1$/i, "");
}

function normalizeSpeechUrl(value: string) {
  const baseUrl = normalizeOpenAiBaseUrl(value);
  return baseUrl ? `${baseUrl}/v1/audio/speech` : "";
}

export function getChatProviders(timeoutMs: number): ChatProvider[] {
  const primaryApiUrl = normalizeChatCompletionsUrl(
    readEnv(process.env.AI_PRIMARY_API_URL) || AI_PRIMARY_API_URL,
  );
  const primaryApiKey = readEnv(process.env.AI_PRIMARY_API_KEY);
  const primaryModel = readEnv(process.env.AI_PRIMARY_MODEL) || AI_PRIMARY_MODEL;

  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;

  const providers = {
    primary: {
      model: primaryModel,
      apiUrl: primaryApiUrl,
      apiKey: primaryApiKey,
      timeoutMs,
    },
    deepseek: {
      model: DEEPSEEK_MODEL,
      apiUrl: deepseekApiUrl,
      apiKey: deepseekApiKey,
      timeoutMs,
    },
  } satisfies Record<"primary" | "deepseek", ChatProvider>;
  const requestedOrder = readEnv(process.env.AI_PROVIDER_ORDER)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is keyof typeof providers => item === "primary" || item === "deepseek");
  const order = [...new Set([...requestedOrder, "primary", "deepseek"])] as Array<keyof typeof providers>;

  return order.map((name) => providers[name]);
}

export function getSpeechProvider(timeoutMs: number): SpeechProvider {
  const primaryApiUrl = readEnv(process.env.AI_PRIMARY_API_URL) || AI_PRIMARY_API_URL;

  return {
    model: readEnv(process.env.AI_PRIMARY_TTS_MODEL) || AI_PRIMARY_TTS_MODEL,
    voice: readEnv(process.env.AI_PRIMARY_TTS_VOICE) || AI_PRIMARY_TTS_VOICE,
    apiUrl: normalizeSpeechUrl(primaryApiUrl),
    apiKey: readEnv(process.env.AI_PRIMARY_API_KEY),
    timeoutMs,
  };
}
