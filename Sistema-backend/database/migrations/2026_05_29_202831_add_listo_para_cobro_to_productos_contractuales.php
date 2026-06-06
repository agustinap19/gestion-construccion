<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE productos_contractuales MODIFY COLUMN estado ENUM('pendiente','en_proceso','listo_para_cobro','cobrado') NOT NULL DEFAULT 'pendiente'");
    }

    public function down(): void
    {
        DB::table('productos_contractuales')
            ->where('estado', 'listo_para_cobro')
            ->update(['estado' => 'en_proceso']);
        DB::statement("ALTER TABLE productos_contractuales MODIFY COLUMN estado ENUM('pendiente','en_proceso','cobrado') NOT NULL DEFAULT 'pendiente'");
    }
};
