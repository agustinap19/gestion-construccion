<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('materiales', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->foreignId('categoria_id')->nullable()->constrained('categorias_material')->nullOnDelete();
            $table->foreignId('unidad_medida_id')->nullable()->constrained('unidades_medida')->nullOnDelete();
            $table->decimal('precio_referencial', 12, 4)->nullable();
            $table->decimal('stock_minimo', 12, 4)->default(0);
            $table->string('marca')->nullable();
            $table->string('modelo')->nullable();
            $table->boolean('es_perecedero')->default(false);
            $table->integer('dias_vencimiento')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('materiales');
    }
};
