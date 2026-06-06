<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mantenimientos_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->enum('tipo', ['preventivo', 'correctivo', 'predictivo']);
            $table->date('fecha_programada');
            $table->date('fecha_realizado')->nullable();
            $table->string('proveedor_servicio')->nullable();
            $table->decimal('costo', 12, 2)->nullable();
            $table->text('descripcion_trabajo')->nullable();
            $table->string('numero_orden_trabajo')->nullable();
            $table->enum('estado', ['programado', 'en_proceso', 'completado', 'cancelado'])->default('programado');
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('activo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mantenimientos_activo');
    }
};
