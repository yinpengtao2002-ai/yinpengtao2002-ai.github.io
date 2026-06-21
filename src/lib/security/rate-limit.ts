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

function getStore() {
  const globalStore = globalThis as GlobalWithRateLimitStore;
  globalStore.__lucasRateLimitStore__ ??= new Map<string, RateLimitBucket>();
  return globalStore.__lucasRateLimitStore__;
}

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  const cloudflareIp = req.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cloudflareIp || "unknown";
}

function buildRateLimitResponse(options: RateLimitOptions, resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return Response.json(
    {
      error: "Too many requests. Please retry later.",
      errorCode: "rate_limited",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(options.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}

export function enforceRateLimit(req: Request, options: RateLimitOptions) {
  const now = Date.now();
  const store = getStore();
  const key = `${options.keyPrefix}:${getClientIp(req)}`;
  const current = store.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : current;

  bucket.count += 1;
  store.set(key, bucket);

  if (bucket.count > options.limit) {
    return buildRateLimitResponse(options, bucket.resetAt);
  }

  return null;
}

export function resetRateLimitForTests() {
  getStore().clear();
}
