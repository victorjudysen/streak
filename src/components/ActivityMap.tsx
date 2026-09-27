"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { describeDay, type Calendar } from "@/lib/stats";

const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

interface Tooltip {
  text: string;
  x: number;
  y: number;
}

/**
 * A GitHub-style contribution graph: fixed square cells, Sunday-first weeks,
 * relative shading, month labels, a dark hover tooltip and a Less → More legend.
 */
export function ActivityMap({ calendar, rangeLabel }: { calendar: Calendar; rangeLabel: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);

  // Like GitHub on narrow screens, open scrolled to the most recent weeks.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (scroller) scroller.scrollLeft = scroller.scrollWidth;
  }, [calendar]);

  const show = (event: MouseEvent<HTMLDivElement>) => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-date]");
    const wrap = wrapRef.current;
    if (!cell || !wrap) return setTooltip(null);
    const day = calendar.cells.find((c) => c?.date === cell.dataset.date);
    if (!day) return setTooltip(null);
    const cellBox = cell.getBoundingClientRect();
    const wrapBox = wrap.getBoundingClientRect();
    setTooltip({
      text: describeDay(day),
      x: cellBox.left + cellBox.width / 2 - wrapBox.left,
      y: cellBox.top - wrapBox.top,
    });
  };

  return (
    <div className="graph" ref={wrapRef} onMouseLeave={() => setTooltip(null)}>
      <div className="graph-scroll" ref={scrollRef} onScroll={() => setTooltip(null)}>
        <div className="graph-canvas" style={{ ["--weeks" as string]: calendar.weeks }}>
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
            role="img"
            aria-label={`${calendar.total} tasks done in ${rangeLabel}. Darker squares mean more tasks done that day.`}
            onMouseOver={show}
            onClick={show}
          >
            {calendar.cells.map((cell, index) =>
              cell ? (
                <span key={cell.date} className="graph-day" data-date={cell.date} data-level={cell.level} />
              ) : (
                <span key={`pad-${index}`} className="graph-day is-padding" aria-hidden="true" />
              ),
            )}
          </div>
        </div>
      </div>

      <div className="graph-footer">
        <span className="graph-note">Counts the tasks you tick off each day.</span>
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
