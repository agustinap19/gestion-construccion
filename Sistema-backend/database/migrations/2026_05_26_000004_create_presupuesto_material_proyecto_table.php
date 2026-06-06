<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presupuesto_material_proyecto', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materiales')->cascadeOnDelete();
            $table->decimal('cantidad_total_planificada', 12, 4);
            $table->decimal('precio_unitario_presupuestado', 12, 4);
            // Snapshot: no se actualiza si cambia el precio del material
            $table->decimal('monto_total', 14, 4)->storedAs('cantidad_total_planificada * precio_unitario_presupuestado');
            $table->text('notas')->nullable();
            $table->foreignId('registrado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proyecto_id', 'material_id', 'deleted_at'], 'pmp_proyecto_material_unique');
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presupuesto_material_proyecto');
    }
};
