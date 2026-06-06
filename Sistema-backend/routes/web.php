<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\DocumentoValidacionController;

Route::get('/verificar-documento/{hash}', [DocumentoValidacionController::class, 'verificar'])->name('documento.verificar');

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
