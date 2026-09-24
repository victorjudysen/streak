import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE, createSessionToken, readSessionToken } from "@/lib/session";

const SECRET = "test-secret";

describe("session tokens", () => {
  it("returns the password version a token was issued under", () => {
    expect(readSessionToken(createSessionToken(0, SECRET), SECRET)).toBe(0);
    expect(readSessionToken(createSessionToken(3, SECRET), SECRET)).toBe(3);
  });

  it("rejects tampering, a different secret, and missing values", () => {
    const token = createSessionToken(1, SECRET);
    const [expires, version, signature] = token.split(".");
    expect(readSessionToken(`${Number(expires) + 999}.${version}.${signature}`, SECRET)).toBeNull();
    // Raising the version by hand must not survive the signature check.
    expect(readSessionToken(`${expires}.2.${signature}`, SECRET)).toBeNull();
    expect(readSessionToken(token, "other-secret")).toBeNull();
    expect(readSessionToken(undefined, SECRET)).toBeNull();
    expect(readSessionToken("garbage", SECRET)).toBeNull();
  });

  it("rejects the old two-part cookie format", () => {
    const [expires, , signature] = createSessionToken(0, SECRET).split(".");
    expect(readSessionToken(`${expires}.${signature}`, SECRET)).toBeNull();
  });

  it("expires after the session lifetime", () => {
    const issued = Date.now();
    const token = createSessionToken(0, SECRET, issued);
    expect(readSessionToken(token, SECRET, issued + (SESSION_MAX_AGE - 60) * 1000)).toBe(0);
    expect(readSessionToken(token, SECRET, issued + (SESSION_MAX_AGE + 60) * 1000)).toBeNull();
  });
});
