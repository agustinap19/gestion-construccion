<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $request = Illuminate\Http\Request::create('/api/exportar/materiales', 'GET');
    $user = \App\Models\User::first();
    $request->setUserResolver(fn() => $user);

    $controller = app(\App\Http\Controllers\Api\ExportacionController::class);
    $response = $controller->materiales($request);
    
    echo "SUCCESS: PDF Size: " . strlen($response->getContent()) . "\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString();
}
