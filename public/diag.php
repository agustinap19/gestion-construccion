<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle(Illuminate\Http\Request::capture());

$proyectos = \App\Models\Proyecto::select('id','nombre','avance_fisico')->get();
$viviendas = \App\Models\Vivienda::select('id','codigo','porcentaje_avance','proyecto_id')->get();

$user = \App\Models\User::first();
if ($user) {
    \App\Models\Proyecto::query()->update(['responsable_id' => $user->id]);
    request()->setUserResolver(fn() => $user);
    $pull = app(\App\Http\Controllers\Api\MobileSyncController::class)->pull(request())->getData(true);
} else {
    $pull = [];
}

header('Content-Type: application/json');
echo json_encode([
    'db' => [
        'proyectos' => $proyectos,
        'viviendas' => $viviendas
    ],
    'pull' => [
        'proyectos' => $pull['proyectos'] ?? [],
        'viviendas' => $pull['viviendas'] ?? []
    ]
], JSON_PRETTY_PRINT);
