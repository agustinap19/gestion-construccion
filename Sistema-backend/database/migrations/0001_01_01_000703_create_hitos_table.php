<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hitos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('fase_id')->nullable()->constrained('fases_proyecto')->nullOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->date('fecha_planificada');
            $table->date('fecha_cumplimiento')->nullable();
            $table->enum('tipo', ['entrega_parcial', 'entrega_final', 'pago', 'inspeccion', 'otro'])->default('otro');
            $table->boolean('es_critico')->default(false);
            $table->enum('estado', ['pendiente', 'cumplido', 'vencido', 'pospuesto'])->default('pendiente');
            $table->string('documento_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hitos');
    }
};
