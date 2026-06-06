<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maquinaria_equipo', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->enum('tipo', ['maquinaria_pesada', 'vehiculo', 'herramienta', 'equipo_medicion', 'equipo_seguridad', 'otro']);
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->string('serie')->nullable()->unique();
            $table->year('anio_fabricacion')->nullable();
            $table->decimal('capacidad', 10, 2)->nullable();
            $table->string('unidad_capacidad')->nullable();
            $table->enum('estado', ['disponible', 'en_uso', 'mantenimiento', 'reparacion', 'baja'])->default('disponible');
            $table->enum('propiedad', ['propio', 'arrendado', 'prestado'])->default('propio');
            $table->decimal('costo_hora', 10, 2)->nullable();
            $table->decimal('costo_dia', 10, 2)->nullable();
            $table->date('fecha_adquisicion')->nullable();
            $table->decimal('valor_adquisicion', 12, 2)->nullable();
            $table->date('fecha_ultimo_mantenimiento')->nullable();
            $table->date('fecha_proximo_mantenimiento')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maquinaria_equipo');
    }
};
