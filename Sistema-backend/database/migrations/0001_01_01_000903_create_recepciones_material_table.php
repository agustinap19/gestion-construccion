<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recepciones_material', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('orden_compra_id')->constrained('ordenes_compra')->cascadeOnDelete();
            $table->foreignId('almacen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('recibido_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('fecha_recepcion');
            $table->string('numero_remision')->nullable();
            $table->enum('estado', ['completa', 'parcial', 'con_observaciones'])->default('completa');
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->index('orden_compra_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recepciones_material');
    }
};
