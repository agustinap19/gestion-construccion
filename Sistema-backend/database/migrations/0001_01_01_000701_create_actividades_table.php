<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actividades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fase_id')->constrained('fases_proyecto')->cascadeOnDelete();
            $table->foreignId('partida_id')->nullable()->constrained('partidas')->nullOnDelete();
            $table->foreignId('unidad_medida_id')->nullable()->constrained('unidades_medida')->nullOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->decimal('metrado_planificado', 12, 4)->default(0);
            $table->decimal('metrado_ejecutado', 12, 4)->default(0);
            $table->decimal('costo_unitario', 12, 4)->default(0);
            $table->decimal('costo_total_planificado', 14, 2)->default(0);
            $table->decimal('costo_total_ejecutado', 14, 2)->default(0);
            $table->date('fecha_inicio_planificada')->nullable();
            $table->date('fecha_fin_planificada')->nullable();
            $table->date('fecha_inicio_real')->nullable();
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('avance_porcentaje', 5, 2)->default(0);
            $table->enum('estado', ['pendiente', 'en_progreso', 'completada', 'suspendida'])->default('pendiente');
            $table->integer('orden')->default(0);
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('fase_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actividades');
    }
};
