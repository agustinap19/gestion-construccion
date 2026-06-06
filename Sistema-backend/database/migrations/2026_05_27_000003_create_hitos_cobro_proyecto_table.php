<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hitos_cobro_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->integer('orden')->default(1);
            $table->string('nombre');
            $table->decimal('porcentaje_contrato', 5, 2);
            $table->decimal('monto_calculado', 14, 2)->default(0);
            $table->date('fecha_planificada')->nullable();
            $table->date('fecha_cobrado')->nullable();
            // producto_sicooes = entregable social, hito_negociado = hito privado
            $table->enum('tipo', ['producto_sicooes', 'hito_negociado'])->default('hito_negociado');
            $table->enum('estado', ['planificado', 'listo_para_cobro', 'cobrado'])->default('planificado');
            $table->foreignId('vinculacion_fase_id')->nullable()->constrained('fases_proyecto')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hitos_cobro_proyecto');
    }
};
