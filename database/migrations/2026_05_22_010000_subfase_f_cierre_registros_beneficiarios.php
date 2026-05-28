<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Campos de cierre de registros de beneficiarios en la tabla proyectos
        Schema::table('proyectos', function (Blueprint $table) {
            $table->boolean('registros_beneficiarios_cerrados')->default(false)->after('cantidad_beneficiarios');
            $table->timestamp('fecha_cierre_registros')->nullable()->after('registros_beneficiarios_cerrados');
            $table->foreignId('cerrado_registros_por_id')->nullable()
                ->after('fecha_cierre_registros')
                ->constrained('users')->nullOnDelete();
        });

        // Tabla de códigos de reapertura (OTP de un solo uso)
        Schema::create('codigos_reapertura', function (Blueprint $table) {
            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->string('codigo', 8);
            $table->string('tipo', 60)->default('reapertura_beneficiarios');
            $table->boolean('usado')->default(false);
            $table->timestamp('expira_en');
            $table->timestamp('usado_en')->nullable();
            $table->timestamps();

            $table->index(['proyecto_id', 'usado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('codigos_reapertura');
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropForeign(['cerrado_registros_por_id']);
            $table->dropColumn(['registros_beneficiarios_cerrados', 'fecha_cierre_registros', 'cerrado_registros_por_id']);
        });
    }
};
