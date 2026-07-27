from haversine import haversine, Unit
import numpy as np
from sklearn.cluster import KMeans
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

def calculate_distance_matrix(locations):
    """
    Calcula matriz de distancias reales usando la fórmula de Haversine (km)
    """
    n = len(locations)
    matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j:
                loc1 = (locations[i].latitud, locations[i].longitud)
                loc2 = (locations[j].latitud, locations[j].longitud)
                # Multiplicamos por 1000 para usar enteros en ortools (metros aprox)
                matrix[i][j] = int(haversine(loc1, loc2, unit=Unit.KILOMETERS) * 1000)
    return matrix

def solve_with_scipy(distance_matrix, nodos):
    """
    Caso Simple: Resolver TSP básico (Nearest Neighbor).
    """
    n = len(distance_matrix)
    visited = [0] # El nodo 0 siempre es el almacén origen
    route = [nodos[0].id]
    current = 0
    total_distance = 0
    
    while len(visited) < n:
        nearest = None
        min_dist = float('inf')
        for i in range(n):
            if i not in visited:
                dist = distance_matrix[current][i]
                if dist < min_dist:
                    min_dist = dist
                    nearest = i
        
        visited.append(nearest)
        route.append(nodos[nearest].id)
        total_distance += min_dist
        current = nearest
        
    # Ruta Abierta: no sumamos el regreso al almacén ni lo añadimos a la ruta
    return {
        "algoritmo_usado": "nearest_neighbor",
        "ruta_ids": route,
        "distancia_total_metros": total_distance
    }

def solve_with_ortools(distance_matrix, nodos, num_vehiculos=1, depot_index=0):
    """
    Caso Complejo: Resolver VRP / TSP usando Google OR-Tools.
    Configurado para "Ruta Abierta" (no regresa al almacén).
    """
    # Para permitir rutas abiertas en OR-Tools, añadimos un nodo "dummy" al final.
    # La distancia de cualquier nodo real al nodo dummy es 0.
    # La distancia del nodo dummy a cualquier otro nodo es muy alta.
    n_real = len(distance_matrix)
    n_total = n_real + 1
    
    extended_matrix = np.zeros((n_total, n_total))
    extended_matrix[:n_real, :n_real] = distance_matrix
    
    for i in range(n_real):
        extended_matrix[i][n_total - 1] = 0 # Costo cero para terminar
        extended_matrix[n_total - 1][i] = 9999999 # No puede salir del dummy

    manager = pywrapcp.RoutingIndexManager(n_total, num_vehiculos, [depot_index], [n_total - 1])
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return extended_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH)
    search_parameters.time_limit.seconds = 2
    
    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        # Fallback a Nearest Neighbor si falla ORTools
        return solve_with_scipy(distance_matrix, nodos)

    index = routing.Start(0)
    route = []
    route_distance = 0
    while not routing.IsEnd(index):
        node_index = manager.IndexToNode(index)
        if node_index < n_real:
            route.append(nodos[node_index].id)
        previous_index = index
        index = solution.Value(routing.NextVar(index))
        route_distance += routing.GetArcCostForVehicle(previous_index, index, 0)
        
    return {
        "algoritmo_usado": "ortools",
        "ruta_ids": route,
        "distancia_total_metros": route_distance
    }

def optimize_distribution(request):
    """
    Orquestador principal VRP.
    """
    all_locations = [request.almacen_origen] + request.nodos
    
    for loc in all_locations:
        if loc.latitud is None or loc.longitud is None:
            raise ValueError(f"El nodo {loc.id} no tiene coordenadas GPS válidas.")

    dist_matrix = calculate_distance_matrix(all_locations)
    n_nodos = len(all_locations)
    
    # Clustering o Lógica Jerárquica:
    # OR-Tools maneja de forma nativa la optimización TSP, lo cual automáticamente 
    # agrupará proyectos y viviendas por proximidad geográfica. 
    # Usamos OR-Tools siempre que haya más de 4 destinos reales.
    if n_nodos <= 5 and request.equipos_disponibles == 1:
        resultado = solve_with_scipy(dist_matrix, all_locations)
    else:
        resultado = solve_with_ortools(dist_matrix, all_locations, num_vehiculos=request.equipos_disponibles)
        
    resultado["activo_id"] = request.activo_id
    resultado["nodos_evaluados"] = n_nodos - 1 
    
    return resultado
