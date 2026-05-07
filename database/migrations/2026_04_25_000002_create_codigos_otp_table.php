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
        Schema::create('codigos_otp', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->cascadeOnDelete();
            $table->string('codigo', 6);
            $table->string('token_temporal', 80)->unique();
            $table->string('fingerprint_dispositivo', 64);
            $table->boolean('usado')->default(false);
            $table->timestamp('expira_en');
            $table->unsignedInteger('intentos_fallidos')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->index('token_temporal');
            $table->index('usuario_id');
            $table->index('expira_en');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('codigos_otp');
    }
};
