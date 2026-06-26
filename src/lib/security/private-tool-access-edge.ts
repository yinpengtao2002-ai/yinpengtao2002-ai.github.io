import {
  LEGACY_FINANCE_AI_ACCESS_HEADER,
  PRIVATE_TOOL_ACCESS_HEADER,
} from "../private-tool-access/constants.ts";

function readAccessKey() {
  return process.env.PRIVATE_TOOL_ACCESS_KEY?.trim() || process.env.FINANCE_AI_ACCESS_KEY?.trim() || "";
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
  return headers.get(PRIVATE_TOOL_ACCESS_HEADER) ?? headers.get(LEGACY_FINANCE_AI_ACCESS_HEADER);
}

export async function verifyPrivateToolAccessTokenForMiddleware(token: unknown, now = Date.now()) {
  const secret = readAccessKey();

  if (!secret || typeof token !== "string") {
    return false;
  }

  const [payload, signature] = token.split(".");
  const expiresAt = Number(payload);

  if (!payload || !signature || !Number.isFinite(expiresAt) || expiresAt < now) {
    return false;
  }

  return safeEqual(signature, await sign(payload, secret));
}
