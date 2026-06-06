<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('overrides_items_proyecto', function (Blueprint $table) {
            $table->id();

            $table->foreignId('proyecto_id')
                  ->constrained('proyectos')->cascadeOnDelete();

            $table->foreignId('item_constructivo_id')
                  ->constrained('items_constructivos')->cascadeOnDelete();

            $table->foreignId('material_id')
                  ->constrained('materiales')->restrictOnDelete();

            $table->decimal('cantidad_por_unidad_base', 14, 4);

            // tipologia = aplica a todas las viviendas del proyecto con este item
            // vivienda   = aplica solo a vivienda_id específica
            $table->enum('nivel', ['tipologia', 'vivienda'])->default('tipologia');

            // NULL = tipología completa; NOT NULL = vivienda específica
            $table->foreignId('vivienda_id')
                  ->nullable()->constrained('viviendas')->nullOnDelete();

            $table->text('justificacion');

            $table->foreignId('usuario_autorizador_id')
                  ->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['proyecto_id', 'item_constructivo_id', 'material_id', 'vivienda_id'],
                'oip_proy_item_mat_viv_unique'
            );
            $table->index(['proyecto_id', 'item_constructivo_id'], 'oip_proy_item_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('overrides_items_proyecto');
    }
};
