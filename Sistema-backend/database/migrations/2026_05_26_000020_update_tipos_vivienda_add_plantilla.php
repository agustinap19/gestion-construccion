<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_vivienda', function (Blueprint $table) {
            $table->foreignId('plantilla_constructiva_id')
                  ->nullable()
                  ->after('estado')
                  ->constrained('plantillas_constructivas')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('tipos_vivienda', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\PlantillaConstructiva::class);
            $table->dropColumn('plantilla_constructiva_id');
        });
    }
};
