<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('almacenes', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->text('ubicacion')->nullable();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->enum('tipo', ['central', 'obra', 'temporal'])->default('obra');
            $table->enum('estado', ['activo', 'inactivo', 'cerrado'])->default('activo');
            $table->foreignId('responsable_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('almacenes');
    }
};
