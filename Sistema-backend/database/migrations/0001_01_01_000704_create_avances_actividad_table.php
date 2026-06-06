<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('avances_actividad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('actividad_id')->constrained('actividades')->cascadeOnDelete();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('fecha');
            $table->decimal('metrado_avance', 12, 4);
            $table->decimal('porcentaje_avance', 5, 2);
            $table->text('descripcion')->nullable();
            $table->boolean('requiere_validacion')->default(false);
            $table->boolean('validado')->default(false);
            $table->foreignId('validado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('fecha_validacion')->nullable();
            $table->timestamps();

            $table->index('actividad_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('avances_actividad');
    }
};
