<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_orden_compra', function (Blueprint $table) {
            $table->id();
            $table->foreignId('orden_compra_id')->constrained('ordenes_compra')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('cantidad_ordenada', 12, 4);
            $table->decimal('cantidad_recibida', 12, 4)->default(0);
            $table->decimal('precio_unitario', 12, 4);
            $table->decimal('descuento_unitario', 12, 4)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->string('especificaciones')->nullable();
            $table->enum('estado', ['pendiente', 'parcialmente_recibido', 'recibido', 'cancelado'])->default('pendiente');
            $table->timestamps();

            $table->index('orden_compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_orden_compra');
    }
};
