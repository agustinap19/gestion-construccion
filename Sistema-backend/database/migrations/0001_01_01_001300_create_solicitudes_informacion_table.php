<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_informacion', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->string('nombre_solicitante');
            $table->string('ci_solicitante')->nullable();
            $table->string('telefono_solicitante')->nullable();
            $table->string('email_solicitante')->nullable();
            $table->text('descripcion_solicitud');
            $table->enum('tipo_informacion', ['avance_obra', 'documentos', 'estado_beneficiario', 'otro']);
            $table->enum('canal', ['presencial', 'email', 'telefono', 'web'])->default('presencial');
            $table->date('fecha_solicitud');
            $table->date('fecha_respuesta_limite')->nullable();
            $table->date('fecha_respuesta_real')->nullable();
            $table->enum('estado', ['recibida', 'en_proceso', 'respondida', 'archivada'])->default('recibida');
            $table->text('respuesta')->nullable();
            $table->foreignId('atendido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('proyecto_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_informacion');
    }
};
