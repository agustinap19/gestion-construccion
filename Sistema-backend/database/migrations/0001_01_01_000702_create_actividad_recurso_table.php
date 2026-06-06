<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actividad_recurso', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actividad_id')->constrained('actividades')->cascadeOnDelete();
            $table->enum('tipo_recurso', ['personal', 'material', 'maquinaria', 'subcontrato']);
            $table->unsignedBigInteger('recurso_id');
            $table->string('recurso_descripcion')->nullable();
            $table->decimal('cantidad_planificada', 12, 4)->default(0);
            $table->decimal('cantidad_ejecutada', 12, 4)->default(0);
            $table->foreignId('unidad_medida_id')->nullable()->constrained('unidades_medida')->nullOnDelete();
            $table->decimal('costo_unitario', 12, 4)->default(0);
            $table->decimal('costo_total', 14, 2)->default(0);
            $table->timestamps();

            $table->index('actividad_id');
            $table->index(['tipo_recurso', 'recurso_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actividad_recurso');
    }
};
