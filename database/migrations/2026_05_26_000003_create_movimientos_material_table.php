<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_material', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->enum('tipo', [
                'entrada',
                'salida',
                'transferencia_entrada',
                'transferencia_salida',
                'ajuste_positivo',
                'ajuste_negativo',
                'inventario_inicial',
            ]);
            $table->decimal('cantidad', 12, 4);
            $table->decimal('precio_unitario', 12, 4)->default(0);
            $table->decimal('costo_total', 12, 4)->default(0);
            $table->decimal('saldo_anterior', 12, 4)->default(0);
            $table->decimal('saldo_posterior', 12, 4)->default(0);
            $table->decimal('costo_promedio_resultante', 12, 4)->default(0);
            $table->string('concepto')->nullable();
            $table->string('referencia_tipo')->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fecha_movimiento')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['almacen_id', 'material_id']);
            $table->index(['almacen_id', 'fecha_movimiento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_material');
    }
};
