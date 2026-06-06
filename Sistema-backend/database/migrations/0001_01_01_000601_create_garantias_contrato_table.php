<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('garantias_contrato', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->enum('tipo', ['seriedad_oferta', 'cumplimiento', 'correcta_inversion', 'buena_ejecucion', 'otro']);
            $table->string('entidad_emisora');
            $table->string('numero_garantia')->nullable();
            $table->decimal('monto', 12, 2);
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento');
            $table->enum('estado', ['vigente', 'vencida', 'ejecutada', 'devuelta'])->default('vigente');
            $table->string('documento_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('contrato_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('garantias_contrato');
    }
};
