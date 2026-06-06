<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('logs_exportacion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('recurso', 80);           // proyectos, beneficiarios, personal, etc.
            $table->string('formato', 10);           // pdf, excel
            $table->string('nombre_archivo', 200)->nullable();
            $table->json('parametros')->nullable();  // filtros aplicados
            $table->string('ip', 45)->nullable();
            $table->unsignedInteger('filas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logs_exportacion');
    }
};
