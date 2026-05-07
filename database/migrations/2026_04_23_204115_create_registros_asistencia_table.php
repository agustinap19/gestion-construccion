<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_asistencia', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('personal_id')->constrained('personal');
            $table->unsignedBigInteger('proyecto_id')->nullable();
            $table->date('fecha');
            $table->time('hora_ingreso')->nullable();
            $table->time('hora_salida')->nullable();
            $table->decimal('latitud_ingreso', 10, 7)->nullable();
            $table->decimal('longitud_ingreso', 10, 7)->nullable();
            $table->enum('tipo_registro', ['gps', 'manual']);
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('personal_id');
            $table->index('fecha');
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_asistencia');
    }
};
