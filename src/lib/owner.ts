// Who this Streak belongs to. Set OWNER_NAME (e.g. "Ada Lovelace") to personalise
// the header and page description; leave it empty for a neutral install.

export function ownerName(): string {
  return (process.env.OWNER_NAME ?? "").trim();
}

/** "Ada Lovelace" → "AL", "ada" → "A", "" → "". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => word[0]!.toUpperCase()).join("");
}

/** Where the source code lives — the AGPL asks that users of a hosted copy can get it. */
export function sourceCodeUrl(): string {
  return process.env.SOURCE_CODE_URL || "https://github.com/victorjudysen/streak";
}
