<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Activo;
use App\Models\Almacen;
use App\Models\User;

class ActivoSeeder extends Seeder
{
    public function run(): void
    {
        $creador = User::whereHas('rol', fn ($q) => $q->where('nombre', 'super_admin'))->first();
        $creadoPorId = $creador?->id;

        $almacenCentral = Almacen::where('tipo', 'central')->first();
        $almacenObra    = Almacen::where('tipo', 'obra')->first();

        $activos = [

            // ── Maquinaria pesada ───────────────────────────────────────────
            [
                'codigo' => 'MAQ-001', 'nombre' => 'Excavadora de Orugas', 'tipo' => 'maquinaria',
                'descripcion' => 'Excavadora hidráulica para movimiento de tierras, excavación de zanjas y cimentaciones.',
                'marca' => 'Caterpillar', 'modelo' => '320D', 'serie' => 'CAT0320DKHRR04521',
                'anio_fabricacion' => 2019, 'costo_dia_uso' => 1800.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 250,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2019-08-12', 'valor_adquisicion' => 980000.00, 'valor_actual' => 612000.00,
                'vida_util_anios' => 12, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 8.33,
                'almacen_id' => $almacenCentral?->id,
                'notas' => 'Unidad principal para obras de cimentación profunda.',
            ],
            [
                'codigo' => 'MAQ-002', 'nombre' => 'Retroexcavadora', 'tipo' => 'maquinaria',
                'descripcion' => 'Retroexcavadora sobre ruedas para excavación, zanjeo y carga de material.',
                'marca' => 'Komatsu', 'modelo' => 'WB97R-5', 'serie' => 'KMTWB97R5J00231',
                'anio_fabricacion' => 2020, 'costo_dia_uso' => 1200.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 250,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2020-03-05', 'valor_adquisicion' => 560000.00, 'valor_actual' => 392000.00,
                'vida_util_anios' => 10, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 10.00,
                'almacen_id' => $almacenCentral?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'MAQ-003', 'nombre' => 'Motoniveladora', 'tipo' => 'maquinaria',
                'descripcion' => 'Motoniveladora para nivelación y perfilado de plataformas y vías de acceso.',
                'marca' => 'Caterpillar', 'modelo' => '120K2', 'serie' => 'CAT0120K2RJK01187',
                'anio_fabricacion' => 2017, 'costo_dia_uso' => 2000.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 250,
                'estado' => 'disponible', 'propiedad' => 'arrendado',
                'fecha_adquisicion' => '2017-11-20', 'valor_adquisicion' => 1050000.00, 'valor_actual' => 472500.00,
                'vida_util_anios' => 12, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 8.33,
                'almacen_id' => $almacenObra?->id,
                'notas' => 'Arrendada a Maquinarias Bolivia S.A. — contrato vence dic-2026.',
            ],
            [
                'codigo' => 'MAQ-004', 'nombre' => 'Rodillo Compactador Vibratorio', 'tipo' => 'maquinaria',
                'descripcion' => 'Rodillo liso vibratorio para compactación de bases y sub-bases.',
                'marca' => 'Dynapac', 'modelo' => 'CA250D', 'serie' => 'DYNCA250D0098712',
                'anio_fabricacion' => 2021, 'costo_dia_uso' => 900.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 250,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2021-06-10', 'valor_adquisicion' => 420000.00, 'valor_actual' => 336000.00,
                'vida_util_anios' => 10, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 10.00,
                'almacen_id' => $almacenObra?->id,
                'notas' => null,
            ],

            // ── Equipo ────────────────────────────────────────────────────
            [
                'codigo' => 'EQU-001', 'nombre' => 'Mezcladora de Concreto 1 Saco', 'tipo' => 'equipo',
                'descripcion' => 'Mezcladora a gasolina de tambor para preparación de concreto y mortero en obra.',
                'marca' => 'Imer', 'modelo' => 'Workman 350', 'serie' => 'IMRWM350-22041',
                'anio_fabricacion' => 2022, 'costo_dia_uso' => 80.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 200,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2022-02-14', 'valor_adquisicion' => 8500.00, 'valor_actual' => 5100.00,
                'vida_util_anios' => 6, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 16.67,
                'almacen_id' => $almacenObra?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'EQU-002', 'nombre' => 'Vibradora de Concreto', 'tipo' => 'equipo',
                'descripcion' => 'Vibradora a gasolina con manguera de inmersión para compactación de concreto.',
                'marca' => 'Wacker Neuson', 'modelo' => 'IREN 45', 'serie' => 'WNIREN45-31022',
                'anio_fabricacion' => 2023, 'costo_dia_uso' => 50.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 200,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2023-01-18', 'valor_adquisicion' => 4200.00, 'valor_actual' => 3360.00,
                'vida_util_anios' => 5, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 20.00,
                'almacen_id' => $almacenCentral?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'EQU-003', 'nombre' => 'Generador Eléctrico 10kVA', 'tipo' => 'equipo',
                'descripcion' => 'Generador a diésel para suministro eléctrico de obra en zonas sin red.',
                'marca' => 'Honda', 'modelo' => 'EB10000', 'serie' => 'HNDEB10000-77542',
                'anio_fabricacion' => 2021, 'costo_dia_uso' => 150.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 300,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2021-09-02', 'valor_adquisicion' => 28000.00, 'valor_actual' => 16800.00,
                'vida_util_anios' => 7, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 14.29,
                'almacen_id' => $almacenObra?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'EQU-004', 'nombre' => 'Bomba de Agua 3 pulgadas', 'tipo' => 'equipo',
                'descripcion' => 'Motobomba a gasolina para achique de agua en excavaciones y cimentaciones.',
                'marca' => 'Honda', 'modelo' => 'WB30XT', 'serie' => 'HNDWB30XT-10239',
                'anio_fabricacion' => 2022, 'costo_dia_uso' => 40.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 200,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2022-05-22', 'valor_adquisicion' => 6500.00, 'valor_actual' => 4550.00,
                'vida_util_anios' => 6, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 16.67,
                'almacen_id' => $almacenCentral?->id,
                'notas' => null,
            ],

            // ── Herramienta ───────────────────────────────────────────────
            [
                'codigo' => 'HER-001', 'nombre' => 'Taladro Percutor', 'tipo' => 'herramienta',
                'descripcion' => 'Taladro percutor eléctrico para perforación en concreto y mampostería.',
                'marca' => 'Bosch', 'modelo' => 'GSB 550', 'serie' => 'BSHGSB550-90871',
                'anio_fabricacion' => 2023, 'costo_dia_uso' => 15.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 150,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2023-04-10', 'valor_adquisicion' => 950.00, 'valor_actual' => 665.00,
                'vida_util_anios' => 4, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 25.00,
                'almacen_id' => $almacenCentral?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'HER-002', 'nombre' => 'Amoladora Angular 7 pulgadas', 'tipo' => 'herramienta',
                'descripcion' => 'Amoladora angular para corte y desbaste de metal, hormigón y cerámica.',
                'marca' => 'DeWalt', 'modelo' => 'DWE4517', 'serie' => 'DWTDWE4517-44310',
                'anio_fabricacion' => 2023, 'costo_dia_uso' => 12.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 150,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2023-04-10', 'valor_adquisicion' => 780.00, 'valor_actual' => 546.00,
                'vida_util_anios' => 4, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 25.00,
                'almacen_id' => $almacenObra?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'HER-003', 'nombre' => 'Soldadora Inverter 200A', 'tipo' => 'herramienta',
                'descripcion' => 'Equipo de soldadura por electrodo revestido para estructuras metálicas y enfierradura.',
                'marca' => 'Lincoln Electric', 'modelo' => 'Invertec V205-T', 'serie' => 'LINV205T-58213',
                'anio_fabricacion' => 2020, 'costo_dia_uso' => 60.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 150,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2020-10-15', 'valor_adquisicion' => 4500.00, 'valor_actual' => 1800.00,
                'vida_util_anios' => 5, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 20.00,
                'almacen_id' => $almacenObra?->id,
                'notas' => null,
            ],
            [
                'codigo' => 'HER-004', 'nombre' => 'Cortadora de Cerámica', 'tipo' => 'herramienta',
                'descripcion' => 'Cortadora eléctrica de disco diamantado para cerámica, porcelanato y azulejo.',
                'marca' => 'Makita', 'modelo' => '4100NH3', 'serie' => 'MKT4100NH3-30015',
                'anio_fabricacion' => 2022, 'costo_dia_uso' => 30.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 150,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2022-07-08', 'valor_adquisicion' => 2800.00, 'valor_actual' => 1960.00,
                'vida_util_anios' => 5, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 20.00,
                'almacen_id' => $almacenCentral?->id,
                'notas' => null,
            ],

            // ── Vehículo ──────────────────────────────────────────────────
            [
                'codigo' => 'VEH-001', 'nombre' => 'Volqueta 10 m³', 'tipo' => 'vehiculo',
                'descripcion' => 'Volqueta para transporte de áridos, escombros y material de excavación.',
                'marca' => 'Volvo', 'modelo' => 'FMX 8x4', 'serie' => 'YV2FMX8X4LB123456',
                'anio_fabricacion' => 2019, 'costo_dia_uso' => 1500.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 300,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2019-12-01', 'valor_adquisicion' => 980000.00, 'valor_actual' => 588000.00,
                'vida_util_anios' => 10, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 10.00,
                'almacen_id' => $almacenCentral?->id,
                'notas' => 'Placa: 1845-WCM.',
            ],
            [
                'codigo' => 'VEH-002', 'nombre' => 'Camioneta 4x4 Doble Cabina', 'tipo' => 'vehiculo',
                'descripcion' => 'Camioneta para supervisión de obra y traslado de personal técnico.',
                'marca' => 'Toyota', 'modelo' => 'Hilux 2.8 Diésel', 'serie' => 'MR0FZ29G5L0156789',
                'anio_fabricacion' => 2022, 'costo_dia_uso' => 350.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 300,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2022-08-19', 'valor_adquisicion' => 285000.00, 'valor_actual' => 228000.00,
                'vida_util_anios' => 8, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 12.50,
                'almacen_id' => $almacenCentral?->id,
                'notas' => 'Placa: 2390-KLT.',
            ],
            [
                'codigo' => 'VEH-003', 'nombre' => 'Camión Grúa', 'tipo' => 'vehiculo',
                'descripcion' => 'Camión con grúa hidráulica articulada para izaje y descarga de materiales pesados.',
                'marca' => 'Hino', 'modelo' => 'FC 500', 'serie' => 'JHHFC5JR8L0078541',
                'anio_fabricacion' => 2018, 'costo_dia_uso' => 1100.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 300,
                'estado' => 'disponible', 'propiedad' => 'arrendado',
                'fecha_adquisicion' => '2018-05-30', 'valor_adquisicion' => 650000.00, 'valor_actual' => 260000.00,
                'vida_util_anios' => 10, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 10.00,
                'almacen_id' => $almacenObra?->id,
                'notas' => 'Arrendado a Transportes Illimani Ltda. para proyectos con izaje de estructuras.',
            ],
            [
                'codigo' => 'VEH-004', 'nombre' => 'Minibús de Personal', 'tipo' => 'vehiculo',
                'descripcion' => 'Minibús para transporte de personal obrero entre campamento y frente de obra.',
                'marca' => 'Toyota', 'modelo' => 'Hiace Commuter', 'serie' => 'JTFSS22P9L0099823',
                'anio_fabricacion' => 2021, 'costo_dia_uso' => 400.00,
                'horas_uso_acumuladas' => 0, 'horas_mantenimiento_cada' => 300,
                'estado' => 'disponible', 'propiedad' => 'propio',
                'fecha_adquisicion' => '2021-03-25', 'valor_adquisicion' => 320000.00, 'valor_actual' => 224000.00,
                'vida_util_anios' => 9, 'metodo_depreciacion' => 'lineal', 'tasa_depreciacion' => 11.11,
                'almacen_id' => $almacenCentral?->id,
                'notas' => 'Placa: 1567-JTR. Capacidad 18 pasajeros.',
            ],
        ];

        foreach ($activos as $datos) {
            $datos['created_by'] = $creadoPorId;
            $datos['foto_url']   = null;

            Activo::firstOrCreate(['codigo' => $datos['codigo']], $datos);
        }
    }
}
