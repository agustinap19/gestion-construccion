<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DispositivoMovil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MobileAuthController extends Controller
{
    /**
     * POST /api/movil/v1/auth/login
     * Autentica al usuario y registra el dispositivo.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'       => 'required|email',
            'password'    => 'required',
            'device_name' => 'required|string|max:255',
            'device_id'   => 'required|string|max:255',
        ]);

        if (! Auth::attempt([
            'email'  => $request->email,
            'password' => $request->password,
            'estado' => 'activo',
        ])) {
            return response()->json([
                'success' => false,
                'message' => 'Credenciales incorrectas o cuenta inactiva.',
            ], 401);
        }

        $user = Auth::user();

        // Revocar tokens móviles anteriores del mismo dispositivo
        $user->tokens()->where('name', 'mobile_app_' . $request->device_id)->delete();

        $token = $user->createToken('mobile_app_' . $request->device_id)->plainTextToken;

        // Registrar / actualizar dispositivo
        DispositivoMovil::updateOrCreate(
            ['usuario_id' => $user->id, 'device_id' => $request->device_id],
            [
                'device_name' => $request->device_name,
                'activo'      => true,
            ]
        );

        return response()->json([
            'success'   => true,
            'token'     => $token,
            'expira_en' => null,
            'user'      => [
                'id'     => $user->id,
                'nombre' => trim($user->nombre . ' ' . $user->apellido_paterno),
                'email'  => $user->email,
                'rol'    => $user->rol?->nombre,
            ],
        ]);
    }

    /**
     * POST /api/movil/v1/logout
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }
}
