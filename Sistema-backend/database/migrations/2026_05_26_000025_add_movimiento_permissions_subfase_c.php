<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $permisos = [
            ['nombre' => 'movimientos.ver',                 'descripcion' => 'Ver movimientos de almacén'],
            ['nombre' => 'movimientos.crear_entrada',       'descripcion' => 'Registrar entradas (compras)'],
            ['nombre' => 'movimientos.crear_salida_social', 'descripcion' => 'Registrar salidas a beneficiarios'],
            ['nombre' => 'movimientos.crear_salida_privado','descripcion' => 'Registrar salidas a personal'],
            ['nombre' => 'movimientos.transferir',          'descripcion' => 'Transferir entre almacenes'],
            ['nombre' => 'movimientos.anular',              'descripcion' => 'Anular movimientos'],
            ['nombre' => 'movimientos.aprobar_sobre_consumo','descripcion' => 'Aprobar entregas sobre el 150% del presupuesto'],
        ];

        foreach ($permisos as $p) {
            DB::table('permisos')->insertOrIgnore([
                'nombre'      => $p['nombre'],
                'descripcion' => $p['descripcion'],
                'created_at'  => now(),
                'updated_at'  => now(),
            ]);
        }

        // Asignar todos al rol administrador
        $adminRol = DB::table('roles')->where('nombre', 'administrador')->first();
        if ($adminRol) {
            $permisosIds = DB::table('permisos')
                ->whereIn('nombre', array_column($permisos, 'nombre'))
                ->pluck('id');
            foreach ($permisosIds as $pid) {
                DB::table('rol_permiso')->insertOrIgnore([
                    'rol_id'     => $adminRol->id,
                    'permiso_id' => $pid,
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('permisos')->whereIn('nombre', [
            'movimientos.ver',
            'movimientos.crear_entrada',
            'movimientos.crear_salida_social',
            'movimientos.crear_salida_privado',
            'movimientos.transferir',
            'movimientos.anular',
            'movimientos.aprobar_sobre_consumo',
        ])->delete();
    }
};
