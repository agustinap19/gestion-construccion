<?php

namespace App\Http\Controllers;

use App\Models\DocumentoEmitido;
use Illuminate\Http\Request;

class DocumentoValidacionController extends Controller
{
    public function verificar($hash)
    {
        $documento = DocumentoEmitido::with(['proyecto', 'beneficiario', 'emisor'])
            ->where('hash', $hash)
            ->first();

        if (!$documento) {
            return view('reportes.validacion', [
                'valido' => false,
                'mensaje' => 'El documento no existe o el código es inválido.'
            ]);
        }

        return view('reportes.validacion', [
            'valido' => true,
            'documento' => $documento
        ]);
    }
}
