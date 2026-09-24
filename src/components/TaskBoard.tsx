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
}

type Change = { id: string; type: "toggle"; done: boolean } | { id: string; type: "remove" };

export function TaskBoard({ tasks }: { tasks: TaskView[] }) {
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
          placeholder="Add a task for today…"
          maxLength={MAX_TITLE_LENGTH}
          required
          disabled={adding}
        />
        <button type="submit" aria-label="Add task" disabled={adding}>
          +
        </button>
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

      <p className="form-message" role="alert">
        {message}
      </p>

      <div className="task-scroll" aria-label="Today’s tasks">
        {optimistic.length === 0 ? (
          <p className="empty-state">Nothing on the list yet. Add a task above, or message the Telegram bot.</p>
        ) : (
          <ul className="task-list">
            {optimistic.map((task) => (
              <li key={task.id} className={task.done ? "task is-complete" : "task"}>
                <button
                  type="button"
                  className="task-check"
                  aria-pressed={task.done}
                  onClick={() =>
                    run({ id: task.id, type: "toggle", done: !task.done }, () =>
                      setTaskDoneAction(task.id, !task.done),
                    )
                  }
                >
                  <span className="check-mark" aria-hidden="true">
                    {task.done ? "✓" : ""}
                  </span>
                  <span className="task-copy">
                    <strong>{task.title}</strong>
                    <small>
                      {task.carriedFrom ? <span className="carried">From {task.carriedFrom}</span> : null}
                      {task.fromTelegram ? <span>via Telegram</span> : null}
                    </small>
                  </span>
                  <span className="task-time">{task.done ? (task.doneTime ?? "Now") : "—"}</span>
                </button>
                <button
                  type="button"
                  className="task-remove"
                  aria-label={task.carriedFrom ? `Let go of “${task.title}”` : `Remove “${task.title}”`}
                  title={task.carriedFrom ? "Let go (kept on record)" : "Remove"}
                  onClick={() => run({ id: task.id, type: "remove" }, () => removeTaskAction(task.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
