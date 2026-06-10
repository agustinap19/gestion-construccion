<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_sync_tipologia', function (Blueprint $table) {
            $table->id();

            $table->foreignId('beneficiario_id')
                  ->constrained('beneficiarios')->cascadeOnDelete();

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')->cascadeOnDelete();

            $table->foreignId('vivienda_id')
                  ->nullable()->constrained('viviendas')->nullOnDelete();

            $table->foreignId('tipo_anterior_id')
                  ->nullable()->constrained('tipos_vivienda')->nullOnDelete();

            $table->foreignId('tipo_nuevo_id')
                  ->constrained('tipos_vivienda')->restrictOnDelete();

            $table->foreignId('actor_id')
                  ->constrained('users')->restrictOnDelete();

            // auto = sin entregas, auto se aplicó; manual = con entregas, el admin confirmó
            $table->enum('modo', ['auto', 'manual'])->default('auto');

            // completado | parcial (cuando algunos ítems tuvieron conflictos y no se pudieron reducir)
            $table->enum('estado', ['completado', 'parcial'])->default('completado');

            $table->json('resumen')->nullable();
            // {
            //   agregados: [{item_constructivo_id, nombre, codigo, cantidad_nueva}],
            //   actualizados: [{pip_id, nombre, codigo, cantidad_anterior, cantidad_nueva, cantidad_final}],
            //   conflictos: [{pip_id, nombre, codigo, cantidad_anterior, cantidad_nueva, cantidad_final, nota}],
            //   eliminados: [{pip_id, nombre, codigo}],
            //   sin_cambio: int
            // }

            $table->timestamps();

            $table->index('beneficiario_id');
            $table->index(['proyecto_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_sync_tipologia');
    }
};
