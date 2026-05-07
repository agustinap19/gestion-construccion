<?php

namespace App\Services;

use App\Mail\UsuarioCreadoMail;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Exception;

class UsuarioService
{
    /**
     * Lista usuarios con paginación y filtros.
     */
    public function listar(array $filtros = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = User::with('rol')->latest();

        if (!empty($filtros['search'])) {
            $search = $filtros['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                  ->orWhere('apellido_paterno', 'like', "%{$search}%")
                  ->orWhere('apellido_materno', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('ci', 'like', "%{$search}%");
            });
        }

        if (!empty($filtros['rol_id'])) {
            $query->where('rol_id', $filtros['rol_id']);
        }

        if (!empty($filtros['estado'])) {
            $query->where('estado', $filtros['estado']);
        }

        return $query->paginate($perPage);
    }

    /**
     * Obtiene un usuario específico.
     */
    public function obtener(int $id): User
    {
        $user = User::with('rol')->findOrFail($id);
        return $user;
    }

    /**
     * Crea un nuevo usuario y envía la contraseña temporal.
     */
    public function crear(array $datos): User
    {
        DB::beginTransaction();
        try {
            // Generar contraseña aleatoria segura
            $passwordTemporal = Str::password(12, true, true, true, false);

            $user = User::create([
                'nombre' => $datos['nombre'],
                'apellido_paterno' => $datos['apellido_paterno'],
                'apellido_materno' => $datos['apellido_materno'] ?? null,
                'ci' => $datos['ci'],
                'ci_complemento' => $datos['ci_complemento'] ?? null,
                'email' => $datos['email'],
                'telefono' => $datos['telefono'] ?? null,
                'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? null,
                'direccion' => $datos['direccion'] ?? null,
                'rol_id' => $datos['rol_id'],
                'estado' => $datos['estado'] ?? 'activo',
                'password' => Hash::make($passwordTemporal),
                'debe_cambiar_password' => true,
            ]);

            // Enviar correo
            Mail::to($user->email)->send(new UsuarioCreadoMail($user, $passwordTemporal));

            DB::commit();
            return $user->load('rol');
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Actualiza un usuario.
     */
    public function actualizar(int $id, array $datos): User
    {
        $user = User::findOrFail($id);
        
        $user->update([
            'nombre' => $datos['nombre'],
            'apellido_paterno' => $datos['apellido_paterno'],
            'apellido_materno' => $datos['apellido_materno'] ?? $user->apellido_materno,
            'ci' => $datos['ci'],
            'ci_complemento' => $datos['ci_complemento'] ?? $user->ci_complemento,
            'email' => $datos['email'],
            'telefono' => $datos['telefono'] ?? $user->telefono,
            'fecha_nacimiento' => $datos['fecha_nacimiento'] ?? $user->fecha_nacimiento,
            'direccion' => $datos['direccion'] ?? $user->direccion,
            'rol_id' => $datos['rol_id'] ?? $user->rol_id,
        ]);

        return $user->load('rol');
    }

    /**
     * Cambia el estado del usuario.
     */
    public function cambiarEstado(int $id, string $nuevoEstado): User
    {
        $user = User::findOrFail($id);
        $user->update(['estado' => $nuevoEstado]);
        return $user;
    }

    /**
     * Reenvía la contraseña temporal generando una nueva.
     */
    public function reenviarPasswordTemporal(int $id): User
    {
        $user = User::findOrFail($id);
        
        $passwordTemporal = Str::password(12, true, true, true, false);

        $user->update([
            'password' => Hash::make($passwordTemporal),
            'debe_cambiar_password' => true,
        ]);

        Mail::to($user->email)->send(new UsuarioCreadoMail($user, $passwordTemporal));

        return $user;
    }

    /**
     * Elimina lógicamente a un usuario.
     */
    public function eliminar(int $id): bool
    {
        $user = User::findOrFail($id);
        return $user->delete();
    }
}
