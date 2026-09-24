// All "which day is it?" questions are answered in Victor's configured time zone,
// never the server's. A day is represented as an ISO date string: "2026-09-24".

export const DEFAULT_TIME_ZONE = "Africa/Dar_es_Salaam";

export function timeZone(): string {
  return process.env.STREAK_TIMEZONE || DEFAULT_TIME_ZONE;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function isoFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formatters.set(zone, formatter);
  }
  return formatter;
}

/** The calendar day an instant falls on in the given time zone. */
export function localDate(instant: Date | string, zone = timeZone()): string {
  return isoFormatter(zone).format(typeof instant === "string" ? new Date(instant) : instant);
}

export function today(zone = timeZone()): string {
  return localDate(new Date(), zone);
}

/** Calendar arithmetic on ISO dates, independent of any time zone. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(isoDate: string): number {
  return (new Date(`${isoDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export function formatDay(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

export function formatTime(instant: string, zone = timeZone()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instant));
}
