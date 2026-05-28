<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonas_geograficas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('departamento');
            $table->string('provincia')->nullable();
            $table->string('municipio')->nullable();
            $table->decimal('latitud_centro', 10, 7)->nullable();
            $table->decimal('longitud_centro', 10, 7)->nullable();
            $table->decimal('radio_km', 6, 2)->nullable();
            $table->string('codigo_postal')->nullable();
            $table->enum('estado', ['activa', 'inactiva'])->default('activa');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zonas_geograficas');
    }
};
