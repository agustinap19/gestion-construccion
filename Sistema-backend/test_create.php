<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $cat = \App\Models\CategoriaMaterial::firstOrCreate(['nombre'=>'Cat Test'], ['activa'=>true]);
    $uni = \App\Models\UnidadMedida::firstOrCreate(['nombre'=>'Piezas'], ['simbolo'=>'PZA', 'tipo'=>'unidad']);

    $request = Illuminate\Http\Request::create('/api/materiales', 'POST', [
        'nombre' => 'Test Material ' . time(),
        'categoria_id' => $cat->id,
        'unidad_medida_id' => $uni->id,
        'tipo' => 'maestro',
        'stock_minimo' => 0,
    ]);
    $user = \App\Models\User::first();
    $request->setUserResolver(fn() => $user);

    $controller = app(\App\Http\Controllers\Api\MaterialController::class);
    $response = $controller->store($request);
    
    echo "SUCCESS: " . $response->getContent() . "\n";
} catch (\Illuminate\Validation\ValidationException $e) {
    echo "VALIDATION ERROR:\n";
    print_r($e->errors());
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
