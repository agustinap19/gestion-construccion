<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('beneficiarios', function (Blueprint $table) {
            $table->id();
            $table->string('codigo_beneficiario')->unique();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('usuario_registrador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nombre');
            $table->string('apellido_paterno');
            $table->string('apellido_materno')->nullable();
            $table->string('ci');
            $table->string('ci_complemento', 5)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->enum('estado_civil', ['soltero', 'casado', 'divorciado', 'viudo', 'union_libre'])->nullable();
            $table->enum('genero', ['masculino', 'femenino', 'otro'])->nullable();
            $table->string('telefono_principal');
            $table->string('telefono_alternativo')->nullable();
            $table->string('email')->nullable();
            $table->integer('cantidad_familiares')->default(0);
            $table->integer('personas_dependientes')->default(0);
            $table->decimal('ingreso_mensual_familiar', 10, 2)->nullable();
            $table->text('direccion_actual')->nullable();
            $table->text('direccion_terreno')->nullable();
            $table->decimal('latitud_terreno', 10, 7)->nullable();
            $table->decimal('longitud_terreno', 10, 7)->nullable();
            $table->string('foto_titular_url')->nullable();
            $table->string('documento_propiedad_terreno_url')->nullable();
            $table->enum('estado_seleccion', [
                'candidato', 'aceptado', 'rechazado',
                'en_construccion', 'vivienda_entregada', 'retirado'
            ])->default('candidato');
            $table->date('fecha_aceptacion')->nullable();
            $table->date('fecha_entrega_vivienda')->nullable();
            $table->foreignId('tipo_vivienda_id')->nullable()->constrained('tipos_vivienda')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proyecto_id', 'ci'], 'beneficiarios_proyecto_ci_unique');
            $table->index('estado_seleccion');
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('beneficiarios');
    }
};
