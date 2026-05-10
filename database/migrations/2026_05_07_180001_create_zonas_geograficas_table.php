<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('zonas_geograficas', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('nombre', 120);
            $table->string('departamento', 50);
            $table->string('provincia', 80)->nullable();
            $table->string('municipio', 100)->nullable();
            $table->decimal('latitud_centro', 10, 7)->nullable();
            $table->decimal('longitud_centro', 10, 7)->nullable();
            $table->decimal('radio_km', 6, 2)->nullable();
            $table->string('codigo_postal', 10)->nullable();
            $table->enum('estado', ['activa', 'inactiva'])->default('activa');
            $table->timestamps();

            $table->index('departamento');
            $table->index('estado');
            $table->index(['latitud_centro', 'longitud_centro']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zonas_geograficas');
    }
};
