import { createHmac, timingSafeEqual } from "node:crypto";
import {
  LEGACY_FINANCE_AI_ACCESS_HEADER,
  PRIVATE_TOOL_ACCESS_HEADER,
} from "../private-tool-access/constants.ts";

export {
  LEGACY_FINANCE_AI_ACCESS_HEADER,
  PRIVATE_TOOL_ACCESS_HEADER,
};

const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

function readAccessKey() {
  return process.env.PRIVATE_TOOL_ACCESS_KEY?.trim() || process.env.FINANCE_AI_ACCESS_KEY?.trim() || "";
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
  return Boolean(readAccessKey());
}

export function isPrivateToolAccessKeyValid(key: unknown) {
  const secret = readAccessKey();

  if (!secret || typeof key !== "string") {
    return false;
  }

  return safeEqual(key.trim(), secret);
}

export function createPrivateToolAccessToken(now = Date.now()) {
  const secret = readAccessKey();

  if (!secret) {
    throw new Error("PRIVATE_TOOL_ACCESS_KEY is not configured.");
  }

  const expiresAt = now + TOKEN_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export function getPrivateToolAccessTokenExpiry(token: string) {
  const [payload] = token.split(".");
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) ? new Date(expiresAt) : null;
}

export function verifyPrivateToolAccessToken(token: unknown, now = Date.now()) {
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

export function readPrivateToolAccessToken(headers: Headers) {
  return headers.get(PRIVATE_TOOL_ACCESS_HEADER) ?? headers.get(LEGACY_FINANCE_AI_ACCESS_HEADER);
}
