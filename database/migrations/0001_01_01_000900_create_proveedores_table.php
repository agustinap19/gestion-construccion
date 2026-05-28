<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('proveedores', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('razon_social');
            $table->string('nombre_comercial')->nullable();
            $table->string('nit')->unique()->nullable();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias_proveedor')->nullOnDelete();
            $table->enum('tipo', ['persona_natural', 'empresa'])->default('empresa');
            $table->string('contacto_nombre')->nullable();
            $table->string('contacto_telefono')->nullable();
            $table->string('contacto_email')->nullable();
            $table->string('telefono_principal')->nullable();
            $table->string('email_oficial')->nullable();
            $table->text('direccion')->nullable();
            $table->foreignId('zona_id')->nullable()->constrained('zonas_geograficas')->nullOnDelete();
            $table->string('sitio_web')->nullable();
            $table->text('productos_servicios')->nullable();
            $table->enum('estado', ['activo', 'inactivo', 'bloqueado'])->default('activo');
            $table->decimal('calificacion', 3, 2)->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('proveedores');
    }
};
