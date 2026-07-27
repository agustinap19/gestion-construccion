<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('asignaciones_personal', function (Blueprint $table) {
            $table->unsignedBigInteger('rol_id')->nullable()->after('personal_id');
            $table->foreign('rol_id')->references('id')->on('roles')->nullOnDelete();
        });

        Schema::table('asignaciones_personal', function (Blueprint $table) {
            $table->dropColumn('rol_en_proyecto');
        });
    }

    public function down(): void
    {
        Schema::table('asignaciones_personal', function (Blueprint $table) {
            $table->string('rol_en_proyecto', 100)->nullable()->after('personal_id');
        });

        Schema::table('asignaciones_personal', function (Blueprint $table) {
            $table->dropForeign(['rol_id']);
            $table->dropColumn('rol_id');
        });
    }
};
