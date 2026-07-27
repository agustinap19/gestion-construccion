from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import List, Optional

class ProyectoInput(BaseModel):
    id: int
    nombre: str
    avance_real: float = Field(ge=0, le=100)        # % completado real
    avance_esperado: float = Field(ge=0, le=100)    # % que debería tener hoy
    fecha_fin_contractual: date                      # deadline del contrato
    penalidad_diaria: float = Field(ge=0)           # Bs por día de atraso
    distancia_km: float = Field(ge=0)               # desde almacén al proyecto
    flag_gerente: bool = False                       # prioridad manual del gerente
    dias_necesarios: int = Field(ge=1)              # cuántos días necesita el activo

class SolicitudOptimizacionProyectos(BaseModel):
    activo_id: int
    costo_dia_activo: float
    proyectos: List[ProyectoInput]
    configuracion: dict                             # pesos desde ConfiguracionOptimizacion
    dias_disponibles_activo: Optional[int] = None    # None = modo secuencial, int = modo escasez
    fecha_inicio_plan: Optional[date] = None         # fecha desde la que el gerente quiere iniciar el plan

    @field_validator('dias_disponibles_activo')
    @classmethod
    def validar_dias(cls, v):
        if v is not None and v <= 0:
            raise ValueError('dias_disponibles_activo debe ser mayor a 0')
        return v

class ResultadoAsignacion(BaseModel):
    proyecto_id: int
    fecha_inicio: date
    fecha_fin: date
    dias_asignados: int
    dias_solicitados: Optional[int] = None
    sacrificio_dias: int = 0
    score_prioridad: float
    orden: int

class RespuestaOptimizacionProyectos(BaseModel):
    algoritmo_usado: str
    modo: str = 'secuencial'
    score_total: float
    distancia_total_km: float
    dias_disponibles: Optional[int] = None
    dias_cubiertos: int = 0
    dias_no_cubiertos: int = 0
    asignaciones: List[ResultadoAsignacion]
    advertencias: List[str] = []
