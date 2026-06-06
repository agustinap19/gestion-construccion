<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('facturas_proveedor', function (Blueprint $table) {
            $table->id();
            $table->string('numero_factura');
            $table->foreignId('proveedor_id')->constrained('proveedores')->cascadeOnDelete();
            $table->foreignId('orden_compra_id')->nullable()->constrained('ordenes_compra')->nullOnDelete();
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento')->nullable();
            $table->decimal('subtotal', 14, 2);
            $table->decimal('impuesto', 14, 2)->default(0);
            $table->decimal('total', 14, 2);
            $table->decimal('monto_pagado', 14, 2)->default(0);
            $table->decimal('saldo_pendiente', 14, 2)->virtualAs('total - monto_pagado');
            $table->enum('estado', ['pendiente', 'parcialmente_pagada', 'pagada', 'vencida', 'anulada'])->default('pendiente');
            $table->string('documento_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proveedor_id', 'numero_factura']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facturas_proveedor');
    }
};
