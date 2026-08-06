<?php

namespace Database\Factories;

use App\Models\Habit;
use App\Models\HabitCompletion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<HabitCompletion> */
class HabitCompletionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'habit_id' => Habit::factory(),
            'user_id' => fn (array $attributes) => Habit::findOrFail($attributes['habit_id'])->user_id,
            'completed_on' => today()->toDateString(),
            'completed_at' => now(),
        ];
    }
}
