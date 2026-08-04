# Laravel dashboard foundation

This document is the source of truth for all feature branches after `foundation/laravel-dashboard` is merged.

## Architecture

- Laravel 12 and PHP 8.2+ support common shared-hosting environments.
- Blade owns page structure and server-rendered content.
- Plain token-driven CSS is compiled by Vite during CI; the production server does not need Node.js.
- Small vanilla JavaScript modules provide immediate interface feedback.
- The production web root must point to Laravel's `public/` directory.

## Dashboard contract

- Desktop uses a fixed viewport shell. The document must not vertically scroll.
- Panels may scroll internally when their content exceeds available space.
- Mobile uses three tabs: Today, Map, and Insights. It must not collapse into one long page.
- `resources/views/layouts/app.blade.php` owns the shared header and footer.
- `resources/css/app.css` owns primitive, semantic, and component tokens plus shared layout/components.
- The footer credit and link to ThisUncle Technologies are required on every page.

## Shared-file boundary

Sub-agents may read and reuse the following files but must not modify them:

- `resources/views/layouts/app.blade.php`
- `resources/css/app.css`
- `resources/js/app.js`
- `docs/foundation.md`
- shared header and footer markup

If a feature needs a shared change, report it to the Lead Agent. Feature-specific Blade partials, controllers, styles, JavaScript, migrations, models, tests, and routes belong to the feature branch.

## Foundation scope at merge

The dashboard uses demo data and ephemeral check-off interactions. Database persistence, habit creation, authentication, scheduling, and production deployment intentionally remain outside the foundation.

Feature branches may replace that demonstration behavior while continuing to
honor the dashboard and shared-file contracts above.
