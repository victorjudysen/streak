import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE, createSessionToken, isValidSessionToken } from "@/lib/session";

const SECRET = "test-secret";

describe("session tokens", () => {
  it("accepts a token it created", () => {
    expect(isValidSessionToken(createSessionToken(SECRET), SECRET)).toBe(true);
  });

  it("rejects tampering, a different secret, and missing values", () => {
    const token = createSessionToken(SECRET);
    const [expires, signature] = token.split(".");
    expect(isValidSessionToken(`${Number(expires) + 999}.${signature}`, SECRET)).toBe(false);
    expect(isValidSessionToken(token, "other-secret")).toBe(false);
    expect(isValidSessionToken(undefined, SECRET)).toBe(false);
    expect(isValidSessionToken("garbage", SECRET)).toBe(false);
  });

  it("expires after the session lifetime", () => {
    const issued = Date.now();
    const token = createSessionToken(SECRET, issued);
    expect(isValidSessionToken(token, SECRET, issued + (SESSION_MAX_AGE - 60) * 1000)).toBe(true);
    expect(isValidSessionToken(token, SECRET, issued + (SESSION_MAX_AGE + 60) * 1000)).toBe(false);
  });
});
