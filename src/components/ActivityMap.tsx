import { formatDay } from "@/lib/dates";
import { MAP_WEEKS, monthLabels, type MapDay } from "@/lib/stats";

function describe(day: MapDay): string {
  const date = formatDay(day.date, { day: "numeric", month: "short", year: "numeric" });
  if (day.isFuture) return date;
  return `${date}: ${day.count} task${day.count === 1 ? "" : "s"} done`;
}

export function ActivityMap({ days }: { days: MapDay[] }) {
  const labels = monthLabels(days);
  return (
    <div className="heatmap-frame">
      <div className="month-labels" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${MAP_WEEKS}, 1fr)` }}>
        {labels.map(({ label, column }) => (
          <span key={`${label}-${column}`} style={{ gridColumnStart: column }}>
            {label}
          </span>
        ))}
      </div>
      <div className="heatmap-body">
        <div className="weekday-labels" aria-hidden="true">
          <span>Mon</span>
          <span />
          <span>Wed</span>
          <span />
          <span>Fri</span>
          <span />
          <span />
        </div>
        <div
          className="heatmap"
          role="img"
          aria-label="Tasks completed each day over the last year. Darker squares mean more tasks done."
        >
          {days.map((day) => (
            <span
              key={day.date}
              className={`day-cell${day.isToday ? " is-today" : ""}${day.isFuture ? " is-future" : ""}`}
              data-level={day.level}
              title={describe(day)}
            />
          ))}
        </div>
      </div>
      <div className="map-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} data-level={level} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
