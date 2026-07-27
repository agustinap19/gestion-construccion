<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planes_optimizacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->onDelete('cascade');
            $table->enum('tipo_plan', ['proyectos_privados', 'viviendas_sociales']);
            $table->json('parametros_entrada');
            $table->json('resultados');
            $table->float('score_total')->nullable();
            $table->float('distancia_total_km')->nullable();
            $table->integer('dias_estimados')->nullable();
            $table->enum('estado', ['generado', 'aprobado', 'rechazado'])->default('generado');
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planes_optimizacion');
    }
};
