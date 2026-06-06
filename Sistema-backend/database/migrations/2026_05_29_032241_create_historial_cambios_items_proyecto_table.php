<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historial_cambios_items_proyecto', function (Blueprint $table) {
            $table->id();

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')->cascadeOnDelete();

            $table->foreignId('usuario_id')
                  ->constrained('users')->restrictOnDelete();

            // cantidad | receta_tipologia | receta_vivienda | agregar_item
            // quitar_item | item_especial | actualizar_recetas
            $table->string('tipo_cambio', 60);

            $table->foreignId('pip_id')
                  ->nullable()
                  ->constrained('presupuesto_items_proyecto')
                  ->nullOnDelete();

            $table->foreignId('vivienda_id')
                  ->nullable()->constrained('viviendas')->nullOnDelete();

            $table->json('valores_antes')->nullable();
            $table->json('valores_despues')->nullable();
            $table->text('descripcion')->nullable();

            $table->timestamps();

            $table->index('proyecto_id');
            $table->index(['proyecto_id', 'tipo_cambio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historial_cambios_items_proyecto');
    }
};
