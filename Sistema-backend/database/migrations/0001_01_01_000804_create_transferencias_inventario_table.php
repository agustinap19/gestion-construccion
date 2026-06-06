<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transferencias_inventario', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('almacen_origen_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('almacen_destino_id')->constrained('almacenes')->cascadeOnDelete();
            $table->foreignId('solicitado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('fecha_solicitud');
            $table->date('fecha_transferencia')->nullable();
            $table->enum('estado', ['pendiente', 'aprobada', 'en_transito', 'recibida', 'rechazada'])->default('pendiente');
            $table->text('motivo')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transferencias_inventario');
    }
};
