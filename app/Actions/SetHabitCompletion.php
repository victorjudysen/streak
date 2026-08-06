<?php

namespace App\Actions;

use App\Models\Habit;
use App\Models\HabitCompletion;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SetHabitCompletion
{
    public function handle(
        User $user,
        Habit $habit,
        string $date,
        bool $completed,
        ?CarbonImmutable $now = null,
    ): ?HabitCompletion {
        if ($habit->user_id !== $user->id) {
            throw new AuthorizationException('This habit does not belong to the current user.');
        }

        $timezone = $user->timezone ?: config('app.timezone');
        $now = ($now ?? CarbonImmutable::now($timezone))->setTimezone($timezone);

        if ($date !== $now->toDateString()) {
            throw ValidationException::withMessages([
                'date' => 'Only today can be changed. Previous and future days are read-only.',
            ]);
        }

        if (! $habit->is_active || $habit->starts_on->isAfter($now->startOfDay())) {
            throw ValidationException::withMessages([
                'habit' => 'This habit is not active today.',
            ]);
        }

        return DB::transaction(function () use ($completed, $date, $habit, $now, $user): ?HabitCompletion {
            if (! $completed) {
                HabitCompletion::query()
                    ->where('user_id', $user->id)
                    ->where('habit_id', $habit->id)
                    ->whereDate('completed_on', $date)
                    ->delete();

                return null;
            }

            return HabitCompletion::query()->firstOrCreate([
                'user_id' => $user->id,
                'habit_id' => $habit->id,
                'completed_on' => $date,
            ], [
                'completed_at' => $now,
            ]);
        });
    }
}
