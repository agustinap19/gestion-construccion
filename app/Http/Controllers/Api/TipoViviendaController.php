<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TipoVivienda;
use Illuminate\Http\Request;

class TipoViviendaController extends Controller
{
    public function index()
    {
        $tipos = TipoVivienda::select('id', 'nombre', 'metros_cuadrados', 'cantidad_dormitorios')->get();
        return response()->json($tipos);
    }
}
