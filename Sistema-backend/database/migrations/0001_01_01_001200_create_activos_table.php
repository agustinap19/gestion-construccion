<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->foreignId('tipo_activo_id')->nullable()->constrained('tipos_activo')->nullOnDelete();
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->string('serie')->nullable();
            $table->year('anio_fabricacion')->nullable();
            $table->date('fecha_adquisicion')->nullable();
            $table->decimal('valor_adquisicion', 14, 2)->nullable();
            $table->decimal('valor_actual', 14, 2)->nullable();
            $table->enum('estado', ['activo', 'en_uso', 'mantenimiento', 'baja', 'vendido'])->default('activo');
            $table->enum('propiedad', ['propio', 'arrendado', 'en_comodato'])->default('propio');
            $table->string('ubicacion')->nullable();
            $table->foreignId('proyecto_actual_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->integer('vida_util_anios')->nullable();
            $table->enum('metodo_depreciacion', ['lineal', 'saldo_decreciente', 'unidades_produccion'])->nullable();
            $table->decimal('tasa_depreciacion', 5, 2)->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tipo_activo_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activos');
    }
};
