<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planillas_pago', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->unsignedBigInteger('proyecto_id')->nullable();
            $table->foreignId('generado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('periodo_mes', 7);
            $table->date('fecha_inicio_periodo');
            $table->date('fecha_fin_periodo');
            $table->enum('frecuencia', ['semanal', 'quincenal', 'mensual']);
            $table->decimal('total_bruto', 12, 2)->default(0);
            $table->decimal('total_descuentos', 12, 2)->default(0);
            $table->decimal('total_neto', 12, 2)->default(0);
            $table->enum('estado', ['borrador', 'aprobada', 'pagada', 'anulada'])->default('borrador');
            $table->date('fecha_aprobacion')->nullable();
            $table->date('fecha_pago')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planillas_pago');
    }
};
