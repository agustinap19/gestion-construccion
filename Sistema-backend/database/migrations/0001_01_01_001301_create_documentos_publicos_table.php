<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documentos_publicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete();
            $table->string('titulo');
            $table->text('descripcion')->nullable();
            $table->enum('categoria', ['contrato', 'plano', 'informe_avance', 'fotografia', 'acta', 'certificacion', 'otro']);
            $table->string('archivo_url');
            $table->string('nombre_archivo')->nullable();
            $table->string('tipo_mime')->nullable();
            $table->unsignedBigInteger('tamanio_bytes')->nullable();
            $table->boolean('es_publico')->default(false);
            $table->date('fecha_documento')->nullable();
            $table->foreignId('subido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->integer('descargas')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('es_publico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documentos_publicos');
    }
};
