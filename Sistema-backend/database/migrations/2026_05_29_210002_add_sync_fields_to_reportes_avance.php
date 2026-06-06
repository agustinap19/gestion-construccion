<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reportes_avance', function (Blueprint $table) {
            $table->string('uuid_local', 36)->nullable()->unique()->after('id');
            $table->decimal('latitud', 10, 7)->nullable()->after('coordenadas_gps');
            $table->decimal('longitud', 10, 7)->nullable()->after('latitud');
            $table->boolean('fuera_de_rango')->default(false)->after('longitud');
        });
    }

    public function down(): void
    {
        Schema::table('reportes_avance', function (Blueprint $table) {
            $table->dropUnique(['uuid_local']);
            $table->dropColumn(['uuid_local', 'latitud', 'longitud', 'fuera_de_rango']);
        });
    }
};
