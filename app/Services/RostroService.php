<?php

namespace App\Services;

use App\Models\User;

class RostroService
{
    /**
     * Compara dos descriptores faciales (vectores de 128 elementos) usando la distancia Euclidiana.
     * Retorna true si la distancia es menor o igual al umbral especificado.
     */
    public function compararRostros(array $descriptorGuardado, array $descriptorNuevo, float $umbral = 0.6): bool
    {
        $distancia = $this->calcularDistanciaEuclidiana($descriptorGuardado, $descriptorNuevo);
        return $distancia <= $umbral;
    }

    /**
     * Calcula la distancia euclidiana entre dos vectores.
     */
    public function calcularDistanciaEuclidiana(array $v1, array $v2): float
    {
        if (count($v1) !== count($v2)) {
            throw new \InvalidArgumentException('Los descriptores deben tener la misma longitud (128 elementos).');
        }

        $suma = 0.0;
        foreach ($v1 as $i => $val) {
            $diferencia = $v1[$i] - $v2[$i];
            $suma += $diferencia * $diferencia;
        }

        return sqrt($suma);
    }

    /**
     * Verifica el rostro de un usuario específico comparando con su descriptor guardado.
     */
    public function verificarRostroUsuario(int $usuarioId, array $descriptorNuevo): bool
    {
        $usuario = User::findOrFail($usuarioId);

        if (!$usuario->rostro_registrado || empty($usuario->descriptor_facial)) {
            throw new \Exception('El usuario no tiene un rostro registrado.');
        }

        return $this->compararRostros($usuario->descriptor_facial, $descriptorNuevo);
    }
}
