import { createHmac, timingSafeEqual } from "node:crypto";

export const FINANCE_AI_ACCESS_HEADER = "X-Finance-AI-Access";

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function readAccessKey() {
  return process.env.FINANCE_AI_ACCESS_KEY?.trim() || "";
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isFinanceAIAccessConfigured() {
  return Boolean(readAccessKey());
}

export function isFinanceAIAccessKeyValid(key: unknown) {
  const secret = readAccessKey();

  if (!secret || typeof key !== "string") {
    return false;
  }

  return safeEqual(key.trim(), secret);
}

export function createFinanceAIAccessToken(now = Date.now()) {
  const secret = readAccessKey();

  if (!secret) {
    throw new Error("FINANCE_AI_ACCESS_KEY is not configured.");
  }

  const expiresAt = now + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function getFinanceAIAccessTokenExpiry(token: string) {
  const [payload] = token.split(".");
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) ? new Date(expiresAt) : null;
}

export function verifyFinanceAIAccessToken(token: unknown, now = Date.now()) {
  const secret = readAccessKey();

  if (!secret || typeof token !== "string") {
    return false;
  }

  const [payload, signature] = token.split(".");
  const expiresAt = Number(payload);

  if (!payload || !signature || !Number.isFinite(expiresAt) || expiresAt < now) {
    return false;
  }

  return safeEqual(signature, sign(payload, secret));
}
