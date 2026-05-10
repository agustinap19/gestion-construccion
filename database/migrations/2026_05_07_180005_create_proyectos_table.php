<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proyectos', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('codigo', 30)->unique();
            $table->string('nombre', 200);
            $table->text('descripcion')->nullable();
            $table->foreignId('tipo_proyecto_id')->constrained('tipos_proyecto')->restrictOnDelete();
            $table->enum('categoria', ['social', 'privado']);
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->restrictOnDelete();
            $table->foreignId('entidad_estatal_id')->nullable()->constrained('entidades_estatales')->restrictOnDelete();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->text('direccion_obra')->nullable();
            $table->foreignId('administrador_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->date('fecha_inicio_planificada')->nullable();
            $table->date('fecha_fin_planificada')->nullable();
            $table->date('fecha_inicio_real')->nullable();
            $table->date('fecha_fin_real')->nullable();
            $table->integer('duracion_dias_planificada')->nullable();
            $table->decimal('presupuesto_total', 14, 2)->default(0);
            $table->decimal('monto_garantia', 14, 2)->nullable();
            $table->decimal('porcentaje_avance', 5, 2)->default(0);
            $table->integer('cantidad_unidades')->nullable();
            $table->enum('estado', ['borrador', 'planificacion', 'en_ejecucion', 'pausado', 'finalizado', 'cancelado'])->default('borrador');
            $table->enum('prioridad', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->text('observaciones')->nullable();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tipo_proyecto_id');
            $table->index('categoria');
            $table->index('cliente_id');
            $table->index('entidad_estatal_id');
            $table->index('administrador_id');
            $table->index('estado');
            $table->index('zona_id');
            $table->index('fecha_inicio_planificada');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proyectos');
    }
};
