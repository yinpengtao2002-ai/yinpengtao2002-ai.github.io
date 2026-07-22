type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type GlobalWithRateLimitStore = typeof globalThis & {
  __lucasRateLimitStore__?: Map<string, RateLimitBucket>;
};

export type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type RateLimitBackendStatus =
  | { mode: "memory" }
  | { mode: "upstash" }
  | { mode: "unavailable"; reason: "missing_upstash_configuration" };

type RateLimitIncrement = {
  count: number;
  ttlMs: number;
};

const ATOMIC_INCREMENT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "return {count, ttl}",
].join("\n");

function readEnv(env: NodeJS.ProcessEnv, key: string) {
  return env[key]?.trim() || "";
}

export function getRateLimitBackendStatus(env: NodeJS.ProcessEnv = process.env): RateLimitBackendStatus {
  const url = readEnv(env, "UPSTASH_REDIS_REST_URL");
  const token = readEnv(env, "UPSTASH_REDIS_REST_TOKEN");
  if (url && token) return { mode: "upstash" };
  if (env.NODE_ENV === "production") {
    return { mode: "unavailable", reason: "missing_upstash_configuration" };
  }
  return { mode: "memory" };
}

function getMemoryStore() {
  const globalStore = globalThis as GlobalWithRateLimitStore;
  globalStore.__lucasRateLimitStore__ ??= new Map<string, RateLimitBucket>();
  return globalStore.__lucasRateLimitStore__;
}

function getClientIp(req: Request) {
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();
  return vercelForwardedFor || cloudflareIp || realIp || forwardedFor || "unknown";
}

function getMemoryIncrement(key: string, windowMs: number): RateLimitIncrement {
  const now = Date.now();
  const store = getMemoryStore();
  const current = store.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  bucket.count += 1;
  store.set(key, bucket);
  return { count: bucket.count, ttlMs: Math.max(1, bucket.resetAt - now) };
}

async function getUpstashIncrement(key: string, windowMs: number): Promise<RateLimitIncrement> {
  const url = readEnv(process.env, "UPSTASH_REDIS_REST_URL").replace(/\/+$/, "");
  const token = readEnv(process.env, "UPSTASH_REDIS_REST_TOKEN");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["EVAL", ATOMIC_INCREMENT_SCRIPT, "1", key, String(windowMs)]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit request failed with ${response.status}`);
  }
  const payload = await response.json() as { result?: unknown };
  if (!Array.isArray(payload.result) || payload.result.length < 2) {
    throw new Error("Upstash rate limit response was invalid");
  }
  const count = Number(payload.result[0]);
  const ttlMs = Number(payload.result[1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttlMs)) {
    throw new Error("Upstash rate limit response was invalid");
  }
  return { count, ttlMs: Math.max(1, ttlMs) };
}

function buildRateLimitResponse(options: RateLimitOptions, resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const requestId = crypto.randomUUID();
  return Response.json(
    {
      errorCode: "rate_limited",
      message: "请求过于频繁，请稍后重试。",
      requestId,
      retryAfter: retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfterSeconds),
        "X-Request-Id": requestId,
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}

function buildUnavailableResponse() {
  const requestId = crypto.randomUUID();
  return Response.json(
    {
      errorCode: "rate_limit_unavailable",
      message: "服务保护组件暂时不可用，请稍后重试。",
      requestId,
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}

export async function enforceRateLimit(req: Request, options: RateLimitOptions) {
  const backend = getRateLimitBackendStatus();
  if (backend.mode === "unavailable") return buildUnavailableResponse();

  const key = `rate-limit:${options.keyPrefix}:${getClientIp(req)}`;
  try {
    const increment = backend.mode === "upstash"
      ? await getUpstashIncrement(key, options.windowMs)
      : getMemoryIncrement(key, options.windowMs);
    if (increment.count > options.limit) {
      return buildRateLimitResponse(options, Date.now() + increment.ttlMs);
    }
    return null;
  } catch (error) {
    console.error(JSON.stringify({
      event: "rate_limit_backend_error",
      keyPrefix: options.keyPrefix,
      error: error instanceof Error ? error.message : "unknown error",
    }));
    return buildUnavailableResponse();
  }
}

export function resetRateLimitForTests() {
  getMemoryStore().clear();
}
