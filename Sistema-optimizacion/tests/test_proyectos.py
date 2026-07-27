from datetime import date, timedelta

from models.proyecto_input import ProyectoInput, SolicitudOptimizacionProyectos
from services.optimizador_proyectos import optimizar

CONFIG_TEST = {
    'peso_atraso': 0.40,
    'peso_plazo': 0.30,
    'peso_penalidad': 0.20,
    'peso_distancia': 0.10,
    'peso_gerente_override': 2.0,
}


def proyecto_test(id, avance_real=50, avance_esperado=70, dias_restantes=10,
                   penalidad=0, distancia_km=1, flag_gerente=False,
                   dias_necesarios=1, nombre=None):
    return ProyectoInput(
        id=id,
        nombre=nombre or f"Proyecto {id}",
        avance_real=avance_real,
        avance_esperado=avance_esperado,
        fecha_fin_contractual=date.today() + timedelta(days=dias_restantes),
        penalidad_diaria=penalidad,
        distancia_km=distancia_km,
        flag_gerente=flag_gerente,
        dias_necesarios=dias_necesarios,
    )


def test_modo_secuencial_todos_reciben_dias_completos():
    """Sin días disponibles, cada proyecto recibe exactamente lo que pidió."""
    solicitud = SolicitudOptimizacionProyectos(
        activo_id=1, costo_dia_activo=100,
        dias_disponibles_activo=None,
        proyectos=[
            proyecto_test(1, avance_real=30, dias_restantes=20, dias_necesarios=10),
            proyecto_test(2, avance_real=80, dias_restantes=20, dias_necesarios=8),
        ],
        configuracion=CONFIG_TEST
    )
    resultado = optimizar(solicitud)
    assert resultado['modo'] == 'secuencial'
    assert resultado['algoritmo_usado'] == 'ranking_greedy'
    dias_total = sum(a['dias_asignados'] for a in resultado['asignaciones'])
    assert dias_total == 18  # 10 + 8, cada uno recibió lo que pidió


def test_modo_escasez_no_excede_dias_disponibles():
    """Con días disponibles acotados, la suma nunca supera el límite."""
    solicitud = SolicitudOptimizacionProyectos(
        activo_id=1, costo_dia_activo=100,
        dias_disponibles_activo=12,  # menos que 10+10=20
        proyectos=[
            proyecto_test(1, avance_real=30, dias_restantes=15, dias_necesarios=10),
            proyecto_test(2, avance_real=60, dias_restantes=25, dias_necesarios=10),
        ],
        configuracion=CONFIG_TEST
    )
    resultado = optimizar(solicitud)
    assert resultado['modo'] == 'escasez'
    dias_total = sum(a['dias_asignados'] for a in resultado['asignaciones'])
    assert dias_total <= 12
    assert len(resultado['advertencias']) > 0  # debe avisar sobre sacrificios


def test_modo_escasez_prioridad_recibe_mas_dias():
    """El proyecto más urgente debe recibir más días que el menos urgente."""
    solicitud = SolicitudOptimizacionProyectos(
        activo_id=1, costo_dia_activo=100,
        dias_disponibles_activo=10,
        proyectos=[
            proyecto_test(1, avance_real=10, dias_restantes=5,
                          penalidad=1000, dias_necesarios=8),  # muy urgente
            proyecto_test(2, avance_real=90, dias_restantes=60,
                          penalidad=50, dias_necesarios=8),   # poco urgente
        ],
        configuracion=CONFIG_TEST
    )
    resultado = optimizar(solicitud)
    dias_p1 = next(a['dias_asignados'] for a in resultado['asignaciones']
                   if a['proyecto_id'] == 1)
    dias_p2 = next(a['dias_asignados'] for a in resultado['asignaciones']
                   if a['proyecto_id'] == 2)
    assert dias_p1 >= dias_p2, "El proyecto más urgente debe recibir al menos los mismos días"
