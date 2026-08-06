<?php

namespace Database\Seeders;

use App\Models\Habit;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $user = User::query()->firstOrCreate([
            'email' => config('streak.personal_user.email'),
        ], [
            'name' => config('streak.personal_user.name'),
            'password' => Hash::make(str()->random(40)),
            'timezone' => config('app.timezone'),
        ]);

        $habits = [
            ['Morning prayers', 'Faith', '06:00'],
            ['15 M · Push-ups', 'Health', '07:00'],
            ['No soda', 'Health', null],
            ['Kreative Karakana', 'Work & building', null],
            ['Open-source work', 'Work & building', null],
            ['Apply for an opportunity', 'Growth', null],
            ['Evening prayers', 'Faith', '19:00'],
        ];

        foreach ($habits as $sortOrder => [$name, $category, $scheduledTime]) {
            Habit::query()->firstOrCreate([
                'user_id' => $user->id,
                'name' => $name,
            ], [
                'category' => $category,
                'scheduled_time' => $scheduledTime,
                'starts_on' => today($user->timezone),
                'is_active' => true,
                'sort_order' => $sortOrder,
            ]);
        }
    }
}
