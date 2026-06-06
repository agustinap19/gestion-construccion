<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'rostro_registrado',
                'descriptor_facial',
                'rostro_base64',
                'rostro_registrado_en',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('rostro_registrado')->default(false)->nullable();
            $table->longText('descriptor_facial')->nullable();
            $table->longText('rostro_base64')->nullable();
            $table->timestamp('rostro_registrado_en')->nullable();
        });
    }
};
