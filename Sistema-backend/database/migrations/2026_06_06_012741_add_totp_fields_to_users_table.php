<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('totp_secret')->nullable()->after('password');
            $table->boolean('totp_activo')->default(false)->after('totp_secret');
            $table->timestamp('totp_activado_en')->nullable()->after('totp_activo');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['totp_secret', 'totp_activo', 'totp_activado_en']);
        });
    }
};
