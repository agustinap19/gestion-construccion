<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unidades_funcionales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('tipo_vivienda_id')->nullable()->constrained('tipos_vivienda')->nullOnDelete();
            $table->foreignId('beneficiario_id')->nullable()->constrained('beneficiarios')->nullOnDelete();
            $table->string('codigo');
            $table->string('nombre');
            $table->enum('tipo', ['vivienda', 'infraestructura', 'equipamiento', 'otro'])->default('vivienda');
            $table->decimal('area_terreno', 10, 2)->nullable();
            $table->decimal('area_construccion', 10, 2)->nullable();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->enum('estado', ['libre', 'asignada', 'en_construccion', 'entregada'])->default('libre');
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proyecto_id', 'codigo']);
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unidades_funcionales');
    }
};
