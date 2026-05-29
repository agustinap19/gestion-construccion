<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('documentos_emitidos', function (Blueprint $table) {
            $table->id();
            $table->string('hash')->unique();
            $table->string('tipo_reporte');
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->foreignId('beneficiario_id')->nullable()->constrained('beneficiarios')->nullOnDelete();
            $table->foreignId('usuario_emisor_id')->constrained('users')->restrictOnDelete();
            $table->timestamp('fecha_emision');
            $table->json('parametros_filtros')->nullable();
            $table->string('archivo_path')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documentos_emitidos');
    }
};
