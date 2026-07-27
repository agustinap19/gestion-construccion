<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('actas_entrega_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asignacion_activo_id')->constrained('asignaciones_activo')->cascadeOnDelete();
            $table->foreignId('vivienda_id')->constrained('viviendas')->cascadeOnDelete();
            $table->foreignId('beneficiario_id')->constrained('beneficiarios')->cascadeOnDelete();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->string('numero_acta', 30)->unique();
            $table->date('fecha_entrega_estimada');
            $table->date('fecha_devolucion_estimada');
            $table->date('fecha_entrega_real')->nullable();
            $table->date('fecha_devolucion_real')->nullable();
            $table->enum('estado', ['generada', 'impresa', 'firmada_subida', 'aprobada', 'entregada', 'devuelta'])->default('generada');
            $table->string('pdf_generado_url', 500)->nullable();
            $table->string('pdf_firmado_url', 500)->nullable();
            $table->string('foto_entrega_url', 500)->nullable();
            $table->string('foto_devolucion_url', 500)->nullable();
            $table->enum('estado_devolucion', ['bueno', 'dañado', 'con_observaciones'])->nullable();
            $table->text('observaciones')->nullable();
            $table->text('nota_rechazo')->nullable();
            $table->foreignId('aprobado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['asignacion_activo_id', 'estado']);
            $table->index(['activo_id', 'estado']);
            $table->index('vivienda_id');
            $table->index(['fecha_devolucion_estimada', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('actas_entrega_activo');
    }
};
