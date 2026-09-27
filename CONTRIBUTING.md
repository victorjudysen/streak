# Contributing to Streak

Thanks for helping. Streak is a small, single-user app, so the best
contributions are focused: a bug fix, a clear improvement, or a feature that fits
[the product goals](docs/product-goals.md). For anything bigger than a fix,
please open an issue first so we can agree on the approach before you spend time
on it.

## Getting set up

Follow [docs/self-hosting.md](docs/self-hosting.md) steps 1–3 to run Streak
locally against your own Supabase project. Supabase's local stack
(`supabase start`) works too, and is how most changes are tested end to end.

Before opening a pull request, make sure these pass. CI runs them too:

```bash
npm run lint
npm test
npm run build
npm run typecheck   # after the build, which generates next-env.d.ts
```

## How the code fits together

Read [docs/foundation.md](docs/foundation.md) before changing anything
structural. The rules that matter most:

- **One data layer.** Only `src/lib/tasks.ts` and `src/lib/routines.ts` touch the
  database tables. The web app and the Telegram bot both call them, so there's
  one set of rules.
- **Rules are pure and tested.** Decisions such as "can this be undone?" or "is
  this routine due today?" live in `src/lib/task-rules.ts`,
  `src/lib/routine-rules.ts` and `src/lib/stats.ts`, with unit tests beside them.
- **Closed days stay closed.** Nothing may let a user change a completion from an
  earlier day.
- **Server-only data access.** The secret key never reaches the browser, and
  Row Level Security stays on with no policies. Every server action re-checks the
  session.
- **Migrations are append-only.** Add a new timestamped file in
  `supabase/migrations/`; never edit one that has already been applied. Enable
  RLS on every new table.
- **Queries that can exceed 1,000 rows** must page through results with
  `fetchAll()` (`src/lib/paging.ts`).
- This is **Next.js 16**. Read the relevant guide in `node_modules/next/dist/docs/`
  before relying on older Next.js habits.

## Pull requests

- Branch from `main` and name the branch after the change (`feature/…`, `fix/…`).
- Keep each PR to one change, with tests for new rules or fixed bugs.
- Write specific commit messages: say what changed, not just "fix" or "update".
- In the PR description, say what you changed, how you tested it, and anything
  you couldn't test.
- If you touch the UI, include a screenshot. Check that it works at phone width
  and respects `prefers-reduced-motion`.

## License of contributions

Streak is licensed under the [GNU AGPL-3.0-or-later](LICENSE). By submitting a
contribution, you agree that it's licensed under the same terms.
