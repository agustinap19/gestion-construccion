<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_competencia', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->foreignId('competencia_id')->constrained('competencias');
            $table->date('fecha_emision');
            $table->date('fecha_vencimiento')->nullable();
            $table->string('entidad_emisora', 120)->nullable();
            $table->string('numero_certificado', 80)->nullable();
            $table->string('archivo_url', 255)->nullable();
            $table->enum('estado', ['vigente', 'vencida', 'suspendida'])->default('vigente');
            $table->timestamps();

            $table->index('personal_id');
            $table->index('fecha_vencimiento');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_competencia');
    }
};
