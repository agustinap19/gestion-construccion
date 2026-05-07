<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->boolean('debe_cambiar_password')->default(false)->after('password');
            $table->timestamp('password_cambiado_en')->nullable()->after('debe_cambiar_password');
            $table->unsignedInteger('intentos_fallidos')->default(0)->after('password_cambiado_en');
            $table->timestamp('bloqueado_hasta')->nullable()->after('intentos_fallidos');
        });
    }

    public function down(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropColumn([
                'debe_cambiar_password',
                'password_cambiado_en',
                'intentos_fallidos',
                'bloqueado_hasta'
            ]);
        });
    }
};
