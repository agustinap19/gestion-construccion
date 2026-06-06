<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_almacen', function (Blueprint $table) {
            $table->id();
            $table->string('codigo', 30)->unique();

            $table->enum('tipo', [
                'entrada_compra',
                'entrada_devolucion',
                'entrada_transferencia',
                'entrada_ajuste',
                'salida_social',
                'salida_privado',
                'salida_devolucion_proveedor',
                'salida_ajuste',
                'transferencia_interna',
                'inventario_inicial',
            ]);

            $table->enum('estado', [
                'borrador',
                'pendiente',
                'en_transito',
                'completado',
                'anulado',
            ])->default('borrador');

            // Almacén origen y destino
            $table->foreignId('almacen_origen_id')
                  ->nullable()
                  ->constrained('almacenes')
                  ->nullOnDelete();
            $table->foreignId('almacen_destino_id')
                  ->nullable()
                  ->constrained('almacenes')
                  ->nullOnDelete();

            // Proyecto (contexto)
            $table->foreignId('proyecto_id')
                  ->nullable()
                  ->constrained('proyectos')
                  ->nullOnDelete();

            // Para salidas sociales
            $table->foreignId('beneficiario_id')
                  ->nullable()
                  ->constrained('beneficiarios')
                  ->nullOnDelete();
            $table->foreignId('presupuesto_item_proyecto_id')
                  ->nullable()
                  ->constrained('presupuesto_items_proyecto')
                  ->nullOnDelete();

            // Para salidas privadas / personal
            $table->foreignId('receptor_personal_id')
                  ->nullable()
                  ->constrained('personal')
                  ->nullOnDelete();
            $table->string('receptor_nombre', 120)->nullable();
            $table->string('receptor_ci', 20)->nullable();

            // Para entradas (compras)
            $table->string('proveedor_nombre', 150)->nullable();
            $table->string('numero_factura', 60)->nullable();
            $table->date('fecha_factura')->nullable();
            $table->string('archivo_factura_url')->nullable();

            // Modalidad de entrega
            $table->enum('modalidad_entrega', ['total', 'parcial'])->nullable();

            // Justificación en sobre-consumo
            $table->text('justificacion_sobre_consumo')->nullable();
            $table->boolean('requiere_aprobacion')->default(false);
            $table->foreignId('aprobado_por_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('aprobado_en')->nullable();

            // Totales
            $table->decimal('monto_total', 14, 4)->default(0);

            // Notas y metadata
            $table->text('notas')->nullable();
            $table->json('metadata')->nullable();

            // Operador y fecha
            $table->foreignId('registrado_por_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->foreignId('anulado_por_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('anulado_en')->nullable();
            $table->text('motivo_anulacion')->nullable();

            $table->timestamp('fecha_movimiento')->useCurrent();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['almacen_origen_id', 'tipo', 'estado']);
            $table->index(['proyecto_id', 'tipo']);
            $table->index(['beneficiario_id']);
            $table->index('fecha_movimiento');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_almacen');
    }
};
