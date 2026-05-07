<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permisos', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->string('codigo', 80)->unique();
            $table->string('nombre_visible', 100);
            $table->string('modulo', 50);
            $table->string('accion', 30);
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->index('modulo');
            $table->index(['modulo', 'accion']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permisos');
    }
};
