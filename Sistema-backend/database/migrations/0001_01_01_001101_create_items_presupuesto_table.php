<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items_presupuesto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('presupuesto_id')->constrained('presupuestos')->cascadeOnDelete();
            $table->foreignId('partida_id')->nullable()->constrained('partidas')->nullOnDelete();
            $table->foreignId('item_padre_id')->nullable()->constrained('items_presupuesto')->nullOnDelete();
            $table->string('codigo_item');
            $table->string('descripcion');
            $table->integer('nivel')->default(1);
            $table->boolean('es_hoja')->default(true);
            $table->foreignId('unidad_medida_id')->nullable()->constrained('unidades_medida')->nullOnDelete();
            $table->decimal('metrado', 12, 4)->default(0);
            $table->decimal('precio_unitario', 12, 4)->default(0);
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->integer('orden')->default(0);
            $table->timestamps();

            $table->index('presupuesto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_presupuesto');
    }
};
