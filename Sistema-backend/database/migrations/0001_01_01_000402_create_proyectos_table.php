<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proyectos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->enum('categoria', ['social', 'privado'])->default('social');
            $table->enum('prioridad', ['baja', 'media', 'alta', 'critica'])->default('media');
            $table->integer('cantidad_unidades')->nullable();
            $table->foreignId('tipo_proyecto_id')->nullable()->constrained('tipos_proyecto')->nullOnDelete();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('entidad_estatal_id')->nullable()->constrained('entidades_estatales')->nullOnDelete();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->text('direccion_obra')->nullable();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->enum('estado', [
                'formulacion', 'licitacion', 'adjudicado', 'en_ejecucion',
                'pausado', 'finalizado', 'cancelado'
            ])->default('formulacion');
            $table->date('fecha_inicio_planificada')->nullable();
            $table->date('fecha_fin_planificada')->nullable();
            $table->date('fecha_inicio_real')->nullable();
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('presupuesto_referencial', 14, 2)->nullable();
            $table->decimal('monto_contrato', 14, 2)->nullable();
            $table->decimal('avance_fisico', 5, 2)->default(0);
            $table->decimal('avance_financiero', 5, 2)->default(0);
            $table->foreignId('responsable_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('creado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('estado');
            $table->index('cliente_id');
            $table->index('entidad_estatal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proyectos');
    }
};
