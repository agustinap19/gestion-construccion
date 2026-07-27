<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('mantenimientos_activo');
        Schema::dropIfExists('asignaciones_activo');
        Schema::dropIfExists('depreciaciones_activo');
        Schema::dropIfExists('seguros_activo');
        Schema::dropIfExists('activos');

        Schema::create('activos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('nombre', 150);
            $table->enum('tipo', ['maquinaria', 'equipo', 'herramienta', 'vehiculo']);
            $table->foreignId('tipo_activo_id')->nullable()->constrained('tipos_activo')->nullOnDelete();
            $table->text('descripcion')->nullable();
            $table->string('marca', 100)->nullable();
            $table->string('modelo', 100)->nullable();
            $table->string('serie')->nullable();
            $table->year('anio_fabricacion')->nullable();
            $table->decimal('costo_dia_uso', 10, 2)->default(0);
            $table->decimal('horas_uso_acumuladas', 8, 2)->default(0);
            $table->decimal('horas_mantenimiento_cada', 8, 2)->default(250);
            $table->enum('estado', ['disponible', 'asignado', 'mantenimiento', 'baja'])->default('disponible');
            $table->enum('propiedad', ['propio', 'arrendado', 'en_comodato'])->default('propio');
            $table->date('fecha_adquisicion')->nullable();
            $table->decimal('valor_adquisicion', 14, 2)->nullable();
            $table->decimal('valor_actual', 14, 2)->nullable();
            $table->integer('vida_util_anios')->nullable();
            $table->enum('metodo_depreciacion', ['lineal', 'saldo_decreciente', 'unidades_produccion'])->nullable();
            $table->decimal('tasa_depreciacion', 5, 2)->nullable();
            $table->foreignId('almacen_id')->nullable()->constrained('almacenes')->nullOnDelete();
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->string('foto_url', 500)->nullable();
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['estado', 'deleted_at']);
            $table->index('almacen_id');
        });

        Schema::create('asignaciones_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('vivienda_id')->nullable()->constrained('viviendas')->nullOnDelete();
            $table->foreignId('personal_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->date('fecha_inicio');
            $table->date('fecha_fin_estimada');
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('horas_dia_estimadas', 4, 1)->default(8);
            $table->decimal('horas_reales_acumuladas', 8, 2)->default(0);
            $table->decimal('costo_total_real', 10, 2)->nullable();
            $table->enum('estado', ['planificada', 'activa', 'completada', 'cancelada'])->default('planificada');
            $table->text('condicion_entrega')->nullable();
            $table->text('condicion_devolucion')->nullable();
            $table->text('notas')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['activo_id', 'estado']);
            $table->index(['proyecto_id', 'fecha_inicio']);
            $table->index(['vivienda_id', 'fecha_inicio']);
        });

        Schema::create('mantenimientos_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->enum('tipo', ['preventivo', 'correctivo', 'predictivo']);
            $table->date('fecha_programada');
            $table->date('fecha_realizada')->nullable();
            $table->text('descripcion');
            $table->decimal('costo', 10, 2)->nullable();
            $table->string('proveedor_servicio', 200)->nullable();
            $table->string('numero_orden_trabajo')->nullable();
            $table->decimal('horas_al_momento', 8, 2);
            $table->enum('estado', ['programado', 'en_proceso', 'completado', 'cancelado', 'vencido'])->default('programado');
            $table->foreignId('realizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['activo_id', 'estado']);
        });

        Schema::create('depreciaciones_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->string('periodo', 7);
            $table->decimal('valor_inicio_periodo', 14, 2);
            $table->decimal('monto_depreciacion', 12, 2);
            $table->decimal('depreciacion_acumulada', 14, 2);
            $table->decimal('valor_neto_contable', 14, 2);
            $table->foreignId('calculado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['activo_id', 'periodo']);
        });

        Schema::create('seguros_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->string('aseguradora');
            $table->string('numero_poliza');
            $table->enum('tipo_seguro', ['todo_riesgo', 'responsabilidad_civil', 'robo', 'incendio', 'otro']);
            $table->decimal('valor_asegurado', 14, 2);
            $table->decimal('prima_anual', 12, 2)->nullable();
            $table->date('fecha_inicio');
            $table->date('fecha_vencimiento');
            $table->enum('estado', ['vigente', 'vencido', 'cancelado'])->default('vigente');
            $table->string('documento_url')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('activo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seguros_activo');
        Schema::dropIfExists('depreciaciones_activo');
        Schema::dropIfExists('mantenimientos_activo');
        Schema::dropIfExists('asignaciones_activo');
        Schema::dropIfExists('activos');
    }
};
