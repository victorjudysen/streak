"use client";

import { useState, useTransition } from "react";
import { removeRoutineAction, setRoutinePausedAction, type FormState } from "@/app/actions";

export function RoutineActions({ id, title, paused }: { id: string; title: string; paused: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<FormState>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="routine-actions">
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={() => run(() => setRoutinePausedAction(id, !paused))}
      >
        {paused ? "Resume" : "Pause"}
      </button>
      <button
        type="button"
        className="text-button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Remove “${title}”? It stops appearing, but its history is kept.`)) {
            run(() => removeRoutineAction(id));
          }
        }}
      >
        Remove
      </button>
      {error ? (
        <span className="form-message" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
