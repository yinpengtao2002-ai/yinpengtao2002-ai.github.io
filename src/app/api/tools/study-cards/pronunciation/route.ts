import { NextRequest } from "next/server";
import { getSpeechProvider, type SpeechProvider } from "@/lib/ai/providers";

const SPEECH_TIMEOUT_MS = 20000;
const PUBLIC_STUDY_CARDS_PRONUNCIATION_API_URL = "https://yinpengtao.cn/api/tools/study-cards/pronunciation/";
const DICTIONARY_API_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const WIKIMEDIA_COMMONS_API_URL = "https://commons.wikimedia.org/w/api.php";
const TTS_FALLBACK_MODELS = ["tts-1", "gpt-4o-mini-tts"];

type DictionaryEntry = {
  phonetics?: Array<{
    audio?: string;
  }>;
};

type PronunciationAudio = {
  audio: ArrayBuffer;
  contentType: string;
};

type WikimediaPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
  }>;
};

function hasConfiguredSpeechProvider(provider: SpeechProvider) {
  return Boolean(provider.apiKey && provider.apiUrl);
}

function shouldUsePublicDevProxy(req: NextRequest, provider: SpeechProvider) {
  const host = req.headers.get("host") || "";
  const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
  return process.env.NODE_ENV === "development" && isLocalhost && !hasConfiguredSpeechProvider(provider);
}

