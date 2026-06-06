<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plantillas_constructivas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->enum('tipo_obra', ['vivienda_social', 'casa_privada', 'edificio', 'remodelacion', 'otro'])->default('vivienda_social');
            $table->string('tipologia', 50)->nullable();
            $table->unsignedSmallInteger('version')->default(1);
            $table->boolean('estado')->default(true);
            $table->boolean('es_sistema')->default(false);
            $table->foreignId('usuario_creador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('usuario_actualizador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tipo_obra');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plantillas_constructivas');
    }
};
