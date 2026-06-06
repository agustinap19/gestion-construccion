<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categorias_constructivas', function (Blueprint $table) {
            $table->id();
            $table->string('nombre', 80)->unique();
            $table->string('color', 20)->default('#6366f1');
            $table->unsignedSmallInteger('orden')->default(0);
            $table->text('descripcion')->nullable();
            $table->boolean('estado')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categorias_constructivas');
    }
};
