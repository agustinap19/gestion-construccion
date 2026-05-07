<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->charset = 'utf8mb4';
            $table->collation = 'utf8mb4_unicode_ci';

            $table->id();
            $table->foreignId('usuario_id')->nullable()->unique()->constrained('usuarios')->nullOnDelete();
            $table->string('codigo_empleado', 20)->unique();
            $table->string('nombre', 80);
            $table->string('apellido_paterno', 80);
            $table->string('apellido_materno', 80)->nullable();
            $table->string('ci', 20)->unique();
            $table->string('ci_complemento', 5)->nullable();
            $table->string('telefono', 20)->nullable();
            $table->string('direccion', 200)->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->enum('tipo', ['tecnico', 'obrero', 'trabajadora_social', 'administrativo', 'gerente', 'encargado_almacen', 'encargado_finanzas']);
            $table->string('especialidad', 100)->nullable();
            $table->string('categoria', 50)->nullable();
            $table->date('fecha_contratacion');
            $table->date('fecha_desvinculacion')->nullable();
            $table->enum('tipo_contrato', ['indefinido', 'plazo_fijo', 'obra', 'consultoria']);
            $table->decimal('salario_base', 10, 2);
            $table->enum('frecuencia_pago', ['semanal', 'quincenal', 'mensual']);
            $table->string('banco', 80)->nullable();
            $table->string('numero_cuenta', 30)->nullable();
            $table->enum('tipo_cuenta', ['ahorro', 'corriente'])->nullable();
            $table->enum('estado_laboral', ['activo', 'vacaciones', 'licencia', 'desvinculado'])->default('activo');
            $table->timestamps();
            $table->softDeletes();

            $table->index('ci');
            $table->index('tipo');
            $table->index('estado_laboral');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal');
    }
};
