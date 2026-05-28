<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tipos_vivienda', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->decimal('metros_cuadrados', 8, 2)->nullable();
            $table->integer('cantidad_dormitorios')->nullable();
            $table->integer('cantidad_banos')->nullable();
            $table->decimal('costo_referencial', 12, 2)->nullable();
            $table->enum('estado', ['activo', 'inactivo'])->default('activo');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tipos_vivienda');
    }
};
