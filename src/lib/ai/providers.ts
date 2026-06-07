export type ChatProvider = {
  model: string;
  apiUrl: string;
  apiKey?: string;
  timeoutMs: number;
};

export const AI_PRIMARY_API_KEY_ENV = "AI_PRIMARY_API_KEY";
export const AI_PRIMARY_API_URL_ENV = "AI_PRIMARY_API_URL";
export const AI_PRIMARY_MODEL_ENV = "AI_PRIMARY_MODEL";

const AI_PRIMARY_API_URL = "https://api.dstopology.com";
const AI_PRIMARY_MODEL = "gpt-5.5";
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

export function getChatProviders(timeoutMs: number): ChatProvider[] {
  const primaryApiUrl = normalizeChatCompletionsUrl(
    readEnv(process.env.AI_PRIMARY_API_URL) || AI_PRIMARY_API_URL,
  );
  const primaryApiKey = readEnv(process.env.AI_PRIMARY_API_KEY);
  const primaryModel = readEnv(process.env.AI_PRIMARY_MODEL) || AI_PRIMARY_MODEL;

  const deepseekApiKey = readEnv(process.env.DEEPSEEK_API_KEY);
  const deepseekApiUrl = readEnv(process.env.DEEPSEEK_API_URL) || DEEPSEEK_API_URL;

  return [
    {
      model: DEEPSEEK_MODEL,
      apiUrl: deepseekApiUrl,
      apiKey: deepseekApiKey,
      timeoutMs,
    },
    {
      model: primaryModel,
      apiUrl: primaryApiUrl,
      apiKey: primaryApiKey,
      timeoutMs,
    },
  ];
}
