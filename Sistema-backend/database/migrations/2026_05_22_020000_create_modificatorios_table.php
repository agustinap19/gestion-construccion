<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modificatorios_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();

            // Tipo: monto (suma cero) | plazo (ampliación de tiempo)
            $table->string('tipo', 20); // monto | plazo
            // Subtipo para monto: redistribucion | ampliacion | reduccion
            $table->string('subtipo', 40)->nullable();
            // Estado: borrador → pendiente_aprobacion → aprobado | rechazado → aplicado
            $table->string('estado', 30)->default('borrador');

            // Motivo / justificación
            $table->string('motivo', 200);
            $table->text('justificacion');
            $table->text('justificativo_legal')->nullable(); // texto autogenerado/editable

            // Campos específicos para tipo=monto
            $table->decimal('monto_original', 14, 2)->nullable();
            $table->decimal('monto_nuevo', 14, 2)->nullable();      // debe = monto_original (suma cero)
            $table->decimal('delta_monto', 14, 2)->default(0);       // siempre 0 para suma-cero

            // Campos específicos para tipo=plazo
            $table->integer('plazo_original_dias')->nullable();
            $table->integer('dias_ampliacion')->nullable();
            $table->integer('plazo_nuevo_dias')->nullable();
            $table->date('fecha_fin_original')->nullable();
            $table->date('fecha_fin_nueva')->nullable();

            // Número correlativo (ej: MOD-0001-2026)
            $table->string('numero', 30)->nullable();

            // Auditoría
            $table->foreignId('creado_por_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('rechazado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aplicado_por_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('fecha_aprobacion')->nullable();
            $table->timestamp('fecha_rechazo')->nullable();
            $table->timestamp('fecha_aplicacion')->nullable();
            $table->text('razon_rechazo')->nullable();

            // URL del documento oficial (firmado, PDF cargado)
            $table->string('documento_url')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['proyecto_id', 'estado']);
            $table->index(['proyecto_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('modificatorios_proyecto');
    }
};
