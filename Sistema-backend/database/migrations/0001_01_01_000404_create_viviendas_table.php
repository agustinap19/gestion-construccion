<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('viviendas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('beneficiario_id')->nullable()->constrained('beneficiarios')->nullOnDelete();
            $table->foreignId('tipo_vivienda_id')->nullable()->constrained('tipos_vivienda')->nullOnDelete();
            $table->foreignId('usuario_creador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('codigo');
            $table->enum('estado', [
                'planificada', 'terreno_preparado', 'cimentacion',
                'obra_gruesa', 'obra_fina', 'acabados',
                'entregada', 'con_observaciones',
            ])->default('planificada');
            $table->decimal('porcentaje_avance', 5, 2)->default(0);
            $table->boolean('tiene_observaciones_activas')->default(false);
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['proyecto_id', 'codigo']);
            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('viviendas');
    }
};
