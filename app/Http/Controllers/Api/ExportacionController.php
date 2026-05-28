<?php

namespace App\Http\Controllers\Api;

use App\Exports\AvanceProyectoExport;
use App\Exports\BeneficiariosExport;
use App\Exports\PersonalExport;
use App\Exports\ProyectosExport;
use App\Exports\UsuariosExport;
use App\Http\Controllers\Controller;
use App\Jobs\GenerarZipActasJob;
use App\Models\Beneficiario;
use App\Models\MovimientoAlmacen;
use App\Models\Personal;
use App\Models\Permiso;
use App\Models\Proyecto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Vivienda;
use App\Services\ExportacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportacionController extends Controller
{
    public function __construct(private ExportacionService $svc) {}

    // ── Proyectos ────────────────────────────────────────────────────────────

    public function proyectos(Request $request): Response|BinaryFileResponse
    {
        $filtros = $request->only(['estado', 'categoria']);
        $fmt     = $request->input('formato', 'pdf');

        if ($fmt === 'excel') {
            return $this->svc->excel(
                new ProyectosExport($filtros),
                'proyectos', 'lista_proyectos_' . now()->format('Ymd'),
                $request->user(), $filtros
            );
        }

        $proyectos = Proyecto::with(['responsable', 'cliente', 'entidadEstatal'])
            ->when($filtros['estado'] ?? null, fn($q, $v) => $q->where('estado', $v))
            ->when($filtros['categoria'] ?? null, fn($q, $v) => $q->where('categoria', $v))
            ->orderByDesc('created_at')->get();

        return $this->svc->pdf('lista_proyectos', [
            'proyectos'   => $proyectos,
            'subtitulo'   => $this->buildSubtitulo($filtros),
            '_filas'      => $proyectos->count(),
        ], 'proyectos', 'lista_proyectos_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Avance de un proyecto específico ────────────────────────────────────

    public function avanceProyecto(Request $request, int $proyectoId): Response|BinaryFileResponse
    {
        $fmt = $request->input('formato', 'pdf');

        if ($fmt === 'excel') {
            $export = new AvanceProyectoExport($proyectoId);
            return $this->svc->excel(
                $export, 'avance_proyecto',
                'avance_' . $export->getProyecto()->codigo . '_' . now()->format('Ymd'),
                $request->user()
            );
        }

        // PDF usa la vista existente avance_proyecto.blade.php
        $proyecto = Proyecto::with(['responsable', 'entidadEstatal', 'cliente'])->findOrFail($proyectoId);
        $export   = new AvanceProyectoExport($proyectoId);
        $avance   = $export->getAvance();
        $unidades = $avance['avance_por_unidad'] ?? [];

        return $this->svc->pdf('avance_proyecto', [
            'proyecto' => $proyecto,
            'avance'   => $avance,
            'unidades' => $unidades,
            '_filas'   => count($unidades),
        ], 'avance_proyecto', 'avance_' . $proyecto->codigo . '_' . now()->format('Ymd'), $request->user());
    }

    // ── Materiales ────────────────────────────────────────────────────────

    public function materiales(Request $request): Response|BinaryFileResponse
    {
        $filtros = $request->only(['tipo', 'categoria', 'busqueda']);
        $fmt     = $request->input('formato', 'pdf');

        $query = \App\Models\Material::with(['categoria', 'unidadMedida', 'proyecto']);

        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos') {
            $query->where('tipo', $filtros['tipo']);
        }
        if (!empty($filtros['categoria'])) {
            $query->where('categoria_id', $filtros['categoria']);
        }
        if (!empty($filtros['busqueda'])) {
            $q = $filtros['busqueda'];
            $query->where(function($w) use ($q) {
                $w->where('nombre', 'like', "%{$q}%")
                  ->orWhere('codigo', 'like', "%{$q}%")
                  ->orWhere('marca', 'like', "%{$q}%");
            });
        }

        $materiales = $query->orderBy('nombre')->get();

        // Si tuvieras un export a Excel (no lo implementaremos para simplificar, pero dejo la estructura)
        /*
        if ($fmt === 'excel') {
            return $this->svc->excel(
                new MaterialesExport($filtros),
                'materiales', 'catalogo_materiales_' . now()->format('Ymd'),
                $request->user(), $filtros
            );
        }
        */

        return $this->svc->pdf('lista_materiales', [
            'materiales' => $materiales,
            '_filas'   => $materiales->count(),
            '_landscape' => true,
        ], 'materiales', 'catalogo_materiales_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Beneficiarios ────────────────────────────────────────────────────────

    public function beneficiarios(Request $request, int $proyectoId): Response|BinaryFileResponse
    {
        $filtros = $request->only(['estado_seleccion', 'comunidad']);
        $fmt     = $request->input('formato', 'pdf');

        if ($fmt === 'excel') {
            return $this->svc->excel(
                new BeneficiariosExport($proyectoId, $filtros),
                'beneficiarios', 'beneficiarios_proyecto_' . $proyectoId . '_' . now()->format('Ymd'),
                $request->user(), $filtros
            );
        }

        $proyecto     = Proyecto::findOrFail($proyectoId);
        $beneficiarios = Beneficiario::with(['tipoVivienda', 'vivienda'])
            ->where('proyecto_id', $proyectoId)
            ->when($filtros['estado_seleccion'] ?? null, fn($q, $v) => $q->where('estado_seleccion', $v))
            ->when($filtros['comunidad'] ?? null, fn($q, $v) => $q->where('comunidad', 'like', "%{$v}%"))
            ->orderBy('apellido_paterno')->get();

        $stats = [
            'total'     => $beneficiarios->count(),
            'por_estado' => $beneficiarios->groupBy('estado_seleccion')
                ->map(fn($g) => $g->count())->toArray(),
        ];

        return $this->svc->pdf('lista_beneficiarios', [
            'proyecto'      => $proyecto,
            'beneficiarios' => $beneficiarios,
            'stats'         => $stats,
            '_filas'        => $beneficiarios->count(),
        ], 'beneficiarios', 'beneficiarios_' . $proyecto->codigo . '_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Ficha individual de beneficiario ────────────────────────────────────

    public function fichaBeneficiario(Request $request, int $beneficiarioId): Response
    {
        $beneficiario = Beneficiario::with(['tipoVivienda', 'vivienda', 'proyecto'])->findOrFail($beneficiarioId);
        $proyecto     = $beneficiario->proyecto;

        return $this->svc->pdf('ficha_beneficiario', [
            'beneficiario' => $beneficiario,
            'proyecto'     => $proyecto,
            '_filas'       => 1,
        ], 'ficha_beneficiario', 'ficha_' . $beneficiario->codigo_beneficiario, $request->user());
    }

    // ── Acta de entrega individual ───────────────────────────────────────────

    public function actaEntrega(Request $request, int $viviendaId): Response
    {
        $vivienda     = Vivienda::with(['beneficiario.tipoVivienda', 'proyecto', 'itemsChecklist'])->findOrFail($viviendaId);
        $beneficiario = $vivienda->beneficiario;
        $proyecto     = $vivienda->proyecto;

        if (!$beneficiario) {
            abort(422, 'La vivienda no tiene beneficiario asignado.');
        }

        return $this->svc->pdf('acta_entrega_vivienda', [
            'vivienda'     => $vivienda,
            'beneficiario' => $beneficiario,
            'proyecto'     => $proyecto,
            'items'        => $vivienda->itemsChecklist,
            'acta_numero'  => $viviendaId,
            '_filas'       => 1,
        ], 'acta_entrega', 'acta_' . $vivienda->codigo, $request->user());
    }

    // ── ZIP asíncrono de actas de un proyecto ─────────────────────────────

    public function actasZip(Request $request, int $proyectoId): JsonResponse
    {
        $proyecto = Proyecto::findOrFail($proyectoId);

        $jobId = uniqid('zip_actas_');
        GenerarZipActasJob::dispatch($proyectoId, $request->user()->id, $jobId);

        return response()->json([
            'status'  => 'queued',
            'job_id'  => $jobId,
            'message' => "Generando actas para el proyecto {$proyecto->codigo}. Recibirás una notificación cuando estén listas.",
        ]);
    }

    // ── Personal ──────────────────────────────────────────────────────────

    public function personal(Request $request): Response|BinaryFileResponse
    {
        $filtros = $request->only(['estado_laboral', 'tipo']);
        $fmt     = $request->input('formato', 'pdf');

        if ($fmt === 'excel') {
            return $this->svc->excel(
                new PersonalExport($filtros),
                'personal', 'lista_personal_' . now()->format('Ymd'),
                $request->user(), $filtros
            );
        }

        $personal = Personal::when($filtros['estado_laboral'] ?? null, fn($q, $v) => $q->where('estado_laboral', $v))
            ->when($filtros['tipo'] ?? null, fn($q, $v) => $q->where('tipo', $v))
            ->orderBy('apellido_paterno')->get();

        return $this->svc->pdf('lista_personal', [
            'personal' => $personal,
            '_filas'   => $personal->count(),
        ], 'personal', 'lista_personal_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Usuarios ─────────────────────────────────────────────────────────

    public function usuarios(Request $request): Response|BinaryFileResponse
    {
        $filtros = $request->only(['estado', 'rol_id']);
        $fmt     = $request->input('formato', 'pdf');

        if ($fmt === 'excel') {
            return $this->svc->excel(
                new UsuariosExport($filtros),
                'usuarios', 'lista_usuarios_' . now()->format('Ymd'),
                $request->user(), $filtros
            );
        }

        $usuarios = User::with('rol')
            ->when($filtros['estado'] ?? null, fn($q, $v) => $q->where('estado', $v))
            ->when($filtros['rol_id'] ?? null, fn($q, $v) => $q->where('rol_id', $v))
            ->orderBy('apellido_paterno')->get();

        return $this->svc->pdf('lista_usuarios', [
            'usuarios' => $usuarios,
            '_filas'   => $usuarios->count(),
        ], 'usuarios', 'lista_usuarios_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Matriz de roles/permisos ─────────────────────────────────────────

    public function matrizRoles(Request $request): Response
    {
        $roles    = Rol::with('permisos')->where('estado', 'activo')->orderBy('nombre')->get();
        $permisos = Permiso::orderBy('modulo')->orderBy('accion')->get();

        $grupos = $permisos->groupBy('modulo');
        $rolPermisos = [];
        foreach ($roles as $rol) {
            foreach ($rol->permisos as $p) {
                $rolPermisos[$rol->id][$p->id] = true;
            }
        }

        return $this->svc->pdf('matriz_roles_permisos', [
            'roles'          => $roles,
            'grupos'         => $grupos,
            'rolPermisos'    => $rolPermisos,
            'totalPermisos'  => $permisos->count(),
            '_filas'         => $permisos->count(),
            '_landscape'     => true,
        ], 'roles', 'matriz_roles_' . now()->format('Ymd'), $request->user());
    }

    // ── Kardex de almacén ─────────────────────────────────────────────────

    public function kardexAlmacen(Request $request, int $almacenId, int $materialId): Response
    {
        $almacen  = \App\Models\Almacen::findOrFail($almacenId);
        $material = \App\Models\Material::findOrFail($materialId);

        $query = \App\Models\MovimientoMaterial::with('registradoPor:id,name')
            ->where('almacen_id', $almacenId)
            ->where('material_id', $materialId)
            ->orderBy('fecha_movimiento')
            ->orderBy('id');

        if ($request->input('desde')) $query->whereDate('fecha_movimiento', '>=', $request->input('desde'));
        if ($request->input('hasta')) $query->whereDate('fecha_movimiento', '<=', $request->input('hasta'));

        $movimientos = $query->get();

        return $this->svc->pdf('kardex_almacen', [
            'almacen'     => $almacen,
            'material'    => $material,
            'movimientos' => $movimientos,
            'desde'       => $request->input('desde') ? \Carbon\Carbon::parse($request->input('desde'))->format('d/m/Y') : null,
            'hasta'       => $request->input('hasta') ? \Carbon\Carbon::parse($request->input('hasta'))->format('d/m/Y') : null,
            '_filas'      => $movimientos->count(),
            '_landscape'  => true,
        ], 'kardex', "kardex_{$almacen->codigo}_{$material->codigo}_" . now()->format('Ymd'), $request->user());
    }

    // ── Presupuesto de materiales ─────────────────────────────────────────

    public function presupuestoMateriales(Request $request, int $proyectoId): Response
    {
        $proyecto = \App\Models\Proyecto::findOrFail($proyectoId);
        $items    = \App\Models\PresupuestoMaterialProyecto::with([
            'material.categoria',
            'material.unidadMedida',
        ])->where('proyecto_id', $proyectoId)->get();

        return $this->svc->pdf('presupuesto_materiales', [
            'proyecto' => $proyecto,
            'items'    => $items,
            '_filas'   => $items->count(),
        ], 'presupuesto_materiales', "presupuesto_materiales_{$proyecto->codigo}_" . now()->format('Ymd'), $request->user());
    }

    // ── Movimientos Almacén ───────────────────────────────────────────────

    public function movimientosAlmacen(Request $request): Response
    {
        if (!$request->user()->hasPermissionTo('movimientos.ver')) {
            abort(403);
        }

        $filtros = $request->only(['almacen_id', 'tipo', 'estado', 'busqueda', 'fecha_desde', 'fecha_hasta']);

        $q = MovimientoAlmacen::with([
            'almacenDestino:id,nombre,codigo',
            'almacenOrigen:id,nombre,codigo',
            'detalles.material:id,nombre,codigo',
            'registradoPor:id,name',
        ])->latest('fecha_movimiento');

        if (!empty($filtros['almacen_id'])) {
            $id = $filtros['almacen_id'];
            $q->where(fn($q) => $q->where('almacen_origen_id', $id)->orWhere('almacen_destino_id', $id));
        }
        if (!empty($filtros['tipo']) && $filtros['tipo'] !== 'todos')   $q->where('tipo', $filtros['tipo']);
        if (!empty($filtros['estado']) && $filtros['estado'] !== 'todos') $q->where('estado', $filtros['estado']);
        if (!empty($filtros['fecha_desde'])) $q->whereDate('fecha_movimiento', '>=', $filtros['fecha_desde']);
        if (!empty($filtros['fecha_hasta'])) $q->whereDate('fecha_movimiento', '<=', $filtros['fecha_hasta']);
        if (!empty($filtros['busqueda'])) {
            $b = $filtros['busqueda'];
            $q->where(fn($q) => $q->where('codigo', 'like', "%{$b}%")->orWhere('proveedor_nombre', 'like', "%{$b}%")->orWhere('numero_factura', 'like', "%{$b}%"));
        }

        $movimientos = $q->get();

        return $this->svc->pdf('lista_movimientos_almacen', [
            'movimientos' => $movimientos,
            '_filas'      => $movimientos->count(),
            '_landscape'  => true,
            'filtros'     => $filtros,
        ], 'movimientos_almacen', 'movimientos_almacen_' . now()->format('Ymd'), $request->user(), $filtros);
    }

    // ── Helper ────────────────────────────────────────────────────────────

    private function buildSubtitulo(array $filtros): string
    {
        $parts = [];
        if (!empty($filtros['estado']))    $parts[] = 'Estado: ' . ucfirst(str_replace('_', ' ', $filtros['estado']));
        if (!empty($filtros['categoria'])) $parts[] = 'Categoría: ' . ucfirst($filtros['categoria']);
        return $parts ? implode(' — ', $parts) : 'Todos los proyectos';
    }
}
