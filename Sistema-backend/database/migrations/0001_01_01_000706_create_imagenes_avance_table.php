<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('imagenes_avance', function (Blueprint $table) {
            $table->id();
            $table->morphs('imageable');
            $table->foreignId('subido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('url');
            $table->string('nombre_archivo')->nullable();
            $table->string('tipo_mime')->nullable();
            $table->unsignedBigInteger('tamanio_bytes')->nullable();
            $table->text('descripcion')->nullable();
            $table->boolean('es_principal')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imagenes_avance');
    }
};
