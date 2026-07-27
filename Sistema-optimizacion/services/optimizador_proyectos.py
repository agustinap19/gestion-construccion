"""
Optimizador de distribución de activos entre proyectos.

MODO SECUENCIAL (dias_disponibles_activo = None):
  El activo estará disponible indefinidamente, los proyectos se atienden
  en secuencia según ranking de prioridad. Cada proyecto recibe todos
  los días que pidió. Sin escasez real → sin LP.
  Algoritmo: Ranking greedy por índice de prioridad.

MODO ESCASEZ (dias_disponibles_activo = X):
  El activo solo tiene X días disponibles en total.
  La suma de lo que piden los proyectos puede superar X.
  El LP decide cuántos días sacrificar de cada proyecto minimizando
  el riesgo ponderado total.
  Algoritmo: scipy linprog con restricción de escasez real.
"""

from datetime import date, timedelta
from typing import Optional
import numpy as np
from services.indice_prioridad import ranking_proyectos, calcular_indice

def optimizar(solicitud) -> dict:
    proyectos = solicitud.proyectos
    config = solicitud.configuracion
    dias_disponibles = getattr(solicitud, 'dias_disponibles_activo', None)

    if not proyectos:
        return _respuesta_vacia()

    # Calcular ranking de prioridad para ambos modos
    ranking = ranking_proyectos(proyectos, config)

    fecha_inicio_plan = getattr(solicitud, 'fecha_inicio_plan', None)

    if dias_disponibles is None:
        return _modo_secuencial(ranking, fecha_inicio_plan)
    else:
        return _modo_escasez(ranking, dias_disponibles, config, fecha_inicio_plan)


def _fecha_cursor_inicial(fecha_inicio_plan: Optional[date]) -> date:
    if fecha_inicio_plan and fecha_inicio_plan > date.today():
        return fecha_inicio_plan
    return date.today() + timedelta(days=1)


def _modo_secuencial(ranking: list, fecha_inicio_plan: Optional[date] = None) -> dict:
    """
    Sin restricción de días: cada proyecto recibe lo que pidió,
    en orden de prioridad. El activo se asigna en secuencia.
    """
    asignaciones = []
    fecha_cursor = _fecha_cursor_inicial(fecha_inicio_plan)
    distancia_total = 0

    for i, proyecto in enumerate(ranking):
        dias = proyecto['dias_necesarios']
        asignaciones.append({
            'proyecto_id': proyecto['id'],
            'fecha_inicio': fecha_cursor.isoformat(),
            'fecha_fin': (fecha_cursor + timedelta(days=dias - 1)).isoformat(),
            'dias_asignados': dias,
            'dias_solicitados': dias,
            'sacrificio_dias': 0,  # sin escasez, nadie sacrifica nada
            'score_prioridad': proyecto['score_prioridad'],
            'orden': i + 1,
        })
        distancia_total += proyecto.get('distancia_km', 0)
        fecha_cursor += timedelta(days=dias + 1)  # +1 día de traslado entre proyectos

    dias_cubiertos = sum(p['dias_necesarios'] for p in ranking)

    return {
        'algoritmo_usado': 'ranking_greedy',
        'modo': 'secuencial',
        'score_total': sum(p['score_prioridad'] for p in ranking),
        'distancia_total_km': round(distancia_total, 2),
        'dias_disponibles': None,
        'dias_cubiertos': dias_cubiertos,
        'dias_no_cubiertos': 0,
        'asignaciones': asignaciones,
        'advertencias': []
    }


