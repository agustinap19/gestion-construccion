<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planillas_pago', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->unsignedBigInteger('proyecto_id')->nullable();
            $table->date('periodo_inicio');
            $table->date('periodo_fin');
            $table->enum('tipo', ['semanal', 'quincenal', 'mensual']);
            $table->decimal('monto_total', 12, 2)->default(0);
            $table->enum('estado', ['borrador', 'aprobada', 'pagada', 'anulada'])->default('borrador');
            $table->date('fecha_pago')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('periodo_inicio');
            $table->index('proyecto_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planillas_pago');
    }
};
