<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plantillas_checklist', function (Blueprint $table) {
            $table->id();
            $table->string('clave')->unique();
            $table->string('nombre');
            $table->string('tipo_obra')->nullable();
            $table->text('descripcion')->nullable();
            $table->boolean('es_predeterminada')->default(false);
            $table->timestamps();
        });

        Schema::create('items_plantilla', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plantilla_id')->constrained('plantillas_checklist')->cascadeOnDelete();
            $table->string('nombre');
            $table->integer('orden')->default(0);
            $table->decimal('ponderacion', 5, 2)->default(0);
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->index('plantilla_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items_plantilla');
        Schema::dropIfExists('plantillas_checklist');
    }
};
