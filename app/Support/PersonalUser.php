<?php

namespace App\Support;

use App\Models\User;

class PersonalUser
{
    public function get(): User
    {
        return User::query()
            ->where('email', config('streak.personal_user.email'))
            ->firstOrFail();
    }
}
