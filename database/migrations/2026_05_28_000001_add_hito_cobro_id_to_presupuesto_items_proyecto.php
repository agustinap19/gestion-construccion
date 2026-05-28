<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presupuesto_items_proyecto', function (Blueprint $table) {
            $table->foreignId('hito_cobro_id')
                ->nullable()
                ->after('producto_contractual_id')
                ->constrained('hitos_cobro_proyecto')
                ->nullOnDelete();

            $table->index('hito_cobro_id');
        });
    }

    public function down(): void
    {
        Schema::table('presupuesto_items_proyecto', function (Blueprint $table) {
            $table->dropForeign(['hito_cobro_id']);
            $table->dropIndex(['hito_cobro_id']);
            $table->dropColumn('hito_cobro_id');
        });
    }
};
