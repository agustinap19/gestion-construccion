<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\CheckActasVencidasJob;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('items:alertar-sin-reporte')->dailyAt('06:00');
Schedule::job(new CheckActasVencidasJob)->dailyAt('08:00');

