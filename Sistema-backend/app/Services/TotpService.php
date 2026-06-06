<?php

namespace App\Services;

use PragmaRX\Google2FA\Google2FA;
use App\Models\User;

class TotpService
{
    protected Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    public function generarSecreto(): string
    {
        return $this->google2fa->generateSecretKey();
    }

    public function generarQrUrl(User $user, string $secreto): string
    {
        return $this->google2fa->getQRCodeUrl(
            config('app.name'),
            $user->email,
            $secreto
        );
    }

    public function verificarCodigo(string $secreto, string $codigo): bool
    {
        return (bool) $this->google2fa->verifyKey($secreto, $codigo);
    }

    public function activarTotp(User $user, string $secreto): void
    {
        $user->update([
            'totp_secret'      => $secreto,
            'totp_activo'      => true,
            'totp_activado_en' => now(),
        ]);
    }
}
