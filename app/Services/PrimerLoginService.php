<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class PrimerLoginService
{
    public function __construct(
        protected AuditoriaAccesoService $auditoriaService
    ) {}

    /**
     * Valida que la contraseña cumpla reglas fuertes
     */
    public function validarFortalezaPassword(string $password): array
    {
        $errores = [];
        if (strlen($password) < 8) {
            $errores[] = 'La contraseña debe tener al menos 8 caracteres.';
        }
        if (!preg_match('/[A-Z]/', $password)) {
            $errores[] = 'La contraseña debe contener al menos una letra mayúscula.';
        }
        if (!preg_match('/[a-z]/', $password)) {
            $errores[] = 'La contraseña debe contener al menos una letra minúscula.';
        }
        if (!preg_match('/[0-9]/', $password)) {
            $errores[] = 'La contraseña debe contener al menos un número.';
        }
        if (!preg_match('/[\W]/', $password)) { // \W matches any non-word character (symbols)
            $errores[] = 'La contraseña debe contener al menos un símbolo especial.';
        }
        
        return $errores;
    }

    /**
     * Valida la contraseña actual y actualiza a una nueva
     */
    public function cambiarPasswordObligatorio(User $user, string $passwordActual, string $nuevaPassword, Request $request): void
    {
        // 1. Validar que la contraseña actual coincida
        if (!Hash::check($passwordActual, $user->password)) {
            // Registrar intento fallido
            $this->auditoriaService->registrarIntento($user->email, false, 'password_primer_login_incorrecto', $request);
            
            throw ValidationException::withMessages([
                'password_actual' => ['La contraseña actual es incorrecta.']
            ])->status(401);
        }

        // 2. Validar fortaleza de la nueva contraseña
        $erroresFortaleza = $this->validarFortalezaPassword($nuevaPassword);
        if (count($erroresFortaleza) > 0) {
            throw ValidationException::withMessages([
                'nueva_password' => $erroresFortaleza
            ]);
        }

        // 3. Actualizar contraseña y cambiar el flag
        $user->update([
            'password' => Hash::make($nuevaPassword),
            'debe_cambiar_password' => false,
            'password_cambiado_en' => now(),
        ]);
        
        // Opcional: Registrar éxito de cambio de contraseña
        // $this->auditoriaService->registrarIntento($user->email, true, 'password_primer_login_cambiado', $request);
    }

    /**
     * Registra el descriptor facial y la imagen base64
     */
    public function registrarRostro(User $user, string $rostroBase64, array $descriptor): void
    {
        if (count($descriptor) !== 128) {
            throw ValidationException::withMessages([
                'descriptor' => ['El descriptor facial no es válido o está incompleto.']
            ]);
        }

        $user->update([
            'rostro_base64' => $rostroBase64,
            'descriptor_facial' => $descriptor,
            'rostro_registrado' => true,
            'rostro_registrado_en' => now(),
        ]);
    }
}
