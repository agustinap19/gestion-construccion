<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personal', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->string('codigo_empleado')->unique();
            $table->string('nombre');
            $table->string('apellido_paterno');
            $table->string('apellido_materno')->nullable();
            $table->string('ci')->unique();
            $table->string('ci_complemento', 5)->nullable();
            $table->string('telefono')->nullable();
            $table->text('direccion')->nullable();
            $table->date('fecha_nacimiento')->nullable();
            $table->string('tipo');
            $table->string('especialidad')->nullable();
            $table->string('categoria')->nullable();
            $table->date('fecha_contratacion');
            $table->enum('tipo_contrato', ['indefinido', 'plazo_fijo', 'obra', 'consultoria']);
            $table->decimal('salario_base', 10, 2);
            $table->enum('frecuencia_pago', ['semanal', 'quincenal', 'mensual']);
            $table->string('banco')->nullable();
            $table->string('numero_cuenta')->nullable();
            $table->enum('tipo_cuenta', ['ahorro', 'corriente'])->nullable();
            $table->enum('estado_laboral', ['activo', 'vacaciones', 'licencia', 'desvinculado'])->default('activo');
            $table->date('fecha_desvinculacion')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal');
    }
};
