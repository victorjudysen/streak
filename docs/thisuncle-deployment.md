# The ThisUncle deployment

Notes on the maintainer's own copy of Streak. The general setup is in
[self-hosting.md](self-hosting.md); this file only records where this copy
lives and what is specific to it.

## Where it runs

| Piece | Where |
| --- | --- |
| Site | <https://streak.thisuncle.co.tz> (Netlify site `streak-thisuncle`) |
| DNS | `thisuncle.co.tz` is on Netlify DNS; the `streak` record was created automatically |
| Database | Supabase project `streak` (this folder is `supabase link`ed) |
| Bot | @victorstreakbot, locked to the maintainer's chat |
| Deploys | GitHub Actions: PR previews at `https://pr-<n>--streak-thisuncle.netlify.app`, production on merge to `main` |

## GitHub settings

- Variable `NETLIFY_SITE_ID`: the `streak-thisuncle` site.
- Secret `NETLIFY_AUTH_TOKEN`: a Netlify personal access token named
  `streak-github-actions`. When it expires, deploys fail with a clear message.
  Create a new token and run `gh secret set NETLIFY_AUTH_TOKEN`.

## Things to know

- **Telegram from the office network:** it times out on `api.telegram.org`, so
  `npm run telegram:setup` (or anything else that calls Telegram from the laptop)
  needs a phone hotspot or VPN. The live site isn't affected; Netlify reaches
  Telegram fine.
- **Time zone:** `STREAK_TIMEZONE=Africa/Dar_es_Salaam` on Netlify, so the
  morning message arrives at 09:00 EAT.
- **Previews share the production database.** Changing tasks on a preview
  changes the real list.
- **Migrations:** apply with `supabase db push --dry-run`, then `supabase db push`.
  If the CLI reports `password authentication failed for user "cli_login_postgres"`,
  wait a few seconds and run it again. Setting `SUPABASE_DB_PASSWORD` in your
  shell avoids the temporary login altogether.
