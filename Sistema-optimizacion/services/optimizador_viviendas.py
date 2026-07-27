import math
from sklearn.cluster import KMeans
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
import numpy as np
from datetime import date, timedelta
from services.haversine import distancia_km, matriz_distancias

def optimizar(solicitud) -> dict:
    viviendas = solicitud.viviendas
    n = len(viviendas)
    k = min(solicitud.num_equipos, n)  # no más equipos que viviendas
    
    if n == 0:
        return {'error': 'No hay viviendas para optimizar'}
    
    if n <= k:
        # Menos viviendas que equipos: cada equipo toma una vivienda
        return _asignacion_directa_viviendas(viviendas, solicitud)
    
    # PASO 1: Clustering geográfico
    coords = np.array([[v.latitud, v.longitud] for v in viviendas])
    kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(coords)
    
    rutas = []
    for equipo_idx in range(k):
        indices_cluster = [i for i, c in enumerate(clusters) if c == equipo_idx]
        viviendas_cluster = [viviendas[i] for i in indices_cluster]
        
        if not viviendas_cluster:
            continue
        
        # PASO 2: OR-Tools para ruta óptima dentro del cluster
        ruta_ordenada = _ortools_ruta(
            viviendas_cluster,
            solicitud.almacen_lat,
            solicitud.almacen_lng,
            solicitud.configuracion
        )
        
        # PASO 3: Asignar fechas reales
        ruta_con_fechas = _asignar_fechas(
            ruta_ordenada,
            solicitud.horas_trabajo_diarias,
            solicitud.fecha_inicio_plan
        )
        
        distancia_total = sum(
            distancia_km(
                ruta_con_fechas[i]['latitud'], ruta_con_fechas[i]['longitud'],
                ruta_con_fechas[i+1]['latitud'], ruta_con_fechas[i+1]['longitud']
            )
            for i in range(len(ruta_con_fechas) - 1)
        ) if len(ruta_con_fechas) > 1 else 0
        
        dias_estimados = (
            date.fromisoformat(ruta_con_fechas[-1]['fecha_estimada']) - date.today()
        ).days + 1 if ruta_con_fechas else 0
        
        rutas.append({
            'equipo_numero': equipo_idx + 1,
            'viviendas_ordenadas': ruta_con_fechas,
            'distancia_total_km': round(distancia_total, 2),
            'dias_estimados': dias_estimados
        })
    
    score = _calcular_score(rutas, viviendas)
    
    return {
        'algoritmo_usado': 'kmeans_ortools',
        'num_clusters': k,
        'score_total': score,
        'rutas': rutas,
        'advertencias': _generar_advertencias(viviendas, rutas)
    }

