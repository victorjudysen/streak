<?php

namespace Tests\Feature;

use Tests\TestCase;

class DashboardTest extends TestCase
{
    public function test_dashboard_foundation_renders_successfully(): void
    {
        $this->get(route('dashboard'))
            ->assertOk()
            ->assertSee('Today’s')
            ->assertSee('promises.')
            ->assertSee('A year of showing up.')
            ->assertSee('Designed by')
            ->assertSee('ThisUncle Technologies');
    }

    public function test_dashboard_renders_a_complete_fifty_three_week_map(): void
    {
        $response = $this->get(route('dashboard'));

        $response->assertOk();
        $this->assertSame(371, substr_count($response->getContent(), 'class="day-cell'));
        $this->assertStringNotContainsString('is-today is-future', $response->getContent());
    }
}
