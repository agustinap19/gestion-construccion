<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_recepcion', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recepcion_id')->constrained('recepciones_material')->cascadeOnDelete();
            $table->foreignId('detalle_orden_id')->constrained('detalles_orden_compra')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('cantidad_recibida', 12, 4);
            $table->decimal('cantidad_rechazada', 12, 4)->default(0);
            $table->string('motivo_rechazo')->nullable();
            $table->enum('condicion', ['buena', 'aceptable', 'defectuosa'])->default('buena');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('recepcion_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_recepcion');
    }
};
