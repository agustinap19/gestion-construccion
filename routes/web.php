<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/run-migrations', function () {
    try {
        Artisan::call('migrate', ['--force' => true]);
        $output = Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'PermisosBloque4Seeder', '--force' => true]);
        $output .= "\n" . Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'TipoProyectoSeeder', '--force' => true]);
        $output .= "\n" . Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'TipoViviendaSeeder', '--force' => true]);
        $output .= "\n" . Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'ProyectoSeeder', '--force' => true]);
        $output .= "\n" . Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'BeneficiarioSeeder', '--force' => true]);
        $output .= "\n" . Artisan::output();
        
        Artisan::call('db:seed', ['--class' => 'VisitaDomiciliariaSeeder', '--force' => true]);
        $output .= "\n" . Artisan::output();

        return "<pre>Success:\n" . $output . "</pre>";
    } catch (\Exception $e) {
        return "<pre>Error:\n" . $e->getMessage() . "\n" . $e->getTraceAsString() . "</pre>";
    }
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
