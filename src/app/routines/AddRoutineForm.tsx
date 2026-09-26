"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRoutineAction, type FormState } from "@/app/actions";
import { ALL_WEEKDAYS, WEEKDAY_NAMES } from "@/lib/routine-rules";
import { MAX_TITLE_LENGTH } from "@/lib/task-rules";

export function AddRoutineForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRoutineAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} className="routine-form" action={action}>
      <label className="visually-hidden" htmlFor="routine-title">
        Routine
      </label>
      <div className="add-form">
        <input
          id="routine-title"
          name="title"
          type="text"
          autoComplete="off"
          placeholder="e.g. Morning prayers"
          maxLength={MAX_TITLE_LENGTH}
          required
          disabled={pending}
        />
        <button type="submit" aria-label="Add routine" disabled={pending}>
          +
        </button>
      </div>
      <fieldset className="weekday-picker">
        <legend>Repeats on</legend>
        {ALL_WEEKDAYS.map((day) => (
          <label key={day}>
            <input type="checkbox" name="weekdays" value={day} defaultChecked />
            <span>{WEEKDAY_NAMES[day - 1]}</span>
          </label>
        ))}
      </fieldset>
      <p className={state.success ? "form-message is-success" : "form-message"} role="alert">
        {state.error ?? state.success}
      </p>
    </form>
  );
}
