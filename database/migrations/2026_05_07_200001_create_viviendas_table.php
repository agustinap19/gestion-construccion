<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viviendas', function (Blueprint $table) {
            $table->engine    = 'InnoDB';
            $table->charset   = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('codigo', 50)->unique(); // VIV-PRJ-2026-0001-001

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')
                  ->restrictOnDelete();

            // Beneficiario asignado: 1:1 opcional; null si aún no asignado
            $table->foreignId('beneficiario_id')
                  ->nullable()
                  ->constrained('beneficiarios')
                  ->nullOnDelete();

            $table->foreignId('tipo_vivienda_id')
                  ->nullable()
                  ->constrained('tipos_vivienda')
                  ->nullOnDelete();

            $table->enum('estado', [
                'planificada',
                'terreno_preparado',
                'cimentacion',
                'obra_gruesa',
                'obra_fina',
                'acabados',
                'entregada',
                'con_observaciones',
            ])->default('planificada');

            $table->decimal('porcentaje_avance', 5, 2)->default(0);

            // Flag separado: puede estar en cualquier estado y tener observaciones activas
            $table->boolean('tiene_observaciones_activas')->default(false);

            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();

            $table->text('observaciones')->nullable();

            $table->foreignId('usuario_creador_id')
                  ->nullable()
                  ->constrained('usuarios')
                  ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('beneficiario_id');
            $table->index('estado');
            $table->index('tipo_vivienda_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('viviendas');
    }
};
