<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adendas_contrato', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->integer('numero_adenda');
            $table->date('fecha_firma');
            $table->decimal('variacion_monto', 14, 2)->default(0);
            $table->integer('variacion_plazo_dias')->default(0);
            $table->text('motivo');
            $table->string('documento_url')->nullable();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['contrato_id', 'numero_adenda']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adendas_contrato');
    }
};
