<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tipos_proyecto', function (Blueprint $table) {
            $table->enum('categoria', ['social', 'privado'])->default('privado')->after('descripcion');
            $table->boolean('requiere_beneficiarios')->default(false)->after('categoria');
            $table->boolean('requiere_entidad_estatal')->default(false)->after('requiere_beneficiarios');
        });
    }

    public function down(): void
    {
        Schema::table('tipos_proyecto', function (Blueprint $table) {
            $table->dropColumn(['categoria', 'requiere_beneficiarios', 'requiere_entidad_estatal']);
        });
    }
};
