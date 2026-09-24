import Link from "next/link";
import { signOut } from "@/app/actions";

export function AppHeader({ signedIn = true }: { signedIn?: boolean }) {
  return (
    <header className="app-header">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Link className="wordmark" href="/" aria-label="Streak home">
        streak<span>.</span>
      </Link>
      {signedIn ? (
        <nav className="desktop-nav" aria-label="Primary navigation">
          <Link className="is-active" href="/" aria-current="page">
            Today
          </Link>
        </nav>
      ) : null}
      <div className="header-actions">
        {signedIn ? (
          <form action={signOut}>
            <button className="text-button" type="submit">
              Sign out
            </button>
          </form>
        ) : null}
        <span className="avatar" aria-hidden="true">
          VK
        </span>
      </div>
    </header>
  );
}
