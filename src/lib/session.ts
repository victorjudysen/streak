// A signed "you are logged in" cookie. The value is `<expiry>.<signature>`; only the
// server knows SESSION_SECRET, so a visitor cannot forge or extend it.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "streak_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createSessionToken(secret = process.env.SESSION_SECRET, now = Date.now()): string {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const expires = String(Math.floor(now / 1000) + SESSION_MAX_AGE);
  return `${expires}.${sign(expires, secret)}`;
}

export function isValidSessionToken(
  token: string | undefined,
  secret = process.env.SESSION_SECRET,
  now = Date.now(),
): boolean {
  if (!token || !secret) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !safeEqual(signature, sign(expires, secret))) return false;
  return Number(expires) * 1000 > now;
}

export function isCorrectPassword(attempt: string): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  // Compare fixed-length digests so the comparison time does not leak the length.
  const digest = (value: string) => createHmac("sha256", "streak-password").update(value).digest();
  return timingSafeEqual(digest(attempt), digest(password));
}
