<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('almacenes', function (Blueprint $table) {
            $table->decimal('capacidad_estimada', 12, 4)->nullable()->after('longitud');
        });
    }

    public function down(): void
    {
        Schema::table('almacenes', function (Blueprint $table) {
            $table->dropColumn('capacidad_estimada');
        });
    }
};
