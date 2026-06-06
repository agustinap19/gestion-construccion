<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transacciones_financieras', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->enum('tipo', ['ingreso', 'egreso', 'ajuste']);
            $table->enum('categoria', [
                'anticipo_cliente', 'cobro_valorizacion', 'pago_proveedor',
                'pago_planilla', 'gasto_administrativo', 'gasto_financiero',
                'devolucion', 'otro'
            ]);
            $table->decimal('monto', 14, 2);
            $table->string('moneda', 3)->default('BOB');
            $table->date('fecha_transaccion');
            $table->string('referencia_documento')->nullable();
            $table->enum('metodo_pago', ['efectivo', 'transferencia', 'cheque', 'otro'])->nullable();
            $table->string('banco')->nullable();
            $table->string('numero_cuenta')->nullable();
            $table->text('descripcion')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('estado', ['pendiente', 'confirmada', 'anulada'])->default('confirmada');
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('tipo');
            $table->index('fecha_transaccion');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transacciones_financieras');
    }
};
