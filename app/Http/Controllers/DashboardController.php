<?php

namespace App\Http\Controllers;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        $today = CarbonImmutable::now(config('app.timezone'));
        $rangeEnd = $today->endOfWeek(CarbonImmutable::SUNDAY)->startOfDay();
        $rangeStart = $rangeEnd->subDays(370);

        $habits = collect([
            ['name' => 'Morning prayers', 'category' => 'Faith', 'complete' => true, 'time' => '06:12'],
            ['name' => '15 M · Push-ups', 'category' => 'Health', 'complete' => true, 'time' => '07:10'],
            ['name' => 'No soda', 'category' => 'Health', 'complete' => true, 'time' => '12:40'],
            ['name' => 'Kreative Karakana', 'category' => 'Work & building', 'complete' => false, 'time' => null],
            ['name' => 'Open-source work', 'category' => 'Work & building', 'complete' => false, 'time' => null],
            ['name' => 'Apply for an opportunity', 'category' => 'Growth', 'complete' => false, 'time' => null],
            ['name' => 'Evening prayers', 'category' => 'Faith', 'complete' => false, 'time' => null],
        ]);

        $days = collect(range(0, 370))->map(function (int $offset) use ($rangeStart, $today): array {
            $date = $rangeStart->addDays($offset);
            $isFuture = $date->isAfter($today->startOfDay());
            $level = $isFuture ? 0 : (($date->dayOfYear + ($date->weekOfYear * 3)) % 5);

            if ($date->isSameDay($today)) {
                $level = 3;
            }

            return [
                'date' => $date,
                'level' => $level,
                'isToday' => $date->isSameDay($today),
                'isFuture' => $isFuture,
            ];
        });

        return view('dashboard', [
            'today' => $today,
            'habits' => $habits,
            'completedCount' => $habits->where('complete', true)->count(),
            'days' => $days,
        ]);
    }
}
