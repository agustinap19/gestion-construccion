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
        Schema::table('notificaciones_sistema', function (Blueprint $table) {
            $table->renameColumn('url', 'url_accion');
            $table->timestamp('leida_en')->nullable()->after('leida');
        });
    }

    public function down(): void
    {
        Schema::table('notificaciones_sistema', function (Blueprint $table) {
            $table->renameColumn('url_accion', 'url');
            $table->dropColumn('leida_en');
        });
    }
};
