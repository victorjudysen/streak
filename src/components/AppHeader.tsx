import Link from "next/link";
import { signOut } from "@/app/actions";

const LINKS = [
  { id: "today", href: "/", label: "Today" },
  { id: "routines", href: "/routines", label: "Routines" },
  { id: "settings", href: "/settings", label: "Settings" },
] as const;

export function AppHeader({
  signedIn = true,
  current = "today",
}: {
  signedIn?: boolean;
  current?: (typeof LINKS)[number]["id"];
}) {
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
          {LINKS.map((link) => (
            <Link
              key={link.id}
              className={link.id === current ? "is-active" : undefined}
              href={link.href}
              aria-current={link.id === current ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="header-actions">
        {signedIn
          ? LINKS.filter((link) => link.id !== current).map((link) => (
              <Link key={link.id} className="text-button mobile-only" href={link.href}>
                {link.label}
              </Link>
            ))
          : null}
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
