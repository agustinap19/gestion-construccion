<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_planilla', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planilla_id')->constrained('planillas_pago')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->decimal('salario_base', 10, 2);
            $table->integer('dias_trabajados')->default(0);
            $table->integer('horas_extra')->default(0);
            $table->decimal('bono_productividad', 10, 2)->default(0);
            $table->decimal('otros_ingresos', 10, 2)->default(0);
            $table->decimal('descuento_afp', 10, 2)->default(0);
            $table->decimal('descuento_cns', 10, 2)->default(0);
            $table->decimal('otros_descuentos', 10, 2)->default(0);
            $table->decimal('total_bruto', 10, 2)->default(0);
            $table->decimal('total_neto', 10, 2)->default(0);
            $table->string('banco')->nullable();
            $table->string('numero_cuenta')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['planilla_id', 'personal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_planilla');
    }
};
