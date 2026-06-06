<?php

namespace App\Exceptions\Roles;

use Exception;

class RolConUsuariosException extends Exception
{
    public function __construct(int $cantidadUsuarios)
    {
        $plural = $cantidadUsuarios === 1 ? 'usuario asignado' : 'usuarios asignados';
        parent::__construct(
            "El rol tiene {$cantidadUsuarios} {$plural}. Reasígnalos a otro rol antes de eliminarlo.",
            422
        );
    }
}
