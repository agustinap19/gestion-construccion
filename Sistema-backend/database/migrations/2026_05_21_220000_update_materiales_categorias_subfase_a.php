<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias_material', function (Blueprint $table) {
            $table->string('color', 20)->default('#94a3b8')->after('descripcion');
            $table->boolean('activo')->default(true)->after('color');
            $table->softDeletes();
        });

        Schema::table('materiales', function (Blueprint $table) {
            $table->string('imagen_url')->nullable()->after('descripcion');
            $table->enum('tipo', ['maestro', 'especial'])->default('maestro')->after('imagen_url');
            $table->foreignId('proyecto_id')->nullable()->constrained('proyectos')->nullOnDelete()->after('tipo');
            $table->json('equivalencias')->nullable()->after('dias_vencimiento');
            
            // Note: `codigo` is already unique, `activo` and `softDeletes` already exist.
        });
    }

    public function down(): void
    {
        Schema::table('materiales', function (Blueprint $table) {
            $table->dropForeign(['proyecto_id']);
            $table->dropColumn(['imagen_url', 'tipo', 'proyecto_id', 'equivalencias']);
        });

        Schema::table('categorias_material', function (Blueprint $table) {
            $table->dropColumn(['color', 'activo']);
            $table->dropSoftDeletes();
        });
    }
};
