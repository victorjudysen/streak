# Streak

A private Laravel Blade dashboard for the goals and habits you keep.

## Local setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run build
php artisan serve
```

The application uses SQLite locally by default. Production will use MySQL on shared hosting, with the domain document root pointed at `public/`.

The current personal mode resolves the owner through
`STREAK_PERSONAL_USER_EMAIL` and seeds that account's initial habits. Public
registration and authentication are intentionally not part of this increment.

## Foundation

The current reference implementation is a fixed-height desktop dashboard with internally scrollable panels and tabbed mobile sections. See [the foundation contract](docs/foundation.md) before starting feature work.

The long-term direction, product principles, and future idea inbox live in the
[product goals](docs/product-goals.md) document.
