<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presupuesto_material_distribucion', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('presupuesto_material_id');
            $table->foreign('presupuesto_material_id', 'fk_pmd_pmp')
                ->references('id')->on('presupuesto_material_proyecto')
                ->cascadeOnDelete();
            $table->enum('entidad_tipo', ['producto', 'fase']);
            $table->unsignedBigInteger('entidad_id');
            $table->decimal('cantidad_asignada', 12, 4);
            $table->decimal('porcentaje_asignado', 8, 4)->default(0);
            $table->timestamps();

            $table->index('presupuesto_material_id');
            $table->index(['entidad_tipo', 'entidad_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presupuesto_material_distribucion');
    }
};
