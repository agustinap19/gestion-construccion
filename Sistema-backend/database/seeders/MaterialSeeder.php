<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\CategoriaMaterial;
use App\Models\Material;
use App\Models\UnidadMedida;

class MaterialSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Unidades de Medida Básicas
        $unidades = [
            ['nombre' => 'Bolsa 50kg', 'simbolo' => 'bolsa', 'tipo' => 'peso'],
            ['nombre' => 'Bolsa 30kg', 'simbolo' => 'bolsa_30', 'tipo' => 'peso'],
            ['nombre' => 'Bolsa 25kg', 'simbolo' => 'bolsa_25', 'tipo' => 'peso'],
            ['nombre' => 'Kilogramo', 'simbolo' => 'kg', 'tipo' => 'peso'],
            ['nombre' => 'Metro', 'simbolo' => 'm', 'tipo' => 'longitud'],
            ['nombre' => 'Metro Cuadrado', 'simbolo' => 'm2', 'tipo' => 'area'],
            ['nombre' => 'Metro Cúbico', 'simbolo' => 'm3', 'tipo' => 'volumen'],
            ['nombre' => 'Pieza', 'simbolo' => 'pza', 'tipo' => 'unidad'],
            ['nombre' => 'Litro', 'simbolo' => 'L', 'tipo' => 'volumen'],
            ['nombre' => 'Galón', 'simbolo' => 'gal', 'tipo' => 'volumen'],
            ['nombre' => 'Balde 20L', 'simbolo' => 'balde', 'tipo' => 'volumen'],
            ['nombre' => 'Varilla 12m', 'simbolo' => 'varilla_12', 'tipo' => 'longitud'],
            ['nombre' => 'Varilla 6m', 'simbolo' => 'varilla_6', 'tipo' => 'longitud'],
            ['nombre' => 'Varilla', 'simbolo' => 'varilla', 'tipo' => 'longitud'],
            ['nombre' => 'Lámina', 'simbolo' => 'lamina', 'tipo' => 'unidad'],
            ['nombre' => 'Caja', 'simbolo' => 'caja', 'tipo' => 'unidad'],
        ];

        $unidadesMap = [];
        foreach ($unidades as $u) {
            $unidad = UnidadMedida::firstOrCreate(['simbolo' => $u['simbolo']], $u);
            $unidadesMap[$u['simbolo']] = $unidad->id;
        }

        // 2. Categorías de Material con Colores Identificativos
        $categorias = [
            ['nombre' => 'Cemento y mortero', 'color' => '#64748b', 'descripcion' => 'Cementos, estucos, yesos y mezclas preparadas.'],
            ['nombre' => 'Acero estructural', 'color' => '#475569', 'descripcion' => 'Fierros corrugados, perfiles, alambres de amarre.'],
            ['nombre' => 'Áridos', 'color' => '#d97706', 'descripcion' => 'Arenas, gravas, piedras, ripio.'],
            ['nombre' => 'Ladrillos y bloques', 'color' => '#b91c1c', 'descripcion' => 'Ladrillos gambote, 6 huecos, bloques de cemento.'],
            ['nombre' => 'Madera', 'color' => '#9a3412', 'descripcion' => 'Tablones, listones, vigas, encofrados.'],
            ['nombre' => 'Pintura', 'color' => '#0284c7', 'descripcion' => 'Pinturas látex, sintéticas, impermeabilizantes.'],
            ['nombre' => 'Plomería', 'color' => '#0891b2', 'descripcion' => 'Tuberías PVC, grifería, accesorios de agua/desagüe.'],
            ['nombre' => 'Electricidad', 'color' => '#ca8a04', 'descripcion' => 'Cables, focos, tomacorrientes, tableros.'],
            ['nombre' => 'Acabados', 'color' => '#8b5cf6', 'descripcion' => 'Cerámicas, porcelanatos, zócalos, pegamentos.'],
            ['nombre' => 'Herramientas menores', 'color' => '#3f6212', 'descripcion' => 'Clavos, tornillos, lijas, discos de corte.'],
        ];

        $categoriasMap = [];
        foreach ($categorias as $cat) {
            $categoria = CategoriaMaterial::firstOrCreate(['nombre' => $cat['nombre']], $cat);
            $categoriasMap[$cat['nombre']] = $categoria->id;
        }

        // 3. Materiales Semilla (Maestros)
        $materiales = [
            // Cemento y mortero
            ['cat' => 'Cemento y mortero', 'nombre' => 'Cemento Soboce IP-30', 'uni' => 'bolsa', 'marca' => 'Soboce', 'precio' => 54.50],
            ['cat' => 'Cemento y mortero', 'nombre' => 'Cemento Coboce', 'uni' => 'bolsa', 'marca' => 'Coboce', 'precio' => 52.00],
            ['cat' => 'Cemento y mortero', 'nombre' => 'Yeso de construcción', 'uni' => 'bolsa_30', 'marca' => 'Generico', 'precio' => 15.00],
            ['cat' => 'Cemento y mortero', 'nombre' => 'Cal hidratada', 'uni' => 'bolsa', 'marca' => 'Generico', 'precio' => 25.00],

            // Acero estructural
            ['cat' => 'Acero estructural', 'nombre' => 'Fierro corrugado 8mm', 'uni' => 'varilla_12', 'marca' => 'Las Lomas', 'precio' => 38.00],
            ['cat' => 'Acero estructural', 'nombre' => 'Fierro corrugado 10mm', 'uni' => 'varilla_12', 'marca' => 'Las Lomas', 'precio' => 55.00],
            ['cat' => 'Acero estructural', 'nombre' => 'Fierro corrugado 12mm', 'uni' => 'varilla_12', 'marca' => 'Las Lomas', 'precio' => 82.00],
            ['cat' => 'Acero estructural', 'nombre' => 'Fierro corrugado 16mm', 'uni' => 'varilla_12', 'marca' => 'Las Lomas', 'precio' => 145.00],
            ['cat' => 'Acero estructural', 'nombre' => 'Alambre de amarre #16', 'uni' => 'kg', 'marca' => 'Generico', 'precio' => 12.00],

            // Áridos
            ['cat' => 'Áridos', 'nombre' => 'Arena fina', 'uni' => 'm3', 'marca' => 'Local', 'precio' => 120.00],
            ['cat' => 'Áridos', 'nombre' => 'Arena gruesa', 'uni' => 'm3', 'marca' => 'Local', 'precio' => 110.00],
            ['cat' => 'Áridos', 'nombre' => 'Grava común', 'uni' => 'm3', 'marca' => 'Local', 'precio' => 130.00],
            ['cat' => 'Áridos', 'nombre' => 'Piedra manzana', 'uni' => 'm3', 'marca' => 'Local', 'precio' => 90.00],

            // Ladrillos y bloques
            ['cat' => 'Ladrillos y bloques', 'nombre' => 'Ladrillo 6 huecos', 'uni' => 'pza', 'marca' => 'Incerpaz', 'precio' => 1.20],
            ['cat' => 'Ladrillos y bloques', 'nombre' => 'Ladrillo gambote', 'uni' => 'pza', 'marca' => 'Local', 'precio' => 0.80],
            ['cat' => 'Ladrillos y bloques', 'nombre' => 'Bloque de cemento 20x20x40', 'uni' => 'pza', 'marca' => 'Generico', 'precio' => 4.50],

            // Madera
            ['cat' => 'Madera', 'nombre' => 'Tablón eucalipto', 'uni' => 'pza', 'marca' => 'Local', 'precio' => 35.00],
            ['cat' => 'Madera', 'nombre' => 'Listón 2x2 para encofrado', 'uni' => 'pza', 'marca' => 'Local', 'precio' => 15.00],
            ['cat' => 'Madera', 'nombre' => 'Puntal de eucalipto', 'uni' => 'pza', 'marca' => 'Local', 'precio' => 20.00],

            // Acabados
            ['cat' => 'Acabados', 'nombre' => 'Cerámica piso 30x30 antideslizante', 'uni' => 'm2', 'marca' => 'Faboce', 'precio' => 45.00],
            ['cat' => 'Acabados', 'nombre' => 'Cerámica baño 20x30 blanca', 'uni' => 'm2', 'marca' => 'Faboce', 'precio' => 40.00],
            ['cat' => 'Acabados', 'nombre' => 'Pegamento cerámico estándar', 'uni' => 'bolsa_25', 'marca' => 'Sika', 'precio' => 35.00],

            // Pintura
            ['cat' => 'Pintura', 'nombre' => 'Pintura látex blanca interior', 'uni' => 'gal', 'marca' => 'Monopol', 'precio' => 85.00],
            ['cat' => 'Pintura', 'nombre' => 'Pintura sintética negra', 'uni' => 'gal', 'marca' => 'Monopol', 'precio' => 110.00],
            ['cat' => 'Pintura', 'nombre' => 'Impermeabilizante acrílico', 'uni' => 'balde', 'marca' => 'Sika', 'precio' => 450.00],

            // Plomería
            ['cat' => 'Plomería', 'nombre' => 'Tubería PVC 4" desagüe', 'uni' => 'varilla_6', 'marca' => 'Tigre', 'precio' => 65.00],
            ['cat' => 'Plomería', 'nombre' => 'Tubería PVC 1/2" agua potable', 'uni' => 'varilla', 'marca' => 'Plastica', 'precio' => 25.00],
            ['cat' => 'Plomería', 'nombre' => 'Pegamento PVC', 'uni' => 'L', 'marca' => 'Oatey', 'precio' => 45.00],

            // Electricidad
            ['cat' => 'Electricidad', 'nombre' => 'Cable eléctrico 2.5mm2 AWG', 'uni' => 'm', 'marca' => 'Pirelli', 'precio' => 2.50],
            ['cat' => 'Electricidad', 'nombre' => 'Cable eléctrico 4.0mm2 AWG', 'uni' => 'm', 'marca' => 'Pirelli', 'precio' => 4.00],
            ['cat' => 'Electricidad', 'nombre' => 'Tomacorriente doble', 'uni' => 'pza', 'marca' => 'Tramontina', 'precio' => 18.00],
            ['cat' => 'Electricidad', 'nombre' => 'Interruptor simple', 'uni' => 'pza', 'marca' => 'Tramontina', 'precio' => 15.00],
            ['cat' => 'Electricidad', 'nombre' => 'Foco LED 9W luz fría', 'uni' => 'pza', 'marca' => 'Philips', 'precio' => 12.00],

            // Herramientas menores
            ['cat' => 'Herramientas menores', 'nombre' => 'Clavos 2" con cabeza', 'uni' => 'kg', 'marca' => 'Generico', 'precio' => 10.00],
            ['cat' => 'Herramientas menores', 'nombre' => 'Clavos 3" con cabeza', 'uni' => 'kg', 'marca' => 'Generico', 'precio' => 10.00],
            ['cat' => 'Herramientas menores', 'nombre' => 'Tornillos para madera 3"', 'uni' => 'caja', 'marca' => 'Generico', 'precio' => 35.00],
            ['cat' => 'Herramientas menores', 'nombre' => 'Disco de corte metal 4.5"', 'uni' => 'pza', 'marca' => 'Makita', 'precio' => 15.00],
        ];

        $contadorCodigo = 1;
        foreach ($materiales as $mat) {
            $codigo = 'MAT-' . str_pad($contadorCodigo++, 4, '0', STR_PAD_LEFT);
            
            Material::firstOrCreate(
                [
                    'nombre' => $mat['nombre'],
                    'categoria_id' => $categoriasMap[$mat['cat']],
                ],
                [
                    'codigo' => $codigo,
                    'unidad_medida_id' => $unidadesMap[$mat['uni']],
                    'marca' => $mat['marca'],
                    'precio_referencial' => $mat['precio'],
                    'stock_minimo' => 10, // Stock mínimo global por defecto
                    'tipo' => 'maestro',
                    'activo' => true,
                ]
            );
        }
    }
}
