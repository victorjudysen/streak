<?php

namespace App\Http\Controllers;

use App\Actions\SetHabitCompletion;
use App\Http\Requests\UpdateHabitCompletionRequest;
use App\Models\Habit;
use App\Services\DashboardSnapshot;
use App\Support\PersonalUser;
use Illuminate\Http\JsonResponse;

class HabitCompletionController extends Controller
{
    public function __invoke(
        UpdateHabitCompletionRequest $request,
        Habit $habit,
        PersonalUser $personalUser,
        SetHabitCompletion $setHabitCompletion,
        DashboardSnapshot $dashboardSnapshot,
    ): JsonResponse {
        $user = $personalUser->get();
        $validated = $request->validated();
        $completion = $setHabitCompletion->handle(
            $user,
            $habit,
            $validated['date'],
            $validated['completed'],
        );
        $snapshot = $dashboardSnapshot->build($user);

        return response()->json([
            'completed' => $completion !== null,
            'completed_at' => $completion?->completed_at->setTimezone($user->timezone)->format('H:i'),
            'completed_count' => $snapshot['completedCount'],
            'habit_count' => $snapshot['habits']->count(),
            'today_level' => min($snapshot['completedCount'], 4),
            'annual_total' => $snapshot['annualTotal'],
            'best_streak' => $snapshot['bestStreak'],
            'completion_rate' => $snapshot['completionRate'],
            'weekly_completed' => $snapshot['weeklyCompleted'],
            'weekly_expected' => $snapshot['weeklyExpected'],
            'monthly_rate' => $snapshot['monthlyRate'],
            'strongest_rhythm' => $snapshot['strongestRhythm'],
            'attention' => $snapshot['attention'],
        ]);
    }
}
