<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Beneficiario;
use App\Models\Cliente;
use App\Models\EntidadEstatal;
use App\Models\Personal;
use App\Models\Rol;
use App\Models\User;
use App\Services\ExportacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AuditoriaController extends Controller
{
    private const MODELOS = [
        'usuarios'            => User::class,
        'clientes'            => Cliente::class,
        'entidades-estatales' => EntidadEstatal::class,
        'beneficiarios'       => Beneficiario::class,
        'personal'            => Personal::class,
        'roles'               => Rol::class,
    ];

    private const ETIQUETAS_TIPO = [
        'usuarios'            => 'Usuario',
        'clientes'            => 'Cliente',
        'entidades-estatales' => 'Entidad Estatal',
        'beneficiarios'       => 'Beneficiario',
        'personal'            => 'Personal',
        'roles'               => 'Rol',
    ];

    public function __construct(private ExportacionService $exportacion) {}

    public function porEntidad(Request $request, string $tipo, int $id): JsonResponse
    {
        $modeloClass = self::MODELOS[$tipo] ?? null;

        if (!$modeloClass) {
            return response()->json(['message' => 'Tipo de entidad no soportado.'], 404);
        }

        $entidad = $modeloClass::withTrashed()->findOrFail($id);

        $query = $entidad->audits()
            ->with('user:id,nombre,apellido_paterno,apellido_materno,email')
            ->latest();

        if ($desde = $request->get('desde')) {
            $query->whereDate('created_at', '>=', $desde);
        }
        if ($hasta = $request->get('hasta')) {
            $query->whereDate('created_at', '<=', $hasta);
        }

        $audits = $query->paginate((int) $request->get('per_page', 20));

        return response()->json(['data' => $audits]);
    }

    public function exportarPdf(Request $request, string $tipo, int $id): Response
    {
        $modeloClass = self::MODELOS[$tipo] ?? null;

        if (!$modeloClass) {
            abort(404, 'Tipo de entidad no soportado.');
        }

        $entidad = $modeloClass::withTrashed()->findOrFail($id);

        $desde = $request->get('desde');
        $hasta = $request->get('hasta');

        $query = $entidad->audits()
            ->with('user:id,nombre,apellido_paterno,apellido_materno,email')
            ->latest();

        if ($desde) {
            $query->whereDate('created_at', '>=', $desde);
        }
        if ($hasta) {
            $query->whereDate('created_at', '<=', $hasta);
        }

        $audits = $query->get();

        return $this->exportacion->pdf(
            'auditoria_entidad',
            [
                'audits'        => $audits,
                'tipo'          => $tipo,
                'etiquetaTipo'  => self::ETIQUETAS_TIPO[$tipo] ?? ucfirst($tipo),
                'nombreEntidad' => $this->resolverNombreEntidad($tipo, $entidad),
                'desde'         => $desde,
                'hasta'         => $hasta,
                '_filas'        => $audits->count(),
            ],
            'auditoria',
            "auditoria_{$tipo}_{$id}",
            $request->user(),
            array_filter(['desde' => $desde, 'hasta' => $hasta]),
        );
    }

    private function resolverNombreEntidad(string $tipo, mixed $entidad): string
    {
        return match ($tipo) {
            'usuarios', 'personal' => trim(($entidad->nombre ?? '') . ' ' . ($entidad->apellido_paterno ?? '')),
            'clientes'             => $entidad->nombre_comercial ?? $entidad->razon_social ?? $entidad->nombre ?? "#{$entidad->id}",
            'entidades-estatales'  => $entidad->nombre ?? "#{$entidad->id}",
            default                => $entidad->nombre ?? "#{$entidad->id}",
        };
    }
}
