<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            // Campo contractual principal (reemplaza semánticamente a monto_contrato)
            $table->decimal('monto_contractual', 14, 2)->nullable()->after('monto_contrato');

            // Presupuesto materiales (calculado por el sistema vía recetas)
            $table->decimal('presupuesto_materiales', 14, 2)->nullable()->after('monto_contractual');

            // Porcentajes snapshot (copiados del set al crear, no se actualizan)
            $table->decimal('porcentaje_mano_obra', 5, 2)->nullable()->after('presupuesto_materiales');
            $table->decimal('porcentaje_gastos_generales', 5, 2)->nullable()->after('porcentaje_mano_obra');
            $table->decimal('porcentaje_utilidad_esperada', 5, 2)->nullable()->after('porcentaje_gastos_generales');

            // Montos calculados (MO, GG, Util)
            $table->decimal('presupuesto_mano_obra', 14, 2)->nullable()->after('porcentaje_utilidad_esperada');
            $table->decimal('presupuesto_gastos_generales', 14, 2)->nullable()->after('presupuesto_mano_obra');
            $table->decimal('presupuesto_utilidad_esperada', 14, 2)->nullable()->after('presupuesto_gastos_generales');

            // Flags de override: si true, el admin usó monto fijo en lugar de %
            $table->boolean('usa_monto_fijo_mo')->default(false)->after('presupuesto_utilidad_esperada');
            $table->boolean('usa_monto_fijo_gg')->default(false)->after('usa_monto_fijo_mo');
            $table->boolean('usa_monto_fijo_util')->default(false)->after('usa_monto_fijo_gg');

            // Justificación cuando rentabilidad < umbral mínimo
            $table->text('justificacion_rentabilidad_baja')->nullable()->after('usa_monto_fijo_util');

            // Retención fiscal (7% en Bolivia para proyectos privados con personas naturales)
            $table->boolean('aplica_retencion_7_porciento')->default(false)->after('justificacion_rentabilidad_baja');

            // Comunidad (tercer nivel geográfico, input libre)
            $table->string('comunidad')->nullable()->after('zona_id');
        });

        // Copiar monto_contrato → monto_contractual para datos existentes
        \DB::statement(
            'UPDATE proyectos SET monto_contractual = COALESCE(monto_contrato, presupuesto_referencial) WHERE monto_contractual IS NULL'
        );

        // Para proyectos sociales, activar retención por defecto
        \DB::statement(
            "UPDATE proyectos SET aplica_retencion_7_porciento = 1 WHERE categoria = 'social'"
        );
    }

    public function down(): void
    {
        Schema::table('proyectos', function (Blueprint $table) {
            $table->dropColumn([
                'monto_contractual',
                'presupuesto_materiales',
                'porcentaje_mano_obra',
                'porcentaje_gastos_generales',
                'porcentaje_utilidad_esperada',
                'presupuesto_mano_obra',
                'presupuesto_gastos_generales',
                'presupuesto_utilidad_esperada',
                'usa_monto_fijo_mo',
                'usa_monto_fijo_gg',
                'usa_monto_fijo_util',
                'justificacion_rentabilidad_baja',
                'aplica_retencion_7_porciento',
                'comunidad',
            ]);
        });
    }
};
