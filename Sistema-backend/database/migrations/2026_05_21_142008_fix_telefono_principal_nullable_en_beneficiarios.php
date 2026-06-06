<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('beneficiarios', function (Blueprint $table) {
            $table->string('telefono_principal')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('beneficiarios', function (Blueprint $table) {
            $table->string('telefono_principal')->nullable(false)->change();
        });
    }
};
