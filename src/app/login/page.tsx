import type { Metadata } from "next";
import { connection } from "next/server";
import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { isConfigured, missingEnv } from "@/lib/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · Streak" };

export default async function LoginPage() {
  await connection(); // read environment variables per request, not at build time
  if (!isConfigured("app")) {
    return (
      <>
        <AppHeader signedIn={false} />
        <SetupNotice missing={missingEnv("app")} />
      </>
    );
  }

  return (
    <>
      <AppHeader signedIn={false} />
      <main id="main-content" className="centered-shell">
        <section className="panel notice-panel" aria-labelledby="login-heading">
          <p className="eyebrow">Private</p>
          <h1 id="login-heading">
            Welcome <em>back.</em>
          </h1>
          <LoginForm />
        </section>
      </main>
    </>
  );
}
