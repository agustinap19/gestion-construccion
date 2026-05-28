<?php

namespace App\Exceptions\Roles;

use Exception;

class RolDelSistemaNoEliminableException extends Exception
{
    public function __construct(string $nombreRol = '')
    {
        $mensaje = $nombreRol
            ? "El rol \"{$nombreRol}\" es un rol del sistema y no puede ser eliminado."
            : 'Los roles del sistema no pueden ser eliminados.';

        parent::__construct($mensaje, 403);
    }
}
