<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contratos', function (Blueprint $table) {
            $table->id();
            $table->string('numero_contrato')->unique();
            $table->foreignId('proyecto_id')->constrained('proyectos')->cascadeOnDelete();
            $table->enum('tipo_contrato', ['obra', 'consultoria', 'supervision', 'suministro', 'otro']);
            $table->enum('modalidad', ['suma_alzada', 'precios_unitarios', 'administracion_delegada', 'llave_en_mano'])->nullable();
            $table->foreignId('cliente_id')->nullable()->constrained('clientes')->nullOnDelete();
            $table->foreignId('entidad_estatal_id')->nullable()->constrained('entidades_estatales')->nullOnDelete();
            $table->date('fecha_firma');
            $table->date('fecha_inicio');
            $table->date('fecha_fin_planificada');
            $table->date('fecha_fin_real')->nullable();
            $table->decimal('monto_original', 14, 2);
            $table->decimal('monto_vigente', 14, 2);
            $table->integer('plazo_dias');
            $table->enum('estado', ['borrador', 'vigente', 'en_ejecucion', 'finalizado', 'rescindido', 'suspendido'])->default('borrador');
            $table->string('documento_url')->nullable();
            $table->text('objeto_contrato')->nullable();
            $table->text('observaciones')->nullable();
            $table->foreignId('creado_por_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('proyecto_id');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contratos');
    }
};
