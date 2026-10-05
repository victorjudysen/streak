"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_TITLE_LENGTH } from "@/lib/task-rules";

/**
 * Inline editor for one task: its title, and (for unfinished tasks) its day.
 * Enter saves, Escape cancels. Only changed values are sent.
 */
export function TaskEditor({
  title,
  day,
  today,
  lastDay,
  allowMove,
  onSave,
  onCancel,
}: {
  title: string;
  /** The day the editor starts on (today for carried-over tasks). */
  day: string;
  today: string;
  lastDay: string;
  allowMove: boolean;
  onSave: (changes: { title?: string; day?: string }) => void;
  onCancel: () => void;
}) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDay, setDraftDay] = useState(day);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const changes: { title?: string; day?: string } = {};
    if (draftTitle.trim() !== title) changes.title = draftTitle;
    if (allowMove && draftDay !== day) changes.day = draftDay;
    if (Object.keys(changes).length === 0) return onCancel();
    onSave(changes);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <form className="task-editor" onSubmit={submit} onKeyDown={onKeyDown}>
      <label className="visually-hidden" htmlFor="edit-task-title">
        Task
      </label>
      <input
        id="edit-task-title"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        maxLength={MAX_TITLE_LENGTH}
        required
        autoFocus
      />
      <div className="task-editor-row">
        {allowMove ? (
          <label className="add-day">
            <span>For</span>
            <input
              type="date"
              value={draftDay}
              min={today}
              max={lastDay}
              required
              onChange={(event) => setDraftDay(event.target.value || day)}
            />
          </label>
        ) : (
          <span className="task-editor-note">Finished today — rename only</span>
        )}
        <span className="task-editor-actions">
          <button type="button" className="text-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button">
            Save
          </button>
        </span>
      </div>
    </form>
  );
}
