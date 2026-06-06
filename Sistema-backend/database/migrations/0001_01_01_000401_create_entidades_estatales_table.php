<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entidades_estatales', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('sigla')->nullable();
            $table->enum('nivel', ['nacional', 'departamental', 'municipal', 'otro']);
            $table->string('nit')->nullable()->unique();
            $table->text('direccion')->nullable();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('telefono_principal')->nullable();
            $table->string('email_oficial')->nullable();
            $table->string('sitio_web')->nullable();
            $table->string('representante_legal')->nullable();
            $table->string('cargo_representante')->nullable();
            $table->string('tipo_proyectos_que_otorga')->nullable();
            $table->enum('estado', ['activa', 'inactiva'])->default('activa');
            $table->text('notas')->nullable();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entidades_estatales');
    }
};
