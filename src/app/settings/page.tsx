import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { requirePageSession } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Settings · Streak" };

export default async function SettingsPage() {
  await requirePageSession();

  return (
    <>
      <AppHeader current="settings" />
      <main id="main-content" className="centered-shell">
        <section className="panel notice-panel" aria-labelledby="password-heading">
          <p className="eyebrow">Settings</p>
          <h1 id="password-heading">
            Change <em>password.</em>
          </h1>
          <p>
            At least {MIN_PASSWORD_LENGTH} characters. Changing it signs out every other device.
          </p>
          <ChangePasswordForm />
        </section>
      </main>
    </>
  );
}
