<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->enum('tipo', ['persona_natural', 'empresa']);
            $table->string('nombre_completo');
            $table->string('nombre_comercial')->nullable();
            $table->enum('documento_tipo', ['ci', 'nit', 'pasaporte', 'cedula_extranjera']);
            $table->string('documento_numero');
            $table->string('documento_complemento', 10)->nullable();
            $table->string('email')->nullable();
            $table->string('telefono_principal');
            $table->string('telefono_alternativo')->nullable();
            $table->text('direccion')->nullable();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('representante_legal')->nullable();
            $table->string('cargo_representante')->nullable();
            $table->string('sector')->nullable();
            $table->text('notas')->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'potencial', 'bloqueado'])->default('activo');
            $table->string('origen')->nullable();
            $table->foreignId('cliente_referido_por')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['documento_tipo', 'documento_numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
