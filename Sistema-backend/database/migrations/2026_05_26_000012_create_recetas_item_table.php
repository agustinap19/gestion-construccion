<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recetas_item', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_constructivo_id')->constrained('items_constructivos')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->restrictOnDelete();
            $table->decimal('cantidad_por_unidad_base', 14, 4);
            $table->string('unidad_material', 30)->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->unique(['item_constructivo_id', 'material_id'], 'receta_item_material_unique');
            $table->index('item_constructivo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recetas_item');
    }
};
