<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entidades_estatales', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('nombre', 200);
            $table->string('sigla', 20)->nullable();
            $table->enum('nivel', ['nacional', 'departamental', 'municipal', 'autonomo', 'descentralizado', 'otro']);
            $table->string('nit', 20)->unique();
            $table->text('direccion')->nullable();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('telefono_principal', 20)->nullable();
            $table->string('email_oficial', 150)->nullable();
            $table->string('sitio_web', 150)->nullable();
            $table->string('representante_legal', 150)->nullable();
            $table->string('cargo_representante', 100)->nullable();
            $table->string('tipo_proyectos_que_otorga', 255)->nullable();
            $table->enum('estado', ['activa', 'inactiva', 'en_disputa'])->default('activa');
            $table->text('notas')->nullable();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('nivel');
            $table->index('estado');
            $table->index('zona_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entidades_estatales');
    }
};
