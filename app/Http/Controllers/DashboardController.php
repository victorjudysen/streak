<?php

namespace App\Http\Controllers;

use App\Services\DashboardSnapshot;
use App\Support\PersonalUser;
use Illuminate\Contracts\View\View;

class DashboardController extends Controller
{
    public function __invoke(PersonalUser $personalUser, DashboardSnapshot $dashboardSnapshot): View
    {
        return view('dashboard', $dashboardSnapshot->build($personalUser->get()));
    }
}
