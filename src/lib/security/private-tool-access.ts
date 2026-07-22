import { createHmac, timingSafeEqual } from "node:crypto";
import { PRIVATE_TOOL_ACCESS_HEADER } from "../private-tool-access/constants.ts";

export { PRIVATE_TOOL_ACCESS_HEADER };

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;
const TOKEN_AUDIENCE = "lucas-private-tools";
const TOKEN_SCOPES = [
  "lucas:stock-decision",
  "finance:profit-structure",
  "finance:perspective-bi",
] as const;

export type PrivateToolAccessTokenPayload = {
  v: 1;
  aud: string;
  scope: string[];
  iat: number;
  exp: number;
};

export type PrivateToolTokenExpectation = {
  audience?: string;
  scope?: string;
};

function readAccessKey() {
  return process.env.PRIVATE_TOOL_ACCESS_KEY?.trim() || "";
}

function readTokenSecret() {
  return process.env.PRIVATE_TOOL_TOKEN_SECRET?.trim() || "";
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isPrivateToolAccessConfigured() {
  return Boolean(readAccessKey() && readTokenSecret());
}

export function isPrivateToolAccessKeyValid(key: unknown) {
  const secret = readAccessKey();

  if (!secret || typeof key !== "string") {
    return false;
  }

  return safeEqual(key.trim(), secret);
}

export function createPrivateToolAccessToken(now = Date.now()) {
  const secret = readTokenSecret();

  if (!secret) {
    throw new Error("PRIVATE_TOOL_TOKEN_SECRET is not configured.");
  }

  const payload: PrivateToolAccessTokenPayload = {
    v: 1,
    aud: TOKEN_AUDIENCE,
    scope: [...TOKEN_SCOPES],
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + TOKEN_TTL_MS) / 1000),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function decodePrivateToolAccessToken(token: string): PrivateToolAccessTokenPayload | null {
  const [encodedPayload] = token.split(".");
  if (!encodedPayload) return null;
  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<PrivateToolAccessTokenPayload>;
    if (
      payload.v !== 1 ||
      typeof payload.aud !== "string" ||
      !Array.isArray(payload.scope) ||
      !payload.scope.every((item) => typeof item === "string") ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    return payload as PrivateToolAccessTokenPayload;
  } catch {
    return null;
  }
}

export function getPrivateToolAccessTokenExpiry(token: string) {
  const payload = decodePrivateToolAccessToken(token);
  return payload ? new Date(payload.exp * 1000) : null;
}

export function verifyPrivateToolAccessToken(
  token: unknown,
  now = Date.now(),
  expectation: PrivateToolTokenExpectation = {},
) {
  const secret = readTokenSecret();

  if (!secret || typeof token !== "string") {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  const payload = decodePrivateToolAccessToken(token);

  if (!encodedPayload || !signature || extra || !payload || payload.exp * 1000 < now) {
    return false;
  }

  if (expectation.audience && payload.aud !== expectation.audience) return false;
  if (expectation.scope && !payload.scope.includes(expectation.scope)) return false;

  return safeEqual(signature, sign(encodedPayload, secret));
}

export function readPrivateToolAccessToken(headers: Headers) {
  return headers.get(PRIVATE_TOOL_ACCESS_HEADER);
}
