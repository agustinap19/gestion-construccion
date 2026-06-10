<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('alertas_cerebro_economico', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', [
                'SOBRE_CONSUMO',
                'MERMA_ANOMALA',
                'PUNTO_PEDIDO',
                'CAPITAL_INMOVILIZADO',
                'QUIEBRE_INMINENTE',
                'BURN_RATE_ANOMALO',
                'DESVIACION_CONSUMO_PROYECTO',
            ]);
            $table->enum('severidad', ['info', 'atencion', 'critico', 'anomalo']);
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('material_id')->nullable()->constrained('materiales')->nullOnDelete();
            $table->foreignId('almacen_id')->nullable()->constrained('almacenes')->nullOnDelete();
            $table->foreignId('presupuesto_item_proyecto_id')->nullable()->constrained('presupuesto_items_proyecto')->nullOnDelete();
            $table->text('mensaje');
            $table->json('datos_calculo')->nullable();
            $table->enum('estado', ['activa', 'vista', 'resuelta', 'descartada'])->default('activa');
            $table->foreignId('usuario_resolvio_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('justificacion_resolucion')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['tipo', 'estado']);
            $table->index(['estado', 'severidad']);
            $table->index(['proyecto_id', 'estado']);
            $table->index(['almacen_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alertas_cerebro_economico');
    }
};