def _modo_escasez(ranking: list, dias_disponibles: int, config: dict, fecha_inicio_plan: Optional[date] = None) -> dict:
    """
    Con restricción de días: usa LP para distribuir los días disponibles
    minimizando el riesgo total. Proyectos de mayor prioridad sacrifican menos.

    Formulación LP:
      Variables: x[i] = días asignados al proyecto i
      Minimizar: sum(-score[i] * x[i])  ← maximizar cobertura ponderada
      Sujeto a:
        sum(x[i]) <= dias_disponibles    ← restricción de escasez REAL
        x[i] >= 1                        ← mínimo 1 día por proyecto
        x[i] <= dias_necesarios[i]       ← no más de lo que pidió
    """
    try:
        from scipy.optimize import linprog

        n = len(ranking)
        scores = [p['score_prioridad'] for p in ranking]
        score_max = max(scores) if max(scores) > 0 else 1

        # Coeficientes: maximizar cobertura ponderada por prioridad
        # linprog minimiza, por eso negamos
        c = [-s / score_max for s in scores]

        # Restricción: suma <= dias_disponibles
        A_ub = [np.ones(n).tolist()]
        b_ub = [dias_disponibles]

        # Bounds: [1, dias_necesarios] por proyecto
        bounds = [(1, p['dias_necesarios']) for p in ranking]

        resultado = linprog(
            c,
            A_ub=A_ub,
            b_ub=b_ub,
            bounds=bounds,
            method='highs'
        )

        if resultado.success:
            dias_por_proyecto = [max(1, round(d)) for d in resultado.x]
            # Ajustar para no exceder dias_disponibles por redondeo
            while sum(dias_por_proyecto) > dias_disponibles:
                # Quitar 1 día al proyecto de menor prioridad que tenga >1 día
                for i in range(len(dias_por_proyecto) - 1, -1, -1):
                    if dias_por_proyecto[i] > 1:
                        dias_por_proyecto[i] -= 1
                        break
                else:
                    break
            algoritmo = 'linprog_escasez'
        else:
            # Fallback: distribución proporcional al score
            dias_por_proyecto = _distribucion_proporcional(ranking, dias_disponibles)
            algoritmo = 'proporcional_escasez'

    except ImportError:
        dias_por_proyecto = _distribucion_proporcional(ranking, dias_disponibles)
        algoritmo = 'proporcional_escasez'

    # Construir asignaciones con sacrificios explícitos
    asignaciones = []
    fecha_cursor = _fecha_cursor_inicial(fecha_inicio_plan)
    distancia_total = 0
    advertencias = []

    for i, (proyecto, dias_asig) in enumerate(zip(ranking, dias_por_proyecto)):
        sacrificio = proyecto['dias_necesarios'] - dias_asig
        if sacrificio > 0:
            advertencias.append(
                f"{proyecto['nombre']} recibirá {dias_asig} días "
                f"(pidió {proyecto['dias_necesarios']}, sacrifica {sacrificio})"
            )

        asignaciones.append({
            'proyecto_id': proyecto['id'],
            'fecha_inicio': fecha_cursor.isoformat(),
            'fecha_fin': (fecha_cursor + timedelta(days=dias_asig - 1)).isoformat(),
            'dias_asignados': dias_asig,
            'dias_solicitados': proyecto['dias_necesarios'],
            'sacrificio_dias': sacrificio,
            'score_prioridad': proyecto['score_prioridad'],
            'orden': i + 1,
        })
        distancia_total += proyecto.get('distancia_km', 0)
        fecha_cursor += timedelta(days=dias_asig + 1)

    return {
        'algoritmo_usado': algoritmo,
        'modo': 'escasez',
        'score_total': sum(p['score_prioridad'] for p in ranking),
        'distancia_total_km': round(distancia_total, 2),
        'dias_disponibles': dias_disponibles,
        'dias_cubiertos': sum(dias_por_proyecto),
        'dias_no_cubiertos': max(0,
            sum(p['dias_necesarios'] for p in ranking) - dias_disponibles),
        'asignaciones': asignaciones,
        'advertencias': advertencias
    }


def _distribucion_proporcional(ranking: list, dias_disponibles: int) -> list:
    """Fallback: días proporcionales al score de prioridad."""
    total_score = sum(p['score_prioridad'] for p in ranking) or 1

    dias = []
    for p in ranking:
        proporcion = p['score_prioridad'] / total_score
        dias_proporcionales = round(proporcion * dias_disponibles)
        dias.append(max(1, min(dias_proporcionales, p['dias_necesarios'])))

    # Ajustar para no exceder el total disponible
    while sum(dias) > dias_disponibles:
        idx_menor_prioridad = len(dias) - 1
        while idx_menor_prioridad >= 0 and dias[idx_menor_prioridad] <= 1:
            idx_menor_prioridad -= 1
        if idx_menor_prioridad >= 0:
            dias[idx_menor_prioridad] -= 1
        else:
            break

    return dias


def _respuesta_vacia() -> dict:
    return {
        'algoritmo_usado': 'ninguno',
        'modo': 'vacio',
        'score_total': 0,
        'distancia_total_km': 0,
        'dias_disponibles': None,
        'dias_cubiertos': 0,
        'dias_no_cubiertos': 0,
        'asignaciones': [],
        'advertencias': ['No hay proyectos para optimizar']
    }
