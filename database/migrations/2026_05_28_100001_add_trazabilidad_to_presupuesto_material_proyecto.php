<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('presupuesto_material_proyecto', function (Blueprint $table) {
            // Transferencias al almacén central (histórico acumulado)
            $table->decimal('cantidad_devuelta_central', 12, 4)->default(0)->after('cantidad_entregada_obra');
            // Pérdidas/mermas (salida_ajuste)
            $table->decimal('cantidad_merma', 12, 4)->default(0)->after('cantidad_devuelta_central');
            // Retrabajo (salida_retrabajo si existiera, o salida_ajuste negativa)
            $table->decimal('cantidad_retrabajo', 12, 4)->default(0)->after('cantidad_merma');
            // Desfase detectado (Comprado - EnAlmacén - Devuelto - Entregado - Merma - Retrabajo)
            $table->decimal('desfase_contable', 12, 4)->default(0)->after('cantidad_retrabajo');
            // Flag de inconsistencia
            $table->boolean('identidad_contable_ok')->default(true)->after('desfase_contable');
        });

        // Recalcular cantidad_en_almacen_proyecto desde stock real para datos existentes
        // Hacemos un recálculo masivo desde el stock actual
        DB::statement("
            UPDATE presupuesto_material_proyecto pmp
            INNER JOIN almacenes a ON a.proyecto_id = pmp.proyecto_id AND a.deleted_at IS NULL
            INNER JOIN stock_material sm ON sm.almacen_id = a.id AND sm.material_id = pmp.material_id
            SET pmp.cantidad_en_almacen_proyecto = COALESCE(sm.cantidad, 0)
            WHERE pmp.deleted_at IS NULL
        ");

        // Recalcular cantidad_devuelta_central desde movimientos existentes
        // Transferencias COMPLETADAS desde almacén del proyecto hacia almacén central
        DB::statement("
            UPDATE presupuesto_material_proyecto pmp
            INNER JOIN proyectos p ON p.id = pmp.proyecto_id
            INNER JOIN almacenes a_origen ON a_origen.proyecto_id = p.id AND a_origen.deleted_at IS NULL
            INNER JOIN almacenes a_central ON a_central.tipo = 'central' AND a_central.deleted_at IS NULL
            SET pmp.cantidad_devuelta_central = COALESCE((
                SELECT SUM(d.cantidad)
                FROM movimientos_almacen m
                INNER JOIN detalle_movimientos_almacen d ON d.movimiento_almacen_id = m.id
                WHERE m.tipo = 'transferencia_interna'
                  AND m.almacen_origen_id = a_origen.id
                  AND m.almacen_destino_id = a_central.id
                  AND m.estado = 'completado'
                  AND d.material_id = pmp.material_id
                  AND m.deleted_at IS NULL
            ), 0)
            WHERE pmp.deleted_at IS NULL
        ");

        // Verificar identidad contable para registros existentes
        DB::statement("
            UPDATE presupuesto_material_proyecto
            SET desfase_contable = cantidad_comprada
                                 - cantidad_en_almacen_proyecto
                                 - cantidad_devuelta_central
                                 - cantidad_entregada_obra
                                 - cantidad_merma
                                 - cantidad_retrabajo,
                identidad_contable_ok = ABS(
                    cantidad_comprada
                    - cantidad_en_almacen_proyecto
                    - cantidad_devuelta_central
                    - cantidad_entregada_obra
                    - cantidad_merma
                    - cantidad_retrabajo
                ) < 0.001
            WHERE deleted_at IS NULL
        ");
    }

    public function down(): void
    {
        Schema::table('presupuesto_material_proyecto', function (Blueprint $table) {
            $table->dropColumn([
                'cantidad_devuelta_central',
                'cantidad_merma',
                'cantidad_retrabajo',
                'desfase_contable',
                'identidad_contable_ok',
            ]);
        });
    }
};
