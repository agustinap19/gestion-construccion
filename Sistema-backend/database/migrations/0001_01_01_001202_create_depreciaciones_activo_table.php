<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('depreciaciones_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->string('periodo', 7);
            $table->decimal('valor_inicio_periodo', 14, 2);
            $table->decimal('monto_depreciacion', 12, 2);
            $table->decimal('depreciacion_acumulada', 14, 2);
            $table->decimal('valor_neto_contable', 14, 2);
            $table->foreignId('calculado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['activo_id', 'periodo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('depreciaciones_activo');
    }
};
