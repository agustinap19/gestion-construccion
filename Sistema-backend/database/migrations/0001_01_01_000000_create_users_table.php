<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();

            $table->string('nombre')->nullable();
            $table->string('apellido_paterno')->nullable();
            $table->string('apellido_materno')->nullable();
            $table->string('ci')->unique()->nullable();
            $table->string('ci_complemento', 5)->nullable();
            $table->string('telefono')->nullable();
            $table->text('direccion')->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('foto_url')->nullable();

            // FK diferida — se agrega en 0001_01_01_000100
            $table->unsignedBigInteger('rol_id')->nullable();

            $table->enum('estado', ['activo', 'inactivo', 'suspendido'])->default('activo');
            $table->boolean('debe_cambiar_password')->default(true);
            $table->integer('intentos_fallidos')->default(0);
            $table->timestamp('bloqueado_hasta')->nullable();

            $table->boolean('rostro_registrado')->default(false);
            $table->longText('descriptor_facial')->nullable();
            $table->longText('rostro_base64')->nullable();
            $table->timestamp('rostro_registrado_en')->nullable();

            $table->timestamp('password_cambiado_en')->nullable();
            $table->boolean('es_admin_central')->default(false);
            $table->timestamp('ultimo_acceso')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
