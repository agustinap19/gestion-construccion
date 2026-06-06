<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_material', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('cantidad', 12, 4)->default(0);
            $table->decimal('cantidad_reservada', 12, 4)->default(0);
            $table->decimal('cantidad_disponible', 12, 4)->virtualAs('cantidad - cantidad_reservada');
            $table->decimal('costo_promedio', 12, 4)->default(0);
            $table->timestamp('ultima_actualizacion')->nullable();
            $table->timestamps();

            $table->unique(['almacen_id', 'material_id']);
            $table->index('material_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_material');
    }
};
