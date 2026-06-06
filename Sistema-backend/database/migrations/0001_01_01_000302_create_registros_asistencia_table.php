<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_asistencia', function (Blueprint $table) {
            $table->id();
            $table->foreignId('personal_id')->constrained('personal')->cascadeOnDelete();
            $table->unsignedBigInteger('proyecto_id')->nullable();
            $table->date('fecha');
            $table->enum('tipo', ['entrada', 'salida', 'descanso']);
            $table->time('hora');
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('metodo_registro')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('proyecto_id');
            $table->index(['personal_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_asistencia');
    }
};
