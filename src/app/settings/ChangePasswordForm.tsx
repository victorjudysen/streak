"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type FormState } from "@/app/actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} className="login-form" action={action}>
      <label htmlFor="current">Current password</label>
      <input id="current" name="current" type="password" autoComplete="current-password" required />

      <label htmlFor="next">New password</label>
      <input
        id="next"
        name="next"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
      />

      <label htmlFor="confirm">Repeat new password</label>
      <input
        id="confirm"
        name="confirm"
        type="password"
        autoComplete="new-password"
        minLength={MIN_PASSWORD_LENGTH}
        required
      />

      <p className={state.success ? "form-message is-success" : "form-message"} role="alert">
        {state.error ?? state.success}
      </p>
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
