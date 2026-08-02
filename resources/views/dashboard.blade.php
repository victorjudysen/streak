@extends('layouts.app')

@section('title', 'Streak — Dashboard')

@section('content')
<main id="main-content" class="dashboard-shell" data-dashboard>
    <div class="mobile-tabs" role="tablist" aria-label="Dashboard sections">
        <button id="tab-today" type="button" role="tab" aria-selected="true" aria-controls="today-panel" tabindex="0" data-dashboard-tab="today">Today</button>
        <button id="tab-map" type="button" role="tab" aria-selected="false" aria-controls="map-panel" tabindex="-1" data-dashboard-tab="map">Map</button>
        <button id="tab-insights" type="button" role="tab" aria-selected="false" aria-controls="insights-panel" tabindex="-1" data-dashboard-tab="insights">Insights</button>
    </div>

    <section id="today-panel" class="panel today-panel" role="tabpanel" aria-labelledby="tab-today today-heading" data-dashboard-panel="today">
        <div class="panel-header today-header">
            <div>
                <p class="eyebrow"><span aria-hidden="true">●</span> {{ $today->format('l, j F') }}</p>
                <h1 id="today-heading">Today’s<br><em>promises.</em></h1>
            </div>
            <button class="add-button" type="button" aria-label="Add habit is coming in the next feature" disabled>+</button>
        </div>

        <div class="score-block" aria-live="polite" aria-atomic="true">
            <div class="score-copy"><strong data-score>{{ $completedCount }}/{{ $habits->count() }}</strong><span>kept today</span></div>
            <div class="score-track" aria-hidden="true"><span data-score-track style="width: {{ round(($completedCount / $habits->count()) * 100) }}%"></span></div>
        </div>

        <div class="habit-scroll" aria-label="Today’s habits">
            <ul class="habit-list">
                @foreach ($habits as $habit)
                    <li>
                        <button class="habit-check {{ $habit['complete'] ? 'is-complete' : '' }}" type="button" aria-pressed="{{ $habit['complete'] ? 'true' : 'false' }}" data-habit-check>
                            <span class="check-mark" aria-hidden="true">{{ $habit['complete'] ? '✓' : '' }}</span>
                            <span class="habit-copy"><strong>{{ $habit['name'] }}</strong><small>{{ $habit['category'] }}</small></span>
                            <span class="habit-time">{{ $habit['time'] ?? '—' }}</span>
                        </button>
                    </li>
                @endforeach
            </ul>
        </div>

        <p class="panel-note">Demo interactions reset when the page reloads.</p>
    </section>

    <section id="map-panel" class="panel map-panel" role="tabpanel" aria-labelledby="tab-map map-heading" data-dashboard-panel="map">
        <div class="panel-header map-header">
            <div>
                <p class="eyebrow">Your record</p>
                <h2 id="map-heading">A year of showing up.</h2>
            </div>
            <div class="map-actions" aria-label="Map controls">
                <button class="filter-button is-active" type="button">All habits</button>
                <button class="year-button" type="button">{{ $today->year }} <span aria-hidden="true">⌄</span></button>
            </div>
        </div>

        <div class="map-stats" aria-label="Annual statistics">
            <p><strong>148</strong><span>commitments kept</span></p>
            <p><strong>8</strong><span>day best streak</span></p>
            <p><strong>71%</strong><span>completion rate</span></p>
        </div>

        <div class="heatmap-frame">
            <div class="month-labels" aria-hidden="true">
                @foreach (['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'] as $month)
                    <span>{{ $month }}</span>
                @endforeach
            </div>
            <div class="heatmap-body">
                <div class="weekday-labels" aria-hidden="true"><span>Mon</span><span></span><span>Wed</span><span></span><span>Fri</span><span></span><span></span></div>
                <div class="heatmap" role="img" aria-label="Annual habit completion map. Darker squares represent more completed habits.">
                    @foreach ($days as $day)
                        <span class="day-cell {{ $day['isToday'] ? 'is-today' : '' }} {{ $day['isFuture'] ? 'is-future' : '' }}" data-level="{{ $day['level'] }}" title="{{ $day['date']->format('j M Y') }}"></span>
                    @endforeach
                </div>
            </div>
            <div class="map-legend"><span>Less</span>@for ($level = 0; $level <= 4; $level++)<i data-level="{{ $level }}"></i>@endfor<span>More</span></div>
        </div>

        <div class="map-bottom">
            <article class="weekly-card">
                <div><p class="eyebrow">This week</p><strong>18/28</strong></div>
                <div class="week-bars" aria-label="Weekly activity bars">
                    @foreach ([54, 82, 68, 94, 76, 38, 16] as $index => $height)
                        <span style="--bar-height: {{ $height }}%"><i></i><small>{{ ['M','T','W','T','F','S','S'][$index] }}</small></span>
                    @endforeach
                </div>
            </article>
            <article class="quote-card"><p>“Consistency is becoming your <em>normal.</em>”</p><span>Your strongest rhythm is still the morning.</span></article>
        </div>
    </section>

    <aside id="insights-panel" class="insights-rail" role="tabpanel" aria-labelledby="tab-insights" data-dashboard-panel="insights">
        <section class="panel momentum-card">
            <p class="eyebrow">Momentum</p>
            <div class="ring" style="--progress: 71" aria-label="71 percent completion rate"><span><strong>71%</strong><small>this month</small></span></div>
            <p>You are <strong>9%</strong> above last month’s pace.</p>
        </section>

        <section class="panel rhythm-card">
            <div class="panel-header"><div><p class="eyebrow">Strongest rhythm</p><h2>Morning</h2></div><span aria-hidden="true">↗</span></div>
            <p>Most commitments are completed between 6:00 and 9:00.</p>
            <div class="rhythm-line" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </section>

        <section class="panel focus-card">
            <p class="eyebrow">Needs attention</p>
            <strong>Open-source work</strong>
            <p>2 of the last 7 planned days.</p>
            <button type="button" disabled>View habit <span aria-hidden="true">→</span></button>
        </section>
    </aside>
</main>
@endsection
