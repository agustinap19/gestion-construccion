<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->enum('tipo_movimiento', ['entrada', 'salida', 'ajuste', 'traslado_entrada', 'traslado_salida', 'devolucion']);
            $table->decimal('cantidad', 12, 4);
            $table->decimal('costo_unitario', 12, 4)->nullable();
            $table->decimal('costo_total', 14, 2)->nullable();
            $table->decimal('stock_anterior', 12, 4)->nullable();
            $table->decimal('stock_posterior', 12, 4)->nullable();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('actividad_id')->nullable()->constrained('actividades')->nullOnDelete();
            $table->string('referencia_documento')->nullable();
            $table->string('motivo')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fecha_movimiento');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index(['almacen_id', 'material_id']);
            $table->index('tipo_movimiento');
            $table->index('fecha_movimiento');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
