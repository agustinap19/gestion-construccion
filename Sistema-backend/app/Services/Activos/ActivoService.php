<?php

namespace App\Services\Activos;

use App\Models\Activo;
use Illuminate\Http\UploadedFile;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Exception;

class ActivoService
{
    private const PREFIJOS_TIPO = [
        'maquinaria'  => 'MAQ',
        'equipo'      => 'EQU',
        'herramienta' => 'HER',
        'vehiculo'    => 'VEH',
    ];

    public function listarConFiltros(array $filtros, int $perPage = 20): LengthAwarePaginator
    {
        $query = Activo::with(['almacen:id,nombre,codigo', 'creadoPor:id,nombre,apellido_paterno']);

        if (!empty($filtros['tipo'])) {
            $query->where('tipo', $filtros['tipo']);
        }

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        if (!empty($filtros['almacen_id'])) {
            $query->where('almacen_id', $filtros['almacen_id']);
        }

        if (!empty($filtros['buscar'])) {
            $b = $filtros['buscar'];
            $query->where(function ($q) use ($b) {
                $q->where('nombre', 'like', "%{$b}%")
                  ->orWhere('codigo', 'like', "%{$b}%");
            });
        }

        $activos = $query->orderBy('nombre')->paginate($perPage);

        $activos->getCollection()->transform(function (Activo $activo) {
            $activo->necesita_mantenimiento = $activo->necesitaMantenimiento();
            return $activo;
        });

        return $activos;
    }

    public function crear(array $datos, int $userId): Activo
    {
        return DB::transaction(function () use ($datos, $userId) {
            if (empty($datos['codigo'])) {
                $datos['codigo'] = $this->generarCodigo($datos['tipo']);
            }

            $datos['created_by'] = $userId;

            return Activo::create($datos);
        });
    }

    private function generarCodigo(string $tipo): string
    {
        $prefijo = self::PREFIJOS_TIPO[$tipo] ?? 'ACT';

        $ultimo = Activo::withTrashed()
            ->where('codigo', 'like', "{$prefijo}-%")
            ->orderByDesc('id')
            ->value('codigo');

        $siguiente = 1;
        if ($ultimo && preg_match('/-(\d+)$/', $ultimo, $m)) {
            $siguiente = (int) $m[1] + 1;
        }

        return sprintf('%s-%03d', $prefijo, $siguiente);
    }

    public function obtenerDetalle(int $id): Activo
    {
        return Activo::with([
            'almacen:id,nombre,codigo,latitud,longitud',
            'tipoActivo:id,nombre',
            'responsable:id,nombre,apellido_paterno',
            'creadoPor:id,nombre,apellido_paterno',
            'asignaciones' => fn ($q) => $q->whereIn('estado', ['planificada', 'activa'])->latest('fecha_inicio'),
            'mantenimientos' => fn ($q) => $q->latest('fecha_programada')->limit(1),
        ])->findOrFail($id);
    }

    public function actualizar(int $id, array $datos): Activo
    {
        return DB::transaction(function () use ($id, $datos) {
            $activo = Activo::findOrFail($id);
            $activo->update($datos);
            return $activo->fresh();
        });
    }

    public function eliminar(int $id): void
    {
        $activo = Activo::findOrFail($id);

        if ($activo->asignaciones()->whereIn('estado', ['planificada', 'activa'])->exists()) {
            throw new Exception('No se puede eliminar un activo con asignaciones activas o planificadas.');
        }

        $activo->delete();
    }

    public function disponibles()
    {
        return Activo::disponibles()
            ->whereRaw('horas_uso_acumuladas < horas_mantenimiento_cada')
            ->orderBy('nombre')
            ->get();
    }

    public function guardarImagen(UploadedFile $file): string
    {
        $extension = $file->getClientOriginalExtension();
        $filename  = Str::uuid() . '.' . $extension;
        $file->storeAs('activos', $filename, 'public');

        return '/storage/activos/' . $filename;
    }

    public function estadisticas(): array
    {
        $base = Activo::query();

        $total         = (clone $base)->count();
        $disponibles   = (clone $base)->where('estado', 'disponible')->count();
        $asignados     = (clone $base)->where('estado', 'asignado')->count();
        $mantenimiento = (clone $base)->where('estado', 'mantenimiento')->count();
        $baja          = (clone $base)->where('estado', 'baja')->count();
        $valorDiaTotal = (float) (clone $base)->where('estado', '!=', 'baja')->sum('costo_dia_uso');
        $necesitanMantenimiento = (clone $base)
            ->whereColumn('horas_uso_acumuladas', '>=', 'horas_mantenimiento_cada')
            ->count();

        return compact('total', 'disponibles', 'asignados', 'mantenimiento', 'baja', 'valorDiaTotal', 'necesitanMantenimiento');
    }
}
