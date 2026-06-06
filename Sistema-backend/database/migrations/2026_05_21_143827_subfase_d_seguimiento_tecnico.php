<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Añadir porcentaje_avance a items_checklist ─────────────────────
        Schema::table('items_checklist', function (Blueprint $table) {
            $table->decimal('porcentaje_avance', 5, 2)->default(0)->after('ponderacion');
        });

        // ── 2. Reportes técnicos ──────────────────────────────────────────────
        Schema::create('reportes_tecnicos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('proyecto_id');
            $table->unsignedBigInteger('vivienda_id')->nullable();
            $table->unsignedBigInteger('fase_id')->nullable();
            $table->unsignedBigInteger('usuario_id');
            $table->dateTime('fecha_reporte');
            $table->text('descripcion')->nullable();
            $table->text('observaciones')->nullable();
            $table->decimal('latitud_tecnico', 10, 7)->nullable();
            $table->decimal('longitud_tecnico', 10, 7)->nullable();
            $table->decimal('distancia_vivienda_metros', 10, 2)->nullable();
            $table->boolean('alerta_distancia')->default(false);
            $table->enum('estado', ['enviado', 'aprobado'])->default('enviado');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('proyecto_id')->references('id')->on('proyectos')->onDelete('cascade');
            $table->foreign('vivienda_id')->references('id')->on('viviendas')->onDelete('set null');
            $table->foreign('fase_id')->references('id')->on('fases_proyecto')->onDelete('set null');
            $table->foreign('usuario_id')->references('id')->on('users');
            $table->index(['proyecto_id', 'vivienda_id']);
            $table->index(['proyecto_id', 'fase_id']);
        });

        // ── 3. Avances de items por reporte (histórico) ───────────────────────
        Schema::create('avances_checklist_reporte', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reporte_id');
            $table->unsignedBigInteger('item_checklist_id');
            $table->decimal('porcentaje_anterior', 5, 2)->default(0);
            $table->decimal('porcentaje_nuevo', 5, 2)->default(0);
            $table->text('notas')->nullable();
            $table->timestamps();

            $table->foreign('reporte_id')->references('id')->on('reportes_tecnicos')->onDelete('cascade');
            $table->foreign('item_checklist_id')->references('id')->on('items_checklist')->onDelete('cascade');
        });

        // ── 4. Fotos de reporte ───────────────────────────────────────────────
        Schema::create('fotos_reporte', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reporte_id');
            $table->string('url_original', 500);
            $table->string('url_thumbnail', 500)->nullable();
            $table->string('caption', 200)->nullable();
            $table->unsignedSmallInteger('orden')->default(0);
            $table->decimal('latitud', 10, 7)->nullable();
            $table->decimal('longitud', 10, 7)->nullable();
            $table->timestamps();

            $table->foreign('reporte_id')->references('id')->on('reportes_tecnicos')->onDelete('cascade');
            $table->index('reporte_id');
        });

        // ── 5. Incidencias de reporte ─────────────────────────────────────────
        Schema::create('incidencias_reporte', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('reporte_id');
            $table->enum('tipo', ['clima', 'social', 'tecnica', 'seguridad', 'otro']);
            $table->enum('gravedad', ['baja', 'media', 'alta', 'critica']);
            $table->text('descripcion');
            $table->timestamps();

            $table->foreign('reporte_id')->references('id')->on('reportes_tecnicos')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incidencias_reporte');
        Schema::dropIfExists('fotos_reporte');
        Schema::dropIfExists('avances_checklist_reporte');
        Schema::dropIfExists('reportes_tecnicos');

        Schema::table('items_checklist', function (Blueprint $table) {
            $table->dropColumn('porcentaje_avance');
        });
    }
};
