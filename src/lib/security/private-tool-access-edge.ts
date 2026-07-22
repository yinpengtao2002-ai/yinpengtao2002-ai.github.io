import { PRIVATE_TOOL_ACCESS_HEADER } from "../private-tool-access/constants.ts";

function readTokenSecret() {
  return process.env.PRIVATE_TOOL_TOKEN_SECRET?.trim() || "";
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return encodeBase64Url(new Uint8Array(signature));
}

export function readPrivateToolAccessTokenFromHeaders(headers: Headers) {
  return headers.get(PRIVATE_TOOL_ACCESS_HEADER);
}

function decodePayload(encodedPayload: string) {
  try {
    const base64 = encodedPayload.replaceAll("-", "+").replaceAll("_", "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(`${base64}${padding}`);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
    return payload.v === 1 &&
      typeof payload.aud === "string" &&
      Array.isArray(payload.scope) &&
      payload.scope.every((item) => typeof item === "string") &&
      typeof payload.iat === "number" &&
      typeof payload.exp === "number"
      ? payload as { v: 1; aud: string; scope: string[]; iat: number; exp: number }
      : null;
  } catch {
    return null;
  }
}

export async function verifyPrivateToolAccessTokenForMiddleware(
  token: unknown,
  now = Date.now(),
  expectation: { audience?: string; scope?: string } = {},
) {
  const secret = readTokenSecret();

  if (!secret || typeof token !== "string") {
    return false;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  const payload = encodedPayload ? decodePayload(encodedPayload) : null;

  if (!encodedPayload || !signature || extra || !payload || payload.exp * 1000 < now) {
    return false;
  }

  if (expectation.audience && payload.aud !== expectation.audience) return false;
  if (expectation.scope && !payload.scope.includes(expectation.scope)) return false;

  return safeEqual(signature, await sign(encodedPayload, secret));
}
