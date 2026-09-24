// Turns a Telegram message into a command. Pure parsing — nothing is changed here.
//
//   buy milk               → add "buy milk" (each line becomes its own task)
//   /add buy milk          → same
//   /list  or  /today      → show today's numbered list
//   /done 2   /done 1 3    → mark tasks done by their list number
//   /done all              → mark everything on the list done
//   /undo 2                → un-mark a task completed today
//   /remove 2  (/delete)   → remove a task (earlier unfinished tasks are let go)
//   /help  or  /start      → show these instructions

export type Command =
  | { kind: "add"; titles: string[] }
  | { kind: "list" }
  | { kind: "done"; targets: number[] | "all" }
  | { kind: "undo"; targets: number[] }
  | { kind: "remove"; targets: number[] }
  | { kind: "help" }
  | { kind: "invalid"; message: string };

const ALIASES: Record<string, "add" | "list" | "done" | "undo" | "remove" | "help"> = {
  add: "add",
  list: "list",
  today: "list",
  done: "done",
  check: "done",
  undo: "undo",
  remove: "remove",
  delete: "remove",
  help: "help",
  start: "help",
};

function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

/** "1 3", "1,3", "1, 3" and "2-4" are all accepted. */
export function parseNumbers(text: string): number[] | null {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const numbers = new Set<number>();
  for (const part of parts) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (from < 1 || to < from || to - from > 50) return null;
      for (let n = from; n <= to; n++) numbers.add(n);
    } else if (/^\d+$/.test(part) && Number(part) >= 1) {
      numbers.add(Number(part));
    } else {
      return null;
    }
  }
  return [...numbers].sort((a, b) => a - b);
}

export function parseCommand(text: string): Command {
  const trimmed = text.trim();
  if (!trimmed) return { kind: "help" };

  if (!trimmed.startsWith("/")) {
    return { kind: "add", titles: splitLines(trimmed) };
  }

  const match = trimmed.match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  const name = match ? ALIASES[match[1].toLowerCase()] : undefined;
  if (!match || !name) {
    return { kind: "invalid", message: "I don’t know that command. Send /help to see what I understand." };
  }
  const rest = (match[2] ?? "").trim();

  switch (name) {
    case "help":
      return { kind: "help" };
    case "list":
      return { kind: "list" };
    case "add": {
      const titles = splitLines(rest);
      return titles.length
        ? { kind: "add", titles }
        : { kind: "invalid", message: "Tell me what to add, e.g. /add Call the bank" };
    }
    case "done":
    case "undo":
    case "remove": {
      if (name === "done" && rest.toLowerCase() === "all") return { kind: "done", targets: "all" };
      const targets = parseNumbers(rest);
      if (!targets) {
        return { kind: "invalid", message: `Use the number from /list, e.g. /${name} 2` };
      }
      return { kind: name, targets };
    }
  }
}
