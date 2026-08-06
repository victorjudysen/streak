<?php

namespace Database\Factories;

use App\Models\Habit;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Habit> */
class HabitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->unique()->words(3, true),
            'category' => fake()->randomElement(['Faith', 'Health', 'Growth', 'Work & building']),
            'scheduled_time' => null,
            'starts_on' => today(),
            'is_active' => true,
            'sort_order' => 0,
        ];
    }
}
