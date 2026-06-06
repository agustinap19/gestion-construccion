<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reportes_avance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->restrictOnDelete();
            $table->foreignId('vivienda_id')->constrained('viviendas')->restrictOnDelete();
            $table->foreignId('presupuesto_item_proyecto_id')->constrained('presupuesto_items_proyecto')->restrictOnDelete();
            $table->foreignId('tecnico_id')->constrained('users')->restrictOnDelete();
            $table->decimal('porcentaje_avance',   5, 2);
            $table->decimal('porcentaje_anterior',  5, 2)->default(0);
            $table->text('observacion')->nullable();
            $table->string('foto_path');
            $table->string('foto_thumbnail_path')->nullable();
            $table->string('coordenadas_gps')->nullable();
            $table->datetime('fecha_reporte');
            $table->enum('estado', ['pendiente_revision', 'aprobado', 'rechazado'])->default('aprobado');
            $table->json('metadata')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['vivienda_id', 'fecha_reporte']);
            $table->index(['presupuesto_item_proyecto_id', 'fecha_reporte']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reportes_avance');
    }
};
