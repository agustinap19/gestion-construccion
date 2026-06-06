<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dispositivos_movil', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->string('device_id', 255);
            $table->string('device_name', 255)->nullable();
            $table->timestamp('ultimo_sync')->nullable();
            $table->boolean('activo')->default(true);
            $table->timestamps();

            $table->unique(['usuario_id', 'device_id']);
            $table->index('device_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dispositivos_movil');
    }
};
