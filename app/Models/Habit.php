<?php

namespace App\Models;

use Database\Factories\HabitFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Habit extends Model
{
    /** @use HasFactory<HabitFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'category',
        'scheduled_time',
        'starts_on',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'immutable_date',
            'is_active' => 'boolean',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return HasMany<HabitCompletion, $this> */
    public function completions(): HasMany
    {
        return $this->hasMany(HabitCompletion::class);
    }
}
