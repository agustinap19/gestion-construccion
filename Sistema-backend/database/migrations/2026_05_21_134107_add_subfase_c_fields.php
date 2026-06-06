<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beneficiarios', function (Blueprint $table) {
            $table->string('apellido_conyuge', 80)->nullable()->after('apellido_materno');
            $table->string('comunidad', 120)->nullable()->after('direccion_actual');
        });

        Schema::table('tipos_vivienda', function (Blueprint $table) {
            $table->string('plano_url', 500)->nullable()->after('descripcion');
        });
    }

    public function down(): void
    {
        Schema::table('beneficiarios', function (Blueprint $table) {
            $table->dropColumn(['apellido_conyuge', 'comunidad']);
        });

        Schema::table('tipos_vivienda', function (Blueprint $table) {
            $table->dropColumn('plano_url');
        });
    }
};
