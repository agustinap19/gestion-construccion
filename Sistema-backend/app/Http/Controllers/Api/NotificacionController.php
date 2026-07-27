<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\NotificacionService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class NotificacionController extends Controller
{
    protected NotificacionService $notificacionService;

    public function __construct(NotificacionService $notificacionService)
    {
        $this->notificacionService = $notificacionService;
    }

    public function index(Request $request): JsonResponse
    {
        $perPage = $request->query('per_page', 20);
        $leida = $request->has('leida') ? filter_var($request->query('leida'), FILTER_VALIDATE_BOOLEAN) : null;
        
        $notificaciones = $this->notificacionService->obtenerTodas($request->user()->id, $perPage, $leida);
        return response()->json($notificaciones);
    }

    public function noLeidas(Request $request): JsonResponse
    {
        $limit = $request->query('limit', 10);
        $notificaciones = $this->notificacionService->obtenerNoLeidas($request->user()->id, $limit);
        return response()->json($notificaciones);
    }

    public function contadorNoLeidas(Request $request): JsonResponse
    {
        $contador = $this->notificacionService->contarNoLeidas($request->user()->id);
        return response()->json(['contador' => $contador]);
    }

    public function marcarLeida(Request $request, int $id): JsonResponse
    {
        $marcada = $this->notificacionService->marcarComoLeida($id, $request->user()->id);
        
        if ($marcada) {
            return response()->json(['message' => 'Notificación marcada como leída']);
        }
        
        return response()->json(['message' => 'Notificación no encontrada o ya leída'], 404);
    }

    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        $actualizadas = $this->notificacionService->marcarTodasComoLeidas($request->user()->id);
        return response()->json([
            'message' => 'Todas las notificaciones marcadas como leídas',
            'actualizadas' => $actualizadas
        ]);
    }
}