def _ortools_ruta(viviendas, almacen_lat, almacen_lng, config: dict) -> list:
    """
    Resuelve TSP con OR-Tools.
    config afecta:
    - peso_distancia: cuánto penaliza la distancia vs la urgencia
    - tiempo_traslado_por_km_min: minutos por km para el modelo de tiempo
    - peso_atraso: cuánto prioriza viviendas con más avance (más urgentes)
    """
    # Leer parámetros de config con defaults seguros
    tiempo_por_km = float(config.get('tiempo_traslado_por_km_min', 15))
    peso_distancia = float(config.get('peso_distancia', 0.10))
    peso_atraso = float(config.get('peso_atraso', 0.40))

    # Construir lista de nodos: almacén (índice 0) + viviendas
    nodos = [(almacen_lat, almacen_lng)] + [(v.latitud, v.longitud) for v in viviendas]
    n_nodos = len(nodos)

    # Matriz de tiempos en minutos enteros (OR-Tools requiere enteros)
    # Incorpora peso_distancia: más peso → penaliza más la distancia
    factor_distancia = 1.0 + peso_distancia  # entre 1.10 y 1.40 según config
    matriz = [[int(distancia_km(nodos[i][0], nodos[i][1],
                                nodos[j][0], nodos[j][1])
                   * tiempo_por_km * factor_distancia)
               for j in range(n_nodos)]
              for i in range(n_nodos)]

    # Ventanas de tiempo ponderadas por peso_atraso y avance de vivienda
    # Vivienda con avance alto = más urgente = ventana más estrecha y temprana
    # El peso_atraso contrae la ventana: más peso → más urgencia
    ventanas = [(0, 0)]  # depot siempre disponible
    for v in viviendas:
        amplitud_base = 200 - int(v.avance_real * 1.5)  # 200 a 50
        amplitud = max(20, int(amplitud_base * (1 - peso_atraso * 0.5)))
        ventanas.append((0, amplitud))

    # Configurar OR-Tools
    manager = pywrapcp.RoutingIndexManager(n_nodos, 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distancia_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return matriz[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distancia_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
    
    # Agregar restricción de ventana de tiempo
    routing.AddDimension(
        transit_callback_index,
        50,     # slack máximo
        10000,  # capacidad máxima de tiempo
        False,
        'Tiempo'
    )
    tiempo_dimension = routing.GetDimensionOrDie('Tiempo')
    for i, (inicio, fin) in enumerate(ventanas):
        index = manager.NodeToIndex(i)
        tiempo_dimension.CumulVar(index).SetRange(inicio, fin)
    
    # Parámetros de búsqueda
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.FromSeconds(10)  # máximo 10 segundos de cómputo
    
    solution = routing.SolveWithParameters(search_params)
    
    if solution:
        return _extraer_ruta(manager, routing, solution, viviendas)
    else:
        # Fallback: orden por urgencia ponderada
        return sorted(viviendas, key=lambda v: v.avance_real * peso_atraso, reverse=True)

def _extraer_ruta(manager, routing, solution, viviendas) -> list:
    ruta = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if node > 0:  # omitir depot (índice 0)
            v = viviendas[node - 1]
            ruta.append(v)
        index = solution.Value(routing.NextVar(index))
    return ruta

def _asignar_fechas(viviendas_ordenadas, horas_dia, fecha_inicio: date = None) -> list:
    resultado = []
    if fecha_inicio and fecha_inicio > date.today():
        fecha_actual = fecha_inicio
    else:
        fecha_actual = date.today() + timedelta(days=1)
    horas_acumuladas_hoy = 0

    for v in viviendas_ordenadas:
        if horas_acumuladas_hoy + v.tiempo_trabajo_horas > horas_dia:
            fecha_actual += timedelta(days=1)
            horas_acumuladas_hoy = 0

        dias_uso = max(1, math.ceil(v.tiempo_trabajo_horas / horas_dia))
        fecha_devolucion = fecha_actual + timedelta(days=dias_uso)

        resultado.append({
            'vivienda_id': v.id,
            'numero': v.numero,
            'latitud': v.latitud,
            'longitud': v.longitud,
            'avance_real': v.avance_real,
            'fecha_estimada': fecha_actual.isoformat(),
            'fecha_devolucion': fecha_devolucion.isoformat(),
            'horas_estimadas': v.tiempo_trabajo_horas,
            'orden': len(resultado) + 1
        })
        horas_acumuladas_hoy += v.tiempo_trabajo_horas

    return resultado

def _calcular_score(rutas, viviendas) -> float:
    if not rutas:
        return 0
    dist_total = sum(r['distancia_total_km'] for r in rutas)
    dias_max = max((r['dias_estimados'] for r in rutas), default=1)
    # Score: inversamente proporcional a distancia y días
    # Mayor score = mejor solución
    return round(1000 / max(1, dist_total * 0.5 + dias_max * 10), 2)

def _generar_advertencias(viviendas, rutas) -> list:
    advertencias = []
    viviendas_criticas = [v for v in viviendas if v.avance_real > 85]
    for v in viviendas_criticas:
        for ruta in rutas:
            for parada in ruta['viviendas_ordenadas']:
                if parada['vivienda_id'] == v.id and parada['orden'] > 5:
                    advertencias.append(
                        f"Vivienda #{v.numero} tiene avance crítico ({v.avance_real}%) "
                        f"pero está en la posición {parada['orden']} de la ruta"
                    )
    return advertencias

def _asignacion_directa_viviendas(viviendas, solicitud) -> dict:
    fecha_inicio = solicitud.fecha_inicio_plan
    if fecha_inicio and fecha_inicio > date.today():
        fecha_base = fecha_inicio
    else:
        fecha_base = date.today() + timedelta(days=1)

    rutas = []
    for i, v in enumerate(viviendas):
        equipo = (i % solicitud.num_equipos) + 1
        fecha = fecha_base + timedelta(days=i // solicitud.num_equipos)
        dias_uso = max(1, math.ceil(v.tiempo_trabajo_horas / solicitud.horas_trabajo_diarias))
        fecha_devolucion = fecha + timedelta(days=dias_uso)
        if len(rutas) < equipo:
            rutas.append({'equipo_numero': equipo, 'viviendas_ordenadas': [],
                         'distancia_total_km': 0, 'dias_estimados': 0})
        rutas[equipo-1]['viviendas_ordenadas'].append({
            'vivienda_id': v.id, 'numero': v.numero,
            'latitud': v.latitud, 'longitud': v.longitud,
            'avance_real': v.avance_real,
            'fecha_estimada': fecha.isoformat(),
            'fecha_devolucion': fecha_devolucion.isoformat(),
            'horas_estimadas': v.tiempo_trabajo_horas,
            'orden': len(rutas[equipo-1]['viviendas_ordenadas']) + 1
        })
    return {'algoritmo_usado': 'directo', 'num_clusters': len(rutas),
            'score_total': 100.0, 'rutas': rutas, 'advertencias': []}
