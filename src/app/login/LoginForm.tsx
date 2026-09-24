"use client";

import { useActionState } from "react";
import { signIn, type FormState } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form className="login-form" action={action}>
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        aria-describedby="login-error"
      />
      <p id="login-error" className="form-message" role="alert">
        {state.error}
      </p>
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
