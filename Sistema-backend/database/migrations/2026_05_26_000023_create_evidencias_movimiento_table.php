<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evidencias_movimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('movimiento_almacen_id')
                  ->constrained('movimientos_almacen')
                  ->cascadeOnDelete();

            $table->enum('tipo', ['foto', 'firma', 'documento']);
            $table->string('archivo_url');
            $table->string('hash_validacion', 64)->nullable(); // SHA-256

            // Metadata de captura
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->string('dispositivo', 120)->nullable();

            $table->foreignId('usuario_captura_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->timestamp('fecha_captura')->useCurrent();
            $table->timestamps();

            $table->index(['movimiento_almacen_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evidencias_movimiento');
    }
};
