<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cotizaciones', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('solicitado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('fecha_solicitud');
            $table->date('fecha_limite_respuesta')->nullable();
            $table->enum('estado', ['abierta', 'con_respuestas', 'adjudicada', 'cancelada'])->default('abierta');
            $table->text('descripcion_necesidad')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cotizaciones');
    }
};
