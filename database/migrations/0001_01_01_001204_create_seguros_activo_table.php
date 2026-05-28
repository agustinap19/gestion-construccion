<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seguros_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->string('aseguradora');
            $table->string('numero_poliza');
            $table->enum('tipo_seguro', ['todo_riesgo', 'responsabilidad_civil', 'robo', 'incendio', 'otro']);
            $table->decimal('valor_asegurado', 14, 2);
            $table->decimal('prima_anual', 12, 2)->nullable();
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento');
            $table->enum('estado', ['vigente', 'vencido', 'cancelado'])->default('vigente');
            $table->string('documento_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('activo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seguros_activo');
    }
};
