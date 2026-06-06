<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('uso_maquinaria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maquinaria_id')->constrained('maquinaria_equipo')->cascadeOnDelete();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('actividad_id')->nullable()->constrained('actividades')->nullOnDelete();
            $table->foreignId('operador_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->date('fecha');
            $table->decimal('horas_uso', 8, 2)->default(0);
            $table->decimal('costo_total', 12, 2)->nullable();
            $table->decimal('horometro_inicio', 10, 2)->nullable();
            $table->decimal('horometro_fin', 10, 2)->nullable();
            $table->decimal('combustible_consumido', 10, 2)->nullable();
            $table->text('trabajo_realizado')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['maquinaria_id', 'fecha']);
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uso_maquinaria');
    }
};
