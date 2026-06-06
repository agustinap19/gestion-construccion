<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('productos_contractuales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->string('nombre');
            $table->decimal('porcentaje', 5, 2);
            $table->decimal('monto_calculado', 14, 2)->default(0);
            $table->date('fecha_planificada_cobro');
            $table->date('fecha_cobro_real')->nullable();
            $table->enum('estado', ['pendiente', 'en_proceso', 'cobrado'])->default('pendiente');
            $table->text('observaciones')->nullable();
            $table->integer('orden')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('productos_contractuales');
    }
};
