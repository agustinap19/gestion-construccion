from fastapi import APIRouter, HTTPException
from models.proyecto_input import SolicitudOptimizacionProyectos, RespuestaOptimizacionProyectos
from services import optimizador_proyectos

router = APIRouter()

@router.post("/optimize/proyectos", response_model=RespuestaOptimizacionProyectos)
def optimize_proyectos(solicitud: SolicitudOptimizacionProyectos):
    try:
        resultado = optimizador_proyectos.optimizar(solicitud)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
