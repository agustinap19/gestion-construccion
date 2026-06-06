<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items_plantilla_constructiva', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plantilla_id')->constrained('plantillas_constructivas')->cascadeOnDelete();
            $table->foreignId('item_constructivo_id')->constrained('items_constructivos')->restrictOnDelete();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->decimal('ponderacion_avance', 6, 4)->default(0);
            $table->decimal('cantidad_sugerida', 14, 4)->nullable();
            $table->timestamps();

            $table->unique(['plantilla_id', 'item_constructivo_id'], 'ipc_plantilla_item_unique');
            $table->index('plantilla_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_plantilla_constructiva');
    }
};
