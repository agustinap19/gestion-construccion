<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presupuesto_items_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('vivienda_id')->nullable()->constrained('viviendas')->nullOnDelete();
            $table->foreignId('item_constructivo_id')->constrained('items_constructivos')->restrictOnDelete();
            $table->decimal('cantidad_planificada', 14, 4);
            $table->foreignId('producto_contractual_id')->nullable()->constrained('productos_contractuales')->nullOnDelete();
            $table->foreignId('fase_id')->nullable()->constrained('fases_proyecto')->nullOnDelete();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->decimal('ponderacion_avance', 6, 4)->default(0);
            $table->enum('estado_ejecucion', ['pendiente', 'en_proceso', 'terminado'])->default('pendiente');
            $table->decimal('porcentaje_avance', 5, 2)->default(0);
            $table->boolean('tiene_override_receta')->default(false);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['proyecto_id', 'vivienda_id']);
            $table->index('item_constructivo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presupuesto_items_proyecto');
    }
};
