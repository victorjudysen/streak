"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  dashboardHref,
  describeDay,
  nextFocusDay,
  type Calendar,
  type CalendarDay,
  type CalendarRange,
} from "@/lib/stats";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface Tooltip {
  text: string;
  x: number;
  y: number;
}

/**
 * A GitHub-style contribution graph: fixed square cells, Sunday-first weeks,
 * relative shading, month labels, a dark tooltip and a Less → More legend.
 * Click (or Enter on) a square to list that day's tasks; arrow keys move between days.
 */
export function ActivityMap({
  calendar,
  rangeLabel,
  range,
  year,
  selectedDay,
}: {
  calendar: Calendar;
  rangeLabel: string;
  range: CalendarRange;
  year: number | null;
  selectedDay: string | null;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  // Only one square is in the tab order at a time; arrow keys move it.
  const [focusDay, setFocusDay] = useState(selectedDay ?? range.end);

  // Like GitHub on narrow screens, open scrolled to the most recent weeks.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [calendar]);

  const days = new Map<string, CalendarDay>();
  for (const cell of calendar.cells) if (cell) days.set(cell.date, cell);

  const cellFor = (date: string) => wrapRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`) ?? null;

  const showTooltip = (element: HTMLElement | null) => {
    const wrap = wrapRef.current;
    const day = element?.dataset.date ? days.get(element.dataset.date) : undefined;
    if (!element || !wrap || !day) return setTooltip(null);
    const cellBox = element.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    setTooltip({
      text: describeDay(day),
      x: cellBox.left + cellBox.width / 2 - wrapBox.left,
      y: cellBox.top - wrapBox.top,
    });
  };

  /** Opens a day's task list, or closes it if that day is already open. */
  const select = (date: string) => {
    setFocusDay(date);
    router.push(dashboardHref(year, date === selectedDay ? null : date), { scroll: false });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      return select(focusDay);
    }
    const next = nextFocusDay(focusDay, event.key, range);
    if (next === focusDay) return;
    event.preventDefault();
    setFocusDay(next);
    const element = cellFor(next);
    element?.focus();
    showTooltip(element);
  };

  return (
    <div className="graph" ref={wrapRef} onMouseLeave={() => setTooltip(null)}>
      <div className="graph-scroll" ref={scrollRef} onScroll={() => setTooltip(null)}>
        <div className="graph-canvas" style={{ ["--weeks" as string]: calendar.weeks }}>
          {/* Pinned corner: month names scroll away behind it, like the weekday labels. */}
          <span className="graph-corner" aria-hidden="true" />
          <div className="graph-months" aria-hidden="true">
            {calendar.months.map(({ label, column }) => (
              <span key={`${label}-${column}`} style={{ gridColumnStart: column }}>
                {label}
              </span>
            ))}
          </div>
          <div className="graph-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
          <div
            className="graph-days"
            role="group"
            aria-label={`${calendar.total} tasks done in ${rangeLabel}. Darker squares mean more tasks done that day. Use the arrow keys to move between days and Enter to list a day's tasks.`}
            onMouseOver={(event) => showTooltip((event.target as HTMLElement).closest<HTMLElement>("[data-date]"))}
            onKeyDown={onKeyDown}
          >
            {calendar.cells.map((cell, index) =>
              cell ? (
                <span
                  key={cell.date}
                  role="button"
                  tabIndex={cell.date === focusDay ? 0 : -1}
                  aria-label={describeDay(cell)}
                  aria-pressed={cell.date === selectedDay}
                  className={cell.date === selectedDay ? "graph-day is-selected" : "graph-day"}
                  data-date={cell.date}
                  data-level={cell.level}
                  onClick={(event) => {
                    showTooltip(event.currentTarget);
                    select(cell.date);
                  }}
                  onFocus={(event) => showTooltip(event.currentTarget)}
                  onBlur={() => setTooltip(null)}
                />
              ) : (
                <span key={`pad-${index}`} className="graph-day is-padding" aria-hidden="true" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="graph-footer">
        <span className="graph-note">Counts the tasks you tick off each day. Click a day to see them.</span>
        <span className="graph-legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <i key={level} data-level={level} />
          ))}
          More
        </span>
      </div>

      {tooltip ? (
        <div className="graph-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      ) : null}
    </div>
  );
}
