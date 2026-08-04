<?php

namespace Tests\Feature;

use App\Models\Habit;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HabitCompletionTest extends TestCase
{
    use RefreshDatabase;

    private User $personalUser;

    private Habit $habit;

    protected function setUp(): void
    {
        parent::setUp();

        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-04 10:30:00', 'Africa/Dar_es_Salaam'));

        $this->personalUser = User::factory()->create([
            'name' => 'Victor',
            'email' => config('streak.personal_user.email'),
            'timezone' => 'Africa/Dar_es_Salaam',
        ]);
        $this->habit = Habit::factory()->for($this->personalUser)->create([
            'name' => 'Morning prayers',
            'starts_on' => '2026-08-01',
        ]);
    }

    protected function tearDown(): void
    {
        CarbonImmutable::setTestNow();

        parent::tearDown();
    }

    public function test_today_completion_is_persisted_and_returned_to_the_dashboard(): void
    {
        $this->putJson(route('habits.completion.update', $this->habit), [
            'date' => '2026-08-04',
            'completed' => true,
        ])->assertOk()
            ->assertJsonPath('completed', true)
            ->assertJsonPath('completed_count', 1)
            ->assertJsonPath('habit_count', 1)
            ->assertJsonPath('today_level', 1)
            ->assertJsonPath('strongest_rhythm.name', 'Morning')
            ->assertJsonPath('attention.completed', 1);

        $this->assertDatabaseHas('habit_completions', [
            'user_id' => $this->personalUser->id,
            'habit_id' => $this->habit->id,
            'completed_on' => '2026-08-04',
        ]);

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertSee('aria-pressed="true"', false)
            ->assertSee('1/1');
    }

    public function test_repeated_completion_requests_are_idempotent(): void
    {
        $payload = ['date' => '2026-08-04', 'completed' => true];

        $this->putJson(route('habits.completion.update', $this->habit), $payload)->assertOk();
        $this->putJson(route('habits.completion.update', $this->habit), $payload)->assertOk();

        $this->assertDatabaseCount('habit_completions', 1);
    }

    public function test_today_completion_can_be_undone(): void
    {
        $payload = ['date' => '2026-08-04', 'completed' => true];
        $this->putJson(route('habits.completion.update', $this->habit), $payload)->assertOk();

        $this->putJson(route('habits.completion.update', $this->habit), [
            'date' => '2026-08-04',
            'completed' => false,
        ])->assertOk()
            ->assertJsonPath('completed', false)
            ->assertJsonPath('completed_count', 0);

        $this->assertDatabaseCount('habit_completions', 0);
    }

    public function test_previous_and_future_days_are_read_only(): void
    {
        foreach (['2026-08-03', '2026-08-05'] as $date) {
            $this->putJson(route('habits.completion.update', $this->habit), [
                'date' => $date,
                'completed' => true,
            ])->assertUnprocessable()
                ->assertJsonValidationErrors('date');
        }

        $this->assertDatabaseCount('habit_completions', 0);
    }

    public function test_a_user_cannot_change_another_users_habit(): void
    {
        $otherHabit = Habit::factory()->create(['starts_on' => '2026-08-01']);

        $this->putJson(route('habits.completion.update', $otherHabit), [
            'date' => '2026-08-04',
            'completed' => true,
        ])->assertForbidden();

        $this->assertDatabaseCount('habit_completions', 0);
    }

    public function test_the_users_timezone_determines_which_day_can_be_changed(): void
    {
        CarbonImmutable::setTestNow(CarbonImmutable::parse('2026-08-04 01:00:00', 'UTC'));
        $this->personalUser->update(['timezone' => 'Pacific/Honolulu']);

        $this->putJson(route('habits.completion.update', $this->habit), [
            'date' => '2026-08-03',
            'completed' => true,
        ])->assertOk();

        $this->putJson(route('habits.completion.update', $this->habit), [
            'date' => '2026-08-04',
            'completed' => true,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('date');

        $this->assertDatabaseHas('habit_completions', [
            'user_id' => $this->personalUser->id,
            'habit_id' => $this->habit->id,
            'completed_on' => '2026-08-03',
        ]);
    }
}
