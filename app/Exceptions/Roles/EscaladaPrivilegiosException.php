<?php

namespace App\Exceptions\Roles;

use Exception;

class EscaladaPrivilegiosException extends Exception
{
    public function __construct()
    {
        parent::__construct(
            'No puedes asignar permisos que tú mismo no posees. Solo el gerente o super administrador pueden asignar permisos críticos.',
            403
        );
    }
}
