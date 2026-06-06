<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contrato_entidad', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contrato_id')->constrained('contratos')->cascadeOnDelete();
            $table->foreignId('entidad_estatal_id')->constrained('entidades_estatales')->cascadeOnDelete();
            $table->string('rol_entidad')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['contrato_id', 'entidad_estatal_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contrato_entidad');
    }
};
