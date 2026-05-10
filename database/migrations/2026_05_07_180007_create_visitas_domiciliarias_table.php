<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visitas_domiciliarias', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('beneficiario_id')->nullable()->constrained('beneficiarios')->cascadeOnDelete();
            $table->foreignId('personal_id')->nullable()->constrained('personal')->nullOnDelete();
            $table->date('fecha_visita');
            $table->time('hora_visita')->nullable();
            $table->decimal('latitud_visita', 10, 7)->nullable();
            $table->decimal('longitud_visita', 10, 7)->nullable();
            $table->enum('tipo_visita', ['inicial', 'seguimiento', 'verificacion', 'cierre', 'otra']);
            $table->enum('resultado', ['exitosa', 'no_encontrado', 'rechazado_por_familia', 'reprogramada', 'otro']);
            $table->text('observaciones')->nullable();
            $table->text('documentos_recolectados')->nullable();
            $table->decimal('gasto_transporte', 8, 2)->nullable();
            $table->string('foto_visita_url', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('beneficiario_id');
            $table->index('personal_id');
            $table->index('fecha_visita');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visitas_domiciliarias');
    }
};
