<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalle_movimientos_almacen', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movimiento_almacen_id')
                  ->constrained('movimientos_almacen')
                  ->cascadeOnDelete();
            $table->foreignId('material_id')
                  ->constrained('materiales')
                  ->restrictOnDelete();

            $table->decimal('cantidad', 12, 4);
            $table->decimal('precio_unitario', 14, 4)->default(0);
            $table->decimal('subtotal', 14, 4)->storedAs('cantidad * precio_unitario');

            // Snapshot del PMP antes y después para auditoría
            $table->decimal('pmp_anterior', 14, 4)->nullable();
            $table->decimal('pmp_posterior', 14, 4)->nullable();
            $table->decimal('saldo_anterior', 12, 4)->nullable();
            $table->decimal('saldo_posterior', 12, 4)->nullable();

            // Link al kardex (movimientos_material)
            $table->foreignId('movimiento_material_id')
                  ->nullable()
                  ->constrained('movimientos_material')
                  ->nullOnDelete();

            // Porcentaje del presupuesto teórico (para salidas)
            $table->decimal('porcentaje_presupuesto', 8, 4)->nullable();
            $table->text('observacion')->nullable();

            $table->timestamps();

            $table->index(['movimiento_almacen_id', 'material_id'], 'dma_mov_mat_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalle_movimientos_almacen');
    }
};
