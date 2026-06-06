<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Snapshot de ítems afectados por un modificatorio de monto
        Schema::create('items_modificatorio', function (Blueprint $table) {
            $table->id();
            $table->foreignId('modificatorio_id')
                ->constrained('modificatorios_proyecto')
                ->cascadeOnDelete();

            // Referencia al ítem de presupuesto original (nullable: puede ser ítem nuevo)
            $table->foreignId('item_presupuesto_id')->nullable()->constrained('items_presupuesto')->nullOnDelete();

            $table->string('nombre', 200);
            $table->string('unidad', 40)->nullable();

            $table->decimal('cantidad_original', 12, 4)->default(0);
            $table->decimal('precio_unitario', 14, 2)->default(0);
            $table->decimal('cantidad_nueva', 12, 4)->default(0);

            // Calculados: monto_original = cantidad_original * precio_unitario
            $table->decimal('monto_original', 14, 2)->default(0);
            $table->decimal('monto_nuevo', 14, 2)->default(0);
            $table->decimal('delta_monto', 14, 2)->default(0); // monto_nuevo - monto_original

            $table->timestamps();

            $table->index('modificatorio_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_modificatorio');
    }
};
