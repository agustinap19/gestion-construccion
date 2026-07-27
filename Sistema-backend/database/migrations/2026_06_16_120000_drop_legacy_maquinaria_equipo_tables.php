<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('uso_maquinaria');
        Schema::dropIfExists('maquinaria_equipo');
    }

    public function down(): void
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

        Schema::create('uso_maquinaria', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maquinaria_id')->constrained('maquinaria_equipo')->cascadeOnDelete();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('actividad_id')->nullable()->constrained('actividades')->nullOnDelete();
            $table->foreignId('operador_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->date('fecha');
            $table->decimal('horas_uso', 8, 2)->default(0);
            $table->decimal('costo_total', 12, 2)->nullable();
            $table->decimal('horometro_inicio', 10, 2)->nullable();
            $table->decimal('horometro_fin', 10, 2)->nullable();
            $table->decimal('combustible_consumido', 10, 2)->nullable();
            $table->text('trabajo_realizado')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['maquinaria_id', 'fecha']);
            $table->index('proyecto_id');
        });
    }
};
