<?php

namespace App\Services;

use App\Models\Habit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class DashboardSnapshot
{
    /** @return array<string, mixed> */
    public function build(User $user, ?CarbonImmutable $today = null): array
    {
        $timezone = $user->timezone ?: config('app.timezone');
        $today = ($today ?? CarbonImmutable::now($timezone))->setTimezone($timezone)->startOfDay();
        $rangeEnd = $today->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay();
        $rangeStart = $rangeEnd->subDays(370);

        $habits = $user->habits()
            ->where('is_active', true)
            ->whereDate('starts_on', '<=', $today)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $completions = $user->habitCompletions()
            ->whereBetween('completed_on', [$rangeStart->toDateString(), $today->toDateString()])
            ->get();

        $countsByDay = $completions
            ->countBy(fn ($completion): string => $completion->completed_on);
        $todayCompletions = $completions
            ->where(fn ($completion): bool => $completion->completed_on === $today->toDateString())
            ->keyBy('habit_id');

        $days = collect(range(0, 370))->map(function (int $offset) use ($countsByDay, $rangeStart, $today): array {
            $date = $rangeStart->addDays($offset);
            $count = (int) $countsByDay->get($date->toDateString(), 0);

            return [
                'date' => $date,
                'level' => min($count, 4),
                'isToday' => $date->isSameDay($today),
                'isFuture' => $date->isAfter($today),
            ];
        });

        $annualExpected = $this->expectedCommitments($habits, $rangeStart, $today);
        $weekStart = $today->startOfWeek(CarbonImmutable::MONDAY);
        $monthStart = $today->startOfMonth();
        $weeklyCompleted = $this->completedBetween($completions, $weekStart, $today);
        $weeklyExpected = $this->expectedCommitments($habits, $weekStart, $today);
        $monthlyCompleted = $this->completedBetween($completions, $monthStart, $today);
        $monthlyExpected = $this->expectedCommitments($habits, $monthStart, $today);
        $strongestRhythm = $this->strongestRhythm($completions, $timezone);
        $attention = $this->attentionHabit($habits, $completions, $today);
        $weeklyBars = collect(range(0, 6))->map(function (int $offset) use ($completions, $habits, $today, $weekStart): array {
            $date = $weekStart->addDays($offset);
            $expected = $date->isAfter($today) ? 0 : $this->expectedCommitments($habits, $date, $date);
            $completed = $date->isAfter($today) ? 0 : $this->completedBetween($completions, $date, $date);

            return [
                'label' => $date->format('D')[0],
                'height' => $expected > 0 ? max(4, (int) round(($completed / $expected) * 100)) : 4,
            ];
        });

        return [
            'today' => $today,
            'personalUserTimezone' => $timezone,
            'habits' => $habits,
            'todayCompletions' => $todayCompletions,
            'completedCount' => $todayCompletions->count(),
            'days' => $days,
            'annualTotal' => $completions->count(),
            'bestStreak' => $this->bestActivityStreak($countsByDay),
            'completionRate' => $this->percentage($completions->count(), $annualExpected),
            'weeklyCompleted' => $weeklyCompleted,
            'weeklyExpected' => $weeklyExpected,
            'weeklyBars' => $weeklyBars,
            'monthlyRate' => $this->percentage($monthlyCompleted, $monthlyExpected),
            'strongestRhythm' => $strongestRhythm,
            'attention' => $attention,
        ];
    }

    /** @param Collection<int, Habit> $habits */
    private function expectedCommitments(Collection $habits, CarbonImmutable $start, CarbonImmutable $end): int
    {
        return $habits->sum(function (Habit $habit) use ($start, $end): int {
            $habitStart = CarbonImmutable::parse($habit->starts_on)->startOfDay();
            $effectiveStart = $habitStart->isAfter($start) ? $habitStart : $start;

            return $effectiveStart->isAfter($end) ? 0 : $effectiveStart->diffInDays($end) + 1;
        });
    }

    /** @param Collection<int, mixed> $completions */
    private function completedBetween(Collection $completions, CarbonImmutable $start, CarbonImmutable $end): int
    {
        return $completions->filter(
            fn ($completion): bool => CarbonImmutable::parse($completion->completed_on)->betweenIncluded($start, $end),
        )->count();
    }

    /** @param Collection<string, int> $countsByDay */
    private function bestActivityStreak(Collection $countsByDay): int
    {
        $dates = $countsByDay
            ->filter(fn (int $count): bool => $count > 0)
            ->keys()
            ->sort()
            ->values();
        $best = 0;
        $current = 0;
        $previous = null;

        foreach ($dates as $date) {
            $currentDate = CarbonImmutable::parse($date);
            $current = $previous?->addDay()->isSameDay($currentDate) ? $current + 1 : 1;
            $best = max($best, $current);
            $previous = $currentDate;
        }

        return $best;
    }

    private function percentage(int $completed, int $expected): int
    {
        return $expected > 0 ? (int) round(($completed / $expected) * 100) : 0;
    }

    /**
     * @param  Collection<int, mixed>  $completions
     * @return array{name: string, description: string}
     */
    private function strongestRhythm(Collection $completions, string $timezone): array
    {
        if ($completions->isEmpty()) {
            return [
                'name' => 'Still forming',
                'description' => 'Complete habits across the day to reveal your strongest rhythm.',
            ];
        }

        $rhythms = [
            'Morning' => ['count' => 0, 'description' => 'Most commitments are completed between 5:00 and 11:59.'],
            'Afternoon' => ['count' => 0, 'description' => 'Most commitments are completed between 12:00 and 16:59.'],
            'Evening' => ['count' => 0, 'description' => 'Most commitments are completed between 17:00 and 21:59.'],
            'Night' => ['count' => 0, 'description' => 'Most commitments are completed between 22:00 and 4:59.'],
        ];

        foreach ($completions as $completion) {
            $hour = $completion->completed_at->setTimezone($timezone)->hour;
            $name = match (true) {
                $hour >= 5 && $hour < 12 => 'Morning',
                $hour >= 12 && $hour < 17 => 'Afternoon',
                $hour >= 17 && $hour < 22 => 'Evening',
                default => 'Night',
            };
            $rhythms[$name]['count']++;
        }

        $name = collect($rhythms)->sortByDesc('count')->keys()->first();

        return ['name' => $name, 'description' => $rhythms[$name]['description']];
    }

    /**
     * @param  Collection<int, Habit>  $habits
     * @param  Collection<int, mixed>  $completions
     * @return array{name: string, completed: int, expected: int}|null
     */
    private function attentionHabit(Collection $habits, Collection $completions, CarbonImmutable $today): ?array
    {
        $start = $today->subDays(6);

        return $habits
            ->map(function (Habit $habit) use ($completions, $start, $today): array {
                $expected = $this->expectedCommitments(collect([$habit]), $start, $today);
                $completed = $this->completedBetween(
                    $completions->where('habit_id', $habit->id),
                    $start,
                    $today,
                );

                return [
                    'name' => $habit->name,
                    'completed' => $completed,
                    'expected' => $expected,
                    'rate' => $this->percentage($completed, $expected),
                ];
            })
            ->sortBy('rate')
            ->map(fn (array $habit): array => collect($habit)->except('rate')->all())
            ->first();
    }
}
