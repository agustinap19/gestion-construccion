<?php

namespace App\Services;

use App\Models\Personal;
use App\Models\PlanillaPago;
use App\Models\Competencia;
use App\Models\User;

class ReporteService
{
    public function obtenerPersonalConRol()
    {
        return Personal::with('usuario.rol')->get();
    }

    public function obtenerPlanillasConDetalles()
    {
        return PlanillaPago::with('detalles.personal')->get();
    }

    public function obtenerCompetenciasConPersonal()
    {
        return Competencia::withCount('personal')->with('personal')->get();
    }

    public function obtenerPersonalConCompetencias()
    {
        return Personal::with('competencias')->get();
    }

    public function obtenerUsuariosConPermisos()
    {
        return User::with('rol.permisos')->get();
    }
}
