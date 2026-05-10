<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beneficiarios', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->string('codigo_beneficiario', 30)->unique();
            $table->string('nombre', 80);
            $table->string('apellido_paterno', 80);
            $table->string('apellido_materno', 80)->nullable();
            $table->string('ci', 20);
            $table->string('ci_complemento', 5)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->enum('estado_civil', ['soltero', 'casado', 'divorciado', 'viudo', 'union_libre', 'otro'])->nullable();
            $table->enum('genero', ['masculino', 'femenino', 'otro'])->nullable();
            $table->string('telefono_principal', 20)->nullable();
            $table->string('telefono_alternativo', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->integer('cantidad_familiares')->default(1);
            $table->integer('personas_dependientes')->default(0);
            $table->decimal('ingreso_mensual_familiar', 10, 2)->nullable();
            $table->text('direccion_actual')->nullable();
            $table->text('direccion_terreno')->nullable();
            $table->decimal('latitud_terreno', 10, 7)->nullable();
            $table->decimal('longitud_terreno', 10, 7)->nullable();
            $table->string('foto_titular_url', 255)->nullable();
            $table->string('documento_propiedad_terreno_url', 255)->nullable();
            $table->enum('estado_seleccion', ['candidato', 'aceptado', 'en_construccion', 'vivienda_entregada', 'retirado', 'rechazado'])->default('aceptado');
            $table->date('fecha_aceptacion')->nullable();
            $table->date('fecha_entrega_vivienda')->nullable();
            $table->foreignId('tipo_vivienda_id')->nullable()->constrained('tipos_vivienda')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->foreignId('usuario_registrador_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proyecto_id', 'ci']);
            $table->index('proyecto_id');
            $table->index('estado_seleccion');
            $table->index('ci');
            $table->index(['latitud_terreno', 'longitud_terreno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beneficiarios');
    }
};