function sanitizePronunciationInput(value: unknown) {
  if (typeof value !== "string") return "";

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length > 60) return "";
  if (!/^[A-Za-z][A-Za-z' -]*$/.test(normalized)) return "";
  return normalized;
}

async function proxyToPublicPronunciationApi(word: string) {
  const response = await fetch(PUBLIC_STUDY_CARDS_PRONUNCIATION_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/*",
    },
    body: JSON.stringify({ word }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return Response.json(
      {
        error: detail.slice(0, 240) || "线上发音服务暂时不可用。",
        errorCode: "TTS_UPSTREAM_FAILED",
      },
      { status: response.status },
    );
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  return new Response(await response.arrayBuffer(), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function selectDictionaryAudio(entries: DictionaryEntry[]) {
  const audioUrls = entries
    .flatMap((entry) => entry.phonetics ?? [])
    .map((phonetic) => phonetic.audio?.trim() || "")
    .filter((url) => url.includes("media/pronunciations") && /\.mp3(?:$|\?)/i.test(url));

  return (
    audioUrls.find((url) => /-us\.mp3(?:$|\?)/i.test(url)) ||
    audioUrls.find((url) => /-uk\.mp3(?:$|\?)/i.test(url)) ||
    audioUrls[0] ||
    ""
  );
}

async function fetchAudioUrl(audioUrl: string): Promise<PronunciationAudio | null> {
  const audioResponse = await fetch(audioUrl, { headers: { Accept: "audio/*" } });
  if (!audioResponse.ok) return null;

  const contentType = audioResponse.headers.get("content-type") || "";
  if (!contentType.includes("audio/")) return null;

  return {
    audio: await audioResponse.arrayBuffer(),
    contentType,
  };
}

async function fetchDictionaryPronunciation(word: string): Promise<PronunciationAudio | null> {
  if (word.includes(" ")) return null;

  const lookupResponse = await fetch(`${DICTIONARY_API_URL}/${encodeURIComponent(word.toLowerCase())}`, {
    headers: { Accept: "application/json" },
  });
  if (!lookupResponse.ok) return null;

  const entries = (await lookupResponse.json().catch(() => null)) as DictionaryEntry[] | null;
  const audioUrl = Array.isArray(entries) ? selectDictionaryAudio(entries) : "";
  if (!audioUrl) return null;

  return fetchAudioUrl(audioUrl);
}

function selectWikimediaAudio(pages: WikimediaPage[], word: string) {
  const normalizedWord = word.toLowerCase().replace(/\s+/g, "_");
  const candidates = pages
    .map((page) => ({
      title: page.title || "",
      url: page.imageinfo?.[0]?.url || "",
    }))
    .filter((item) => item.url && /\.(?:oga|ogg|mp3|wav)(?:$|\?)/i.test(item.url));

  return (
    candidates.find((item) => item.title.toLowerCase() === `file:en-us-${normalizedWord}.oga`)?.url ||
    candidates.find((item) => item.title.toLowerCase() === `file:en-us-${normalizedWord}.ogg`)?.url ||
    candidates.find((item) => item.title.toLowerCase().startsWith("file:en-us-"))?.url ||
    candidates.find((item) => item.title.includes("LL-Q1860") && item.title.toLowerCase().includes(normalizedWord))?.url ||
    candidates.find((item) => item.title.toLowerCase().includes(normalizedWord))?.url ||
    ""
  );
}

async function fetchWikimediaCommonsPronunciation(word: string): Promise<PronunciationAudio | null> {
  if (word.includes(" ")) return null;

  const query = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: `File:En-us-${word.toLowerCase()}.oga OR File:En-us-${word.toLowerCase()}.ogg OR LL-Q1860 eng ${word.toLowerCase()}`,
    prop: "imageinfo",
    iiprop: "url",
    origin: "*",
  });

  const response = await fetch(`${WIKIMEDIA_COMMONS_API_URL}?${query.toString()}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as { query?: { pages?: Record<string, WikimediaPage> } } | null;
  const pages = Object.values(payload?.query?.pages ?? {});
  const audioUrl = selectWikimediaAudio(pages, word);
  if (!audioUrl) return null;

  return fetchAudioUrl(audioUrl);
}

async function callSpeechProvider(provider: SpeechProvider, word: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), provider.timeoutMs);

  try {
    const response = await fetch(provider.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model: provider.model,
        voice: provider.voice,
        input: word,
        response_format: "mp3",
        speed: 0.9,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail.slice(0, 500) || `Upstream responded with ${response.status}`);
    }

    return {
      audio: await response.arrayBuffer(),
      contentType: response.headers.get("content-type") || "audio/mpeg",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callSpeechProviderWithFallbackModels(provider: SpeechProvider, word: string) {
  const models = Array.from(new Set([provider.model, ...TTS_FALLBACK_MODELS].filter(Boolean)));
  let lastError: unknown = null;

  for (const model of models) {
    try {
      return await callSpeechProvider({ ...provider, model }, word);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("发音服务暂时不可用。");
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as { word?: unknown } | null;
  const word = sanitizePronunciationInput(payload?.word);
  if (!word) {
    return Response.json({ error: "请输入需要朗读的英文单词。", errorCode: "INVALID_WORD" }, { status: 400 });
  }

  const provider = getSpeechProvider(SPEECH_TIMEOUT_MS);
  if (shouldUsePublicDevProxy(req, provider)) {
    return proxyToPublicPronunciationApi(word);
  }

  const dictionaryAudio = await fetchDictionaryPronunciation(word);
  if (dictionaryAudio) {
    return new Response(dictionaryAudio.audio, {
      headers: {
        "Content-Type": dictionaryAudio.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const wikimediaAudio = await fetchWikimediaCommonsPronunciation(word);
  if (wikimediaAudio) {
    return new Response(wikimediaAudio.audio, {
      headers: {
        "Content-Type": wikimediaAudio.contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  if (!hasConfiguredSpeechProvider(provider)) {
    return Response.json({ error: "当前环境没有配置发音服务。", errorCode: "TTS_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const audio = await callSpeechProviderWithFallbackModels(provider, word);
    const contentType = audio.contentType;
    return new Response(audio.audio, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "发音服务暂时不可用。";
    return Response.json(
      {
        error: message,
        errorCode: "TTS_UPSTREAM_FAILED",
      },
      { status: 502 },
    );
  }
}
