<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('almacenes', function (Blueprint $table) {
            $table->date('fecha_apertura')->nullable()->after('capacidad_estimada');
            $table->date('fecha_cierre')->nullable()->after('fecha_apertura');
            $table->text('observaciones')->nullable()->after('fecha_cierre');
        });
    }

    public function down(): void
    {
        Schema::table('almacenes', function (Blueprint $table) {
            $table->dropColumn(['fecha_apertura', 'fecha_cierre', 'observaciones']);
        });
    }
};
