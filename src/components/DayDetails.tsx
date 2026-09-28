import Link from "next/link";
import { formatDay, formatTime } from "@/lib/dates";
import type { Task } from "@/lib/task-rules";

/**
 * The tasks completed on one day, opened by clicking its square on the activity
 * graph. Read-only: past days are closed, and today's list lives in the Today panel.
 */
export function DayDetails({
  day,
  today,
  tasks,
  closeHref,
}: {
  day: string;
  today: string;
  tasks: Task[];
  closeHref: string;
}) {
  const label = formatDay(day, {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(day.slice(0, 4) !== today.slice(0, 4) ? { year: "numeric" } : {}),
  });
  const count = `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} done`;

  return (
    <section className="day-details" aria-labelledby="day-details-heading">
      <div className="day-details-header">
        <h3 id="day-details-heading">
          {label}
          <span> · {count}</span>
        </h3>
        <Link className="day-details-close" href={closeHref} scroll={false} aria-label="Close this day">
          ×
        </Link>
      </div>

      {tasks.length === 0 ? (
        <p className="day-details-empty">No tasks done on {label}.</p>
      ) : (
        <ul className="day-details-list">
          {tasks.map((task) => (
            <li key={task.id}>
              <span className="day-details-check" aria-hidden="true">
                ✓
              </span>
              <span className="day-details-copy">
                <strong>
                  {task.title}
                  {task.routine_id ? <span className="routine-tag"> ↻ Routine</span> : null}
                </strong>
                <small>
                  {task.done_at ? formatTime(task.done_at) : null}
                  {task.source === "telegram" ? " · via Telegram" : ""}
                  {task.task_date !== day
                    ? ` · from ${formatDay(task.task_date, { weekday: "short", day: "numeric", month: "short" })}`
                    : ""}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
