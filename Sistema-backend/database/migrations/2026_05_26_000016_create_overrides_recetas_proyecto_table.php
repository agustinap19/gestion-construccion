<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overrides_recetas_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presupuesto_item_proyecto_id')->constrained('presupuesto_items_proyecto')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->restrictOnDelete();
            $table->decimal('cantidad_por_unidad_base', 14, 4);
            $table->text('justificacion');
            $table->foreignId('usuario_autorizador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['presupuesto_item_proyecto_id', 'material_id'], 'override_item_material_unique');
            $table->index('presupuesto_item_proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overrides_recetas_proyecto');
    }
};
