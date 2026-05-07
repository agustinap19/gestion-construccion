<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->longText('rostro_base64')->nullable()->after('bloqueado_hasta');
            $table->json('descriptor_facial')->nullable()->after('rostro_base64');
            $table->boolean('rostro_registrado')->default(false)->after('descriptor_facial');
            $table->timestamp('rostro_registrado_en')->nullable()->after('rostro_registrado');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn([
                'rostro_base64',
                'descriptor_facial',
                'rostro_registrado',
                'rostro_registrado_en'
            ]);
        });
    }
};
