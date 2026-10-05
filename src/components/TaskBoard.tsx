"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { addTaskAction, removeTaskAction, setTaskDoneAction, type FormState } from "@/app/actions";
import { MAX_TITLE_LENGTH } from "@/lib/task-rules";

export interface TaskView {
  id: string;
  title: string;
  done: boolean;
  /** "08:14" when completed today. */
  doneTime: string | null;
  /** "Tue 22 Sep" when carried over from an earlier day. */
  carriedFrom: string | null;
  fromTelegram: boolean;
  /** Created from a routine (recurring task). */
  isRoutine: boolean;
}

/** A task planned for a later day. */
export interface UpcomingView {
  id: string;
  title: string;
  /** ISO day, e.g. "2026-10-09". */
  day: string;
  /** "Tomorrow", "Fri 9 Oct". */
  dayLabel: string;
}

type Change = { id: string; type: "toggle"; done: boolean } | { id: string; type: "remove" };

export function TaskBoard({
  tasks,
  upcoming,
  today,
  lastDay,
}: {
  tasks: TaskView[];
  upcoming: UpcomingView[];
  /** Today's ISO date, the earliest day a task can be added for. */
  today: string;
  /** The latest day a task can be scheduled for. */
  lastDay: string;
}) {
  const [day, setDay] = useState(today);
  const [optimisticUpcoming, removeUpcoming] = useOptimistic(upcoming, (current, id: string) =>
    current.filter((task) => task.id !== id),
  );
  const [addState, addAction, adding] = useActionState<FormState, FormData>(addTaskAction, {});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(tasks, (current, change: Change) =>
    change.type === "remove"
      ? current.filter((task) => task.id !== change.id)
      : current.map((task) => (task.id === change.id ? { ...task, done: change.done } : task)),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const wasAdding = useRef(false);

  // The input is disabled while saving, which drops focus; give it back so the
  // next task can be typed straight away. Never on first load (mobile keyboards).
  useEffect(() => {
    if (wasAdding.current && !adding && !addState.error) inputRef.current?.focus();
    wasAdding.current = adding;
  }, [adding, addState]);

  const run = (change: Change, action: () => Promise<FormState>) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  const removeScheduled = (id: string) => {
    setError(null);
    startTransition(async () => {
      removeUpcoming(id);
      const result = await removeTaskAction(id);
      if (result.error) setError(result.error);
    });
  };

  // Upcoming tasks grouped by day, in date order.
  const upcomingDays: { day: string; label: string; tasks: UpcomingView[] }[] = [];
  for (const task of optimisticUpcoming) {
    const group = upcomingDays.at(-1);
    if (group?.day === task.day) group.tasks.push(task);
    else upcomingDays.push({ day: task.day, label: task.dayLabel, tasks: [task] });
  }

  const open = optimistic.filter((task) => !task.done);
  const done = optimistic.filter((task) => task.done);

  const renderTask = (task: TaskView) => (
    <li key={task.id} className={task.done ? "task is-complete" : "task"}>
      <button
        type="button"
        className="task-check"
        aria-pressed={task.done}
        aria-label={task.done ? `Untick “${task.title}”` : `Tick off “${task.title}”`}
        onClick={() =>
          run({ id: task.id, type: "toggle", done: !task.done }, () => setTaskDoneAction(task.id, !task.done))
        }
      >
        <span className="check-mark" aria-hidden="true">
          {task.done ? "✓" : ""}
        </span>
        <span className="task-copy">
          <strong>{task.title}</strong>
          <small>
            {task.carriedFrom ? <span className="carried">From {task.carriedFrom}</span> : null}
            {task.isRoutine ? <span className="routine-tag">↻ Routine</span> : null}
            {task.fromTelegram ? <span>via Telegram</span> : null}
          </small>
        </span>
        <span className="task-time">{task.done ? (task.doneTime ?? "Now") : "—"}</span>
      </button>
      <button
        type="button"
        className="task-remove"
        aria-label={
          task.carriedFrom
            ? `Let go of “${task.title}”`
            : task.isRoutine
              ? `Skip “${task.title}” today`
              : `Remove “${task.title}”`
        }
        title={task.carriedFrom ? "Let go (kept on record)" : task.isRoutine ? "Skip today" : "Remove"}
        onClick={() => run({ id: task.id, type: "remove" }, () => removeTaskAction(task.id))}
      >
        ×
      </button>
    </li>
  );

  const doneCount = optimistic.filter((task) => task.done).length;
  const percent = optimistic.length ? Math.round((doneCount / optimistic.length) * 100) : 0;
  const message = error ?? addState.error;

  return (
    <>
      <form className="add-form" action={addAction}>
        <label className="visually-hidden" htmlFor="new-task">
          New task
        </label>
        <input
          ref={inputRef}
          id="new-task"
          name="title"
          type="text"
          autoComplete="off"
          placeholder={day === today ? "Add a task for today…" : "Add a task for that day…"}
          maxLength={MAX_TITLE_LENGTH}
          required
          disabled={adding}
        />
        <button type="submit" aria-label="Add task" disabled={adding}>
          +
        </button>
        <div className={day === today ? "add-day" : "add-day is-later"}>
          <label htmlFor="new-task-day">For</label>
          <input
            id="new-task-day"
            name="day"
            type="date"
            value={day}
            min={today}
            max={lastDay}
            required
            disabled={adding}
            onChange={(event) => setDay(event.target.value || today)}
          />
          {day === today ? (
            <span className="add-day-note">today</span>
          ) : (
            <button type="button" className="text-button" onClick={() => setDay(today)}>
              back to today
            </button>
          )}
        </div>
      </form>

      <div className="score-block" aria-live="polite" aria-atomic="true">
        <div className="score-copy">
          <strong>
            {doneCount}/{optimistic.length}
          </strong>
          <span>done today</span>
        </div>
        <div className="score-track" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      </div>

      <p className={!message && addState.success ? "form-message is-success" : "form-message"} role="alert">
        {message ?? addState.success}
      </p>

      <div className="task-scroll" aria-label="Today’s tasks">
        {optimistic.length === 0 ? (
          <p className="empty-state">Nothing on the list yet. Add a task above, or message the Telegram bot.</p>
        ) : open.length === 0 ? (
          <p className="empty-state">Everything’s done for today 🎉</p>
        ) : (
          <ul className="task-list">{open.map(renderTask)}</ul>
        )}
        {upcomingDays.length > 0 ? (
          <details className="done-section upcoming-section">
            <summary>
              Upcoming <span>({optimisticUpcoming.length})</span>
            </summary>
            {upcomingDays.map((group) => (
              <div key={group.day} className="upcoming-day">
                <p className="upcoming-label">{group.label}</p>
                <ul className="task-list">
                  {group.tasks.map((task) => (
                    <li key={task.id} className="task is-upcoming">
                      <span className="task-copy">
                        <strong>{task.title}</strong>
                      </span>
                      <button
                        type="button"
                        className="task-remove"
                        aria-label={`Remove “${task.title}” from ${group.label}`}
                        title="Remove"
                        onClick={() => removeScheduled(task.id)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        ) : null}
        {done.length > 0 ? (
          // Finished tasks leave the list; they're here to review or untick.
          <details className="done-section">
            <summary>
              Done today <span>({done.length})</span>
            </summary>
            <ul className="task-list">{done.map(renderTask)}</ul>
          </details>
        ) : null}
      </div>
    </>
  );
}
