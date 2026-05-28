<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cliente;
use App\Models\ZonaGeografica;
use App\Models\User;

class ClienteSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::first();
        $adminId = $admin ? $admin->id : null;

        $zonaLaPaz = ZonaGeografica::where('departamento', 'La Paz')->first();
        $zonaSCZ = ZonaGeografica::where('departamento', 'Santa Cruz')->first();
        $zonaCBB = ZonaGeografica::where('departamento', 'Cochabamba')->first();

        $clientes = [
            [
                'tipo' => 'persona_natural',
                'nombre_completo' => 'Juan Carlos Quispe Mamani',
                'documento_tipo' => 'ci',
                'documento_numero' => '8234567',
                'documento_complemento' => 'LP',
                'email' => 'juan.quispe@email.com',
                'telefono_principal' => '71234567',
                'direccion' => 'Av. Buenos Aires Nro 123',
                'zona_id' => $zonaLaPaz ? $zonaLaPaz->id : null,
                'estado' => 'activo',
                'origen' => 'directo',
                'usuario_creador_id' => $adminId,
            ],
            [
                'tipo' => 'persona_natural',
                'nombre_completo' => 'María Elena Vargas',
                'documento_tipo' => 'ci',
                'documento_numero' => '6543210',
                'documento_complemento' => 'SC',
                'email' => 'maria.vargas@email.com',
                'telefono_principal' => '76543210',
                'zona_id' => $zonaSCZ ? $zonaSCZ->id : null,
                'estado' => 'potencial',
                'origen' => 'sitio_web',
                'usuario_creador_id' => $adminId,
            ],
            [
                'tipo' => 'empresa',
                'nombre_completo' => 'Constructora Altiplano S.A.',
                'nombre_comercial' => 'ConstruAlti',
                'documento_tipo' => 'nit',
                'documento_numero' => '1029384756',
                'email' => 'contacto@construalti.com',
                'telefono_principal' => '22445566',
                'zona_id' => $zonaLaPaz ? $zonaLaPaz->id : null,
                'representante_legal' => 'Roberto Sánchez',
                'cargo_representante' => 'Gerente General',
                'sector' => 'Construcción',
                'estado' => 'activo',
                'origen' => 'directo',
                'usuario_creador_id' => $adminId,
            ],
            [
                'tipo' => 'empresa',
                'nombre_completo' => 'Inversiones del Valle SRL',
                'nombre_comercial' => 'InverValle',
                'documento_tipo' => 'nit',
                'documento_numero' => '2938475610',
                'email' => 'info@invervalle.com.bo',
                'telefono_principal' => '44556677',
                'zona_id' => $zonaCBB ? $zonaCBB->id : null,
                'representante_legal' => 'Carmen Rosa Pinto',
                'sector' => 'Inmobiliaria',
                'estado' => 'inactivo',
                'origen' => 'licitacion',
                'usuario_creador_id' => $adminId,
            ],
        ];

        foreach ($clientes as $c) {
            Cliente::firstOrCreate(
                ['documento_numero' => $c['documento_numero'], 'documento_tipo' => $c['documento_tipo']],
                $c
            );
        }

        // Agregar un par más, incluyendo uno bloqueado y un referido
        $clienteBase = Cliente::first();
        if ($clienteBase) {
            Cliente::firstOrCreate(
                ['documento_numero' => '4005006', 'documento_tipo' => 'ci'],
                [
                    'tipo' => 'persona_natural',
                    'nombre_completo' => 'Pedro Lora',
                    'documento_tipo' => 'ci',
                    'documento_numero' => '4005006',
                    'email' => 'pedro@email.com',
                    'telefono_principal' => '71122334',
                    'estado' => 'activo',
                    'origen' => 'referido',
                    'cliente_referido_por' => $clienteBase->id,
                    'usuario_creador_id' => $adminId,
                ]
            );

            Cliente::firstOrCreate(
                ['documento_numero' => '9008007022', 'documento_tipo' => 'nit'],
                [
                    'tipo' => 'empresa',
                    'nombre_completo' => 'Maderas del Oriente S.A.',
                    'documento_tipo' => 'nit',
                    'documento_numero' => '9008007022',
                    'email' => 'deuda@maderas.com',
                    'telefono_principal' => '33445566',
                    'estado' => 'bloqueado',
                    'notas' => 'Cliente en mora',
                    'usuario_creador_id' => $adminId,
                ]
            );
        }
    }
}
