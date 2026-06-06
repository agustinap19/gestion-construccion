<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('problemas_obra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('fase_id')->nullable()->constrained('fases_proyecto')->nullOnDelete();
            $table->foreignId('reportado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('asignado_a_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('titulo');
            $table->text('descripcion');
            $table->enum('categoria', ['tecnico', 'administrativo', 'seguridad', 'calidad', 'ambiental', 'otro'])->default('otro');
            $table->enum('prioridad', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->enum('estado', ['abierto', 'en_proceso', 'resuelto', 'cerrado'])->default('abierto');
            $table->date('fecha_reporte');
            $table->date('fecha_limite')->nullable();
            $table->date('fecha_resolucion')->nullable();
            $table->text('solucion_aplicada')->nullable();
            $table->decimal('costo_solucion', 12, 2)->nullable();
            $table->boolean('afecta_cronograma')->default(false);
            $table->integer('dias_impacto')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('problemas_obra');
    }
};
