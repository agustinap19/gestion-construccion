<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\TotpService;
use Illuminate\Http\Request;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

class TotpController extends Controller
{
    public function __construct(protected TotpService $totpService) {}

    public function setup(Request $request)
    {
        $user    = $request->user();
        $secreto = $this->totpService->generarSecreto();

        session(['totp_secret_pendiente' => $secreto]);

        $url = $this->totpService->generarQrUrl($user, $secreto);

        $renderer = new ImageRenderer(
            new RendererStyle(200),
            new SvgImageBackEnd()
        );
        $writer  = new Writer($renderer);
        $qrSvg   = $writer->writeString($url);

        return response()->json([
            'secreto' => $secreto,
            'qr_svg'  => base64_encode($qrSvg),
            'mensaje' => 'Escanea el QR con Google Authenticator y confirma con un código',
        ]);
    }

    public function confirmar(Request $request)
    {
        $request->validate(['codigo' => 'required|digits:6']);

        $user    = $request->user();
        $secreto = session('totp_secret_pendiente');

        if (!$secreto) {
            return response()->json(['error' => 'No hay configuración TOTP pendiente'], 400);
        }

        if (!$this->totpService->verificarCodigo($secreto, $request->codigo)) {
            return response()->json(['error' => 'Código incorrecto'], 422);
        }

        $this->totpService->activarTotp($user, $secreto);
        session()->forget('totp_secret_pendiente');

        return response()->json(['mensaje' => 'TOTP activado correctamente']);
    }

    public function estado(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'totp_activo'      => $user->totp_activo,
            'totp_activado_en' => $user->totp_activado_en,
        ]);
    }
}
