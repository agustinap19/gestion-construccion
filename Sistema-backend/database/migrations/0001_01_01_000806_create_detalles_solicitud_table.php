<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detalles_solicitud', function (Blueprint $table) {
            $table->id();
            $table->foreignId('solicitud_id')->constrained('solicitudes_material')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('cantidad_solicitada', 12, 4);
            $table->decimal('cantidad_aprobada', 12, 4)->nullable();
            $table->decimal('cantidad_entregada', 12, 4)->default(0);
            $table->text('especificaciones')->nullable();
            $table->enum('estado', ['pendiente', 'aprobado', 'entregado', 'rechazado'])->default('pendiente');
            $table->timestamps();

            $table->index('solicitud_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detalles_solicitud');
    }
};
