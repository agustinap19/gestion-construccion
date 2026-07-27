import math

def distancia_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calcula distancia real entre dos coordenadas GPS en kilómetros.
    Fórmula Haversine. Sin dependencias externas.
    """
    R = 6371.0
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def matriz_distancias(puntos: list[tuple]) -> list[list[float]]:
    """
    Genera matriz NxN de distancias entre todos los puntos.
    puntos: lista de (lat, lng)
    """
    n = len(puntos)
    return [
        [distancia_km(puntos[i][0], puntos[i][1], puntos[j][0], puntos[j][1])
         for j in range(n)]
        for i in range(n)
    ]
