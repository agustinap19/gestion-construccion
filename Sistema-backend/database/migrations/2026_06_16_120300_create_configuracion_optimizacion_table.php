<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_optimizacion', function (Blueprint $table) {
            $table->id();
            $table->decimal('peso_atraso', 4, 2)->default(0.40);
            $table->decimal('peso_plazo', 4, 2)->default(0.30);
            $table->decimal('peso_penalidad', 4, 2)->default(0.20);
            $table->decimal('peso_distancia', 4, 2)->default(0.10);
            $table->decimal('peso_gerente_override', 4, 2)->default(2.00);
            $table->enum('modo_asignacion_default', ['sugerencia', 'automatico'])->default('sugerencia');
            $table->decimal('radio_cluster_km', 5, 2)->default(2.00);
            $table->decimal('tiempo_traslado_por_km_min', 5, 2)->default(15.00);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_optimizacion');
    }
};
