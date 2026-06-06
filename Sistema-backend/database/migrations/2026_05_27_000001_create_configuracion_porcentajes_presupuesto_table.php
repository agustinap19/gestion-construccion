<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_porcentajes_presupuesto', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo_proyecto', ['social', 'privado'])->unique();
            $table->decimal('porcentaje_mano_obra', 5, 2)->default(30.00);
            $table->decimal('porcentaje_gastos_generales', 5, 2)->default(12.00);
            $table->decimal('porcentaje_utilidad_esperada', 5, 2)->default(15.00);
            $table->decimal('umbral_rentabilidad_minima', 5, 2)->default(5.00);
            $table->text('notas')->nullable();
            $table->foreignId('usuario_actualizador_id')
                  ->nullable()
                  ->references('id')->on('users')
                  ->nullOnDelete()
                  ->name('cfg_pp_usuario_actualizador_fk');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_porcentajes_presupuesto');
    }
};
