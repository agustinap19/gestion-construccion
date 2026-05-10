<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->enum('tipo', ['persona_natural', 'empresa']);
            $table->string('nombre_completo', 150);
            $table->string('nombre_comercial', 150)->nullable();
            $table->enum('documento_tipo', ['ci', 'nit', 'pasaporte', 'rut_extranjero'])->default('ci');
            $table->string('documento_numero', 30);
            $table->string('documento_complemento', 5)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('telefono_principal', 20)->nullable();
            $table->string('telefono_alternativo', 20)->nullable();
            $table->text('direccion')->nullable();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('representante_legal', 150)->nullable();
            $table->string('cargo_representante', 100)->nullable();
            $table->string('sector', 80)->nullable();
            $table->text('notas')->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'potencial', 'bloqueado'])->default('activo');
            $table->enum('origen', ['directo', 'referido', 'sitio_web', 'licitacion', 'otro'])->default('directo');
            $table->foreignId('cliente_referido_por')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('tipo');
            $table->index('documento_numero');
            $table->index('email');
            $table->index('estado');
            $table->index('zona_id');
            $table->unique(['documento_tipo', 'documento_numero']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
