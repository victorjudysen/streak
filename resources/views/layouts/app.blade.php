<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Streak is a private dashboard for the promises you keep.">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>@yield('title', 'Streak')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&amp;family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&amp;family=Newsreader:opsz,wght@6..72,500;6..72,600&amp;display=swap" rel="stylesheet">
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body>
    <a class="skip-link" href="#main-content">Skip to dashboard</a>
    <header class="app-header">
        <a class="wordmark" href="{{ route('dashboard') }}" aria-label="Streak dashboard">streak<span>.</span></a>
        <nav class="desktop-nav" aria-label="Primary navigation">
            <a class="is-active" href="{{ route('dashboard') }}" aria-current="page">Dashboard</a>
            <button type="button" disabled>Habits</button>
            <button type="button" disabled>Reviews</button>
        </nav>
        <div class="header-actions">
            <button class="icon-button" type="button" aria-label="Open notifications" disabled>
                <span aria-hidden="true">○</span>
            </button>
            <button class="avatar" type="button" aria-label="Account access is coming later">VK</button>
        </div>
    </header>

    @yield('content')

    <footer class="app-footer">
        <span>Private by design · v0.1 foundation</span>
        <span>Designed by <a href="https://thisuncle.co.tz"><strong>ThisUncle Technologies</strong></a></span>
    </footer>
</body>
</html>
