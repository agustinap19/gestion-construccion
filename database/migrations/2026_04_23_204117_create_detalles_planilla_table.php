<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_planilla', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('planilla_id')->constrained('planillas_pago')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal');
            $table->decimal('dias_trabajados', 5, 2)->default(0);
            $table->decimal('horas_extras', 5, 2)->default(0)->nullable();
            $table->decimal('bonos', 10, 2)->default(0)->nullable();
            $table->decimal('descuentos', 10, 2)->default(0)->nullable();
            $table->decimal('monto_bruto', 10, 2);
            $table->decimal('monto_neto', 10, 2);
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
