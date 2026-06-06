<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items_checklist', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fase_id')->nullable()->constrained('fases_proyecto')->cascadeOnDelete();
            $table->foreignId('vivienda_id')->nullable()->constrained('viviendas')->cascadeOnDelete();
            $table->foreignId('item_plantilla_id')->nullable()->constrained('items_plantilla')->nullOnDelete();
            $table->string('nombre');
            $table->integer('orden')->default(0);
            $table->decimal('ponderacion', 5, 2)->default(0);
            $table->enum('estado', ['pendiente', 'en_proceso', 'completado', 'observado'])->default('pendiente');
            $table->text('notas')->nullable();
            $table->date('fecha_completado')->nullable();
            $table->timestamps();

            $table->index(['fase_id', 'estado']);
            $table->index(['vivienda_id', 'estado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_checklist');
    }
};
