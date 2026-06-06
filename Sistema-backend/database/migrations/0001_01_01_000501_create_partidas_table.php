<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('partidas', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->foreignId('unidad_medida_id')->nullable()->constrained('unidades_medida')->nullOnDelete();
            $table->foreignId('partida_padre_id')->nullable()->constrained('partidas')->nullOnDelete();
            $table->integer('nivel')->default(1);
            $table->boolean('es_hoja')->default(true);
            $table->decimal('rendimiento_unitario', 10, 4)->nullable();
            $table->timestamps();

            $table->index('partida_padre_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partidas');
    }
};
