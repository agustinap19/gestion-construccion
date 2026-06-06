<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class PrimerLoginService
{
    public function cambiarPasswordObligatorio(User $user, string $passwordActual, string $nuevaPassword): void
    {
        if (!Hash::check($passwordActual, $user->password)) {
            throw ValidationException::withMessages([
                'password_actual' => ['La contraseña actual es incorrecta.'],
            ])->status(422);
        }

        // Revocar todos los tokens previos y emitir uno limpio al responder
        $user->tokens()->delete();

        $user->update([
            'password' => Hash::make($nuevaPassword),
            'debe_cambiar_password' => false,
            'password_cambiado_en' => now(),
        ]);
    }
}
