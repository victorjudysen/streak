import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { validateNewPassword } from "@/lib/password-rules";

describe("password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    const stored = await hashPassword("correct horse battery");
    expect(stored.startsWith("scrypt$")).toBe(true);
    expect(stored).not.toContain("correct horse battery");
    expect(await verifyPassword("correct horse battery", stored)).toBe(true);
    expect(await verifyPassword("correct horse batterY", stored)).toBe(false);
  });

  it("salts each hash, so the same password never hashes the same way twice", async () => {
    expect(await hashPassword("same-password")).not.toBe(await hashPassword("same-password"));
  });

  it("rejects malformed stored values", async () => {
    expect(await verifyPassword("anything", "plain-text")).toBe(false);
  });
});

describe("validateNewPassword", () => {
  it("requires a long enough, confirmed, different password", () => {
    expect(validateNewPassword("short", "short", "old-password")).toMatch(/at least/);
    expect(validateNewPassword("long-enough-1", "long-enough-2", "old-password")).toMatch(/match/);
    expect(validateNewPassword("old-password", "old-password", "old-password")).toMatch(/different/);
    expect(validateNewPassword("brand-new-password", "brand-new-password", "old-password")).toBeNull();
  });
});
