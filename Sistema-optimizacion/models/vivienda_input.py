from pydantic import BaseModel, Field
from datetime import date
from typing import List, Optional

class ViviendasInput(BaseModel):
    id: str  # puede ser 'proyecto-X' o 'vivienda-Y'
    original_id: int
    tipo: str # 'proyecto' o 'vivienda'
    numero: str
    latitud: float
    longitud: float
    avance_real: float = Field(ge=0, le=100)
    estado_acta: str                                # generada|impresa|aprobada|etc
    tiempo_trabajo_horas: float = Field(default=4.0) # horas estimadas en esa vivienda

class SolicitudOptimizacionViviendas(BaseModel):
    activo_id: int
    proyecto_id: int
    num_equipos: int = Field(ge=1, le=10)
    viviendas: List[ViviendasInput]
    almacen_lat: float                              # coordenada del almacén de partida
    almacen_lng: float
    horas_trabajo_diarias: float = Field(default=8.0)
    configuracion: dict
    fecha_inicio_plan: Optional[date] = None        # fecha desde la que el gerente quiere iniciar el plan

class RutaEquipo(BaseModel):
    equipo_numero: int
    viviendas_ordenadas: List[dict]                # [{id, original_id, tipo, fecha_estimada, orden}]
    distancia_total_km: float
    dias_estimados: int

class RespuestaOptimizacionViviendas(BaseModel):
    algoritmo_usado: str
    num_clusters: int
    score_total: float
    rutas: List[RutaEquipo]
    advertencias: List[str] = []
