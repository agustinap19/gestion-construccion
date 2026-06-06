<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal_competencia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->foreignId('competencia_id')->constrained('competencias')->cascadeOnDelete();
            $table->date('fecha_emision')->nullable();
            $table->date('fecha_vencimiento')->nullable();
            $table->string('entidad_emisora')->nullable();
            $table->string('numero_certificado')->nullable();
            $table->string('archivo_url')->nullable();
            $table->enum('estado', ['vigente', 'vencida', 'por_vencer'])->default('vigente');
            $table->timestamps();

            $table->unique(['personal_id', 'competencia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_competencia');
    }
};
