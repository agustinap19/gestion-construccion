<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('solicitudes_material', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('actividad_id')->nullable()->constrained('actividades')->nullOnDelete();
            $table->foreignId('almacen_id')->nullable()->constrained('almacenes')->nullOnDelete();
            $table->foreignId('solicitado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('fecha_solicitud');
            $table->date('fecha_necesidad')->nullable();
            $table->enum('estado', ['pendiente', 'aprobada', 'parcialmente_atendida', 'atendida', 'rechazada', 'cancelada'])->default('pendiente');
            $table->enum('prioridad', ['baja', 'normal', 'alta', 'urgente'])->default('normal');
            $table->text('justificacion')->nullable();
            $table->text('observaciones_aprobacion')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('solicitudes_material');
    }
};
