// A signed "you are logged in" cookie. The value is `<expiry>.<version>.<signature>`;
// only the server knows SESSION_SECRET, so a visitor cannot forge or extend it.
// `version` is the password version it was issued under — changing the password
// bumps the version, which signs out every cookie issued before the change.

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

export function createSessionToken(
  version: number,
  secret = process.env.SESSION_SECRET,
  now = Date.now(),
): string {
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const payload = `${Math.floor(now / 1000) + SESSION_MAX_AGE}.${version}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** The password version a valid, unexpired token was issued under, or null. */
export function readSessionToken(
  token: string | undefined,
  secret = process.env.SESSION_SECRET,
  now = Date.now(),
): number | null {
  if (!token || !secret) return null;
  const [expires, version, signature] = token.split(".");
  if (!expires || !version || !signature) return null;
  if (!safeEqual(signature, sign(`${expires}.${version}`, secret))) return null;
  if (Number(expires) * 1000 <= now) return null;
  return Number(version);
}

/** Compares against APP_PASSWORD, the starting password before one is set in the app. */
export function matchesEnvPassword(attempt: string): boolean {
  const password = process.env.APP_PASSWORD;
  if (!password) return false;
  // Compare fixed-length digests so the comparison time does not leak the length.
  const digest = (value: string) => createHmac("sha256", "streak-password").update(value).digest();
  return timingSafeEqual(digest(attempt), digest(password));
}
