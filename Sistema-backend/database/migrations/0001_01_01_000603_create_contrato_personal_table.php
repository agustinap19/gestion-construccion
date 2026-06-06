<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrato_personal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->string('rol_en_contrato');
            $table->date('fecha_inicio');
            $table->date('fecha_fin')->nullable();
            $table->decimal('honorario_mensual', 10, 2)->nullable();
            $table->enum('estado', ['activo', 'finalizado', 'retirado'])->default('activo');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('contrato_id');
            $table->index('personal_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrato_personal');
    }
};
