<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos_proveedor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('factura_id')->constrained('facturas_proveedor')->cascadeOnDelete();
            $table->foreignId('proveedor_id')->constrained('proveedores')->cascadeOnDelete();
            $table->date('fecha_pago');
            $table->decimal('monto', 12, 2);
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'cheque', 'otro'])->default('transferencia');
            $table->string('numero_referencia')->nullable();
            $table->string('banco')->nullable();
            $table->string('comprobante_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('factura_id');
            $table->index('proveedor_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos_proveedor');
    }
};
