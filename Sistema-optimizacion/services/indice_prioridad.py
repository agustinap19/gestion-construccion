from datetime import date
from models.proyecto_input import ProyectoInput

def calcular_indice(proyecto: ProyectoInput, config: dict) -> float:
    """
    Índice de prioridad ponderado para asignación de activos.
    """
    hoy = date.today()
    dias_restantes = max(1, (proyecto.fecha_fin_contractual - hoy).days)
    
    atraso_pp = max(0, proyecto.avance_esperado - proyecto.avance_real)
    ritmo_diario = proyecto.avance_esperado / max(1, (
        (hoy - date.today()).days + dias_restantes
    ))  # pp por día
    atraso_dias = atraso_pp / max(0.1, ritmo_diario)
    
    urgencia_plazo = 100 / dias_restantes  # normalizado a escala similar
    
    score = (
        atraso_dias                   * float(config.get('peso_atraso', 0.40))
        + urgencia_plazo              * float(config.get('peso_plazo', 0.30))
        + proyecto.penalidad_diaria   * float(config.get('peso_penalidad', 0.20))
        - proyecto.distancia_km       * float(config.get('peso_distancia', 0.10))
    )
    
    # Override del gerente: multiplica el score por el peso configurado
    if proyecto.flag_gerente:
        score *= float(config.get('peso_gerente_override', 2.0))
    
    return round(max(0, score), 4)

def ranking_proyectos(proyectos: list, config: dict) -> list:
    """
    Retorna proyectos ordenados por índice de prioridad descendente.
    Incluye el score calculado en cada elemento.
    """
    con_score = [
        {**p.dict(), 'score_prioridad': calcular_indice(p, config)}
        for p in proyectos
    ]
    return sorted(con_score, key=lambda x: x['score_prioridad'], reverse=True)
