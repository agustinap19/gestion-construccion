<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal', function (Blueprint $table) {
            $table->unsignedBigInteger('rol_id')->nullable()->after('usuario_id');
            $table->foreign('rol_id')->references('id')->on('roles')->nullOnDelete();
        });

        Schema::table('personal', function (Blueprint $table) {
            $table->dropColumn('tipo');
        });
    }

    public function down(): void
    {
        Schema::table('personal', function (Blueprint $table) {
            $table->string('tipo')->nullable()->after('especialidad');
        });

        Schema::table('personal', function (Blueprint $table) {
            $table->dropForeign(['rol_id']);
            $table->dropColumn('rol_id');
        });
    }
};
