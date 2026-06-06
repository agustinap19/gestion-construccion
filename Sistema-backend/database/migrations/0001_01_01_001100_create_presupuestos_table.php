<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('presupuestos', function (Blueprint $table) {
            $table->id();
            $table->string('codigo')->unique();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->foreignId('contrato_id')->nullable()->constrained('contratos')->nullOnDelete();
            $table->string('nombre');
            $table->text('descripcion')->nullable();
            $table->enum('tipo', ['referencial', 'detallado', 'reformulado', 'final']);
            $table->enum('estado', ['borrador', 'revision', 'aprobado', 'vigente', 'cerrado'])->default('borrador');
            $table->decimal('monto_directo', 14, 2)->default(0);
            $table->decimal('gastos_generales', 14, 2)->default(0);
            $table->decimal('utilidad', 14, 2)->default(0);
            $table->decimal('impuestos', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->date('fecha_elaboracion');
            $table->date('fecha_aprobacion')->nullable();
            $table->integer('version')->default(1);
            $table->foreignId('elaborado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprobado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('observaciones')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('presupuestos');
    }
};
