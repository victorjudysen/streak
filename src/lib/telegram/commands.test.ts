import { describe, expect, it } from "vitest";
import { parseCommand, parseNumbers } from "@/lib/telegram/commands";

describe("parseCommand", () => {
  it("treats plain text as a new task", () => {
    expect(parseCommand("Call the bank")).toEqual({ kind: "add", titles: ["Call the bank"] });
  });

  it("adds one task per line and strips list bullets", () => {
    expect(parseCommand("- Call the bank\n2. Buy milk\n\n• Gym")).toEqual({
      kind: "add",
      titles: ["Call the bank", "Buy milk", "Gym"],
    });
  });

  it("supports /add, and commands addressed to the bot by name", () => {
    expect(parseCommand("/add Buy milk")).toEqual({ kind: "add", titles: ["Buy milk"] });
    expect(parseCommand("/done@StreakBot 2")).toEqual({ kind: "done", targets: [2] });
  });

  it("understands list, done, undo and remove", () => {
    expect(parseCommand("/list")).toEqual({ kind: "list" });
    expect(parseCommand("/today")).toEqual({ kind: "list" });
    expect(parseCommand("/done 1 3")).toEqual({ kind: "done", targets: [1, 3] });
    expect(parseCommand("/done all")).toEqual({ kind: "done", targets: "all" });
    expect(parseCommand("/undo 2")).toEqual({ kind: "undo", targets: [2] });
    expect(parseCommand("/delete 4")).toEqual({ kind: "remove", targets: [4] });
  });

  it("explains mistakes instead of guessing", () => {
    expect(parseCommand("/done")).toHaveProperty("kind", "invalid");
    expect(parseCommand("/done two")).toHaveProperty("kind", "invalid");
    expect(parseCommand("/add")).toHaveProperty("kind", "invalid");
    expect(parseCommand("/dance")).toHaveProperty("kind", "invalid");
  });

  it("shows help for /start and /help", () => {
    expect(parseCommand("/start")).toEqual({ kind: "help" });
    expect(parseCommand("/help")).toEqual({ kind: "help" });
  });
});

describe("parseNumbers", () => {
  it("accepts spaces, commas and ranges, without duplicates", () => {
    expect(parseNumbers("3, 1 2-4")).toEqual([1, 2, 3, 4]);
  });
  it("rejects zero, words and backwards ranges", () => {
    expect(parseNumbers("0")).toBeNull();
    expect(parseNumbers("one")).toBeNull();
    expect(parseNumbers("4-2")).toBeNull();
  });
});
