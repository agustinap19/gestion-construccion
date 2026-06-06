<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('codigos_otp', function (Blueprint $table) {
            $table->string('token_temporal')->nullable()->unique()->after('tipo');
            $table->string('fingerprint_dispositivo')->nullable()->after('token_temporal');
            $table->tinyInteger('intentos_fallidos')->default(0)->after('usado');
        });
    }

    public function down(): void
    {
        Schema::table('codigos_otp', function (Blueprint $table) {
            $table->dropColumn(['token_temporal', 'fingerprint_dispositivo', 'intentos_fallidos']);
        });
    }
};
