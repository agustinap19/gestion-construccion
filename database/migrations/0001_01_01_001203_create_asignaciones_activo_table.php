<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('asignaciones_activo', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activo_id')->constrained('activos')->cascadeOnDelete();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('personal_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->date('fecha_asignacion');
            $table->date('fecha_devolucion')->nullable();
            $table->enum('estado', ['activa', 'devuelta', 'perdida'])->default('activa');
            $table->text('condicion_entrega')->nullable();
            $table->text('condicion_devolucion')->nullable();
            $table->foreignId('asignado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('recibido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('activo_id');
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('asignaciones_activo');
    }
};
