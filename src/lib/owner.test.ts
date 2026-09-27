import { afterEach, describe, expect, it, vi } from "vitest";
import { localHour } from "@/lib/dates";
import { initials, ownerName, sourceCodeUrl } from "@/lib/owner";

afterEach(() => vi.unstubAllEnvs());

describe("owner", () => {
  it("builds initials from first and last names", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
    expect(initials("  grace   brewster murray hopper ")).toBe("GH");
    expect(initials("ada")).toBe("A");
    expect(initials("")).toBe("");
  });

  it("reads OWNER_NAME, empty when unset", () => {
    vi.stubEnv("OWNER_NAME", "  Ada Lovelace ");
    expect(ownerName()).toBe("Ada Lovelace");
    vi.stubEnv("OWNER_NAME", "");
    expect(ownerName()).toBe("");
  });

  it("links to this repository unless SOURCE_CODE_URL points at a fork", () => {
    vi.stubEnv("SOURCE_CODE_URL", "");
    expect(sourceCodeUrl()).toBe("https://github.com/victorjudysen/streak");
    vi.stubEnv("SOURCE_CODE_URL", "https://example.com/my-fork");
    expect(sourceCodeUrl()).toBe("https://example.com/my-fork");
  });
});

describe("localHour (morning message timing)", () => {
  const sixUtc = new Date("2026-09-27T06:00:00Z");

  it("is 9 in Dar es Salaam at 06:00 UTC", () => {
    expect(localHour(sixUtc, "Africa/Dar_es_Salaam")).toBe(9);
  });

  it("follows daylight saving and half-hour zones", () => {
    expect(localHour(new Date("2026-07-01T08:00:00Z"), "Europe/London")).toBe(9); // BST, UTC+1
    expect(localHour(new Date("2026-01-15T09:00:00Z"), "Europe/London")).toBe(9); // GMT
    expect(localHour(new Date("2026-09-27T03:00:00Z"), "Asia/Kolkata")).toBe(8); // 08:30 → hour 8
    expect(localHour(new Date("2026-09-27T04:00:00Z"), "Asia/Kolkata")).toBe(9); // 09:30 → hour 9
  });

  it("uses 0–23, not 24, at midnight", () => {
    expect(localHour(new Date("2026-09-27T00:00:00Z"), "UTC")).toBe(0);
  });
});
