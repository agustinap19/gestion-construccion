<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items_constructivos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 20)->unique();
            $table->string('nombre', 150);
            $table->text('descripcion')->nullable();
            $table->foreignId('categoria_constructiva_id')->constrained('categorias_constructivas')->restrictOnDelete();
            $table->enum('unidad_base', ['m3', 'm2', 'ml', 'pza', 'glb', 'kg']);
            $table->decimal('rendimiento_horas_hombre', 10, 4)->nullable();
            $table->decimal('precio_unitario_referencial', 14, 4)->nullable();
            $table->boolean('estado')->default(true);
            $table->foreignId('usuario_creador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('usuario_actualizador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('categoria_constructiva_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_constructivos');
    }
};
