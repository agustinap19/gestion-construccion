from fastapi import APIRouter, HTTPException
from models.vivienda_input import SolicitudOptimizacionViviendas, RespuestaOptimizacionViviendas
from services import optimizador_viviendas

router = APIRouter()

@router.post("/optimize/viviendas", response_model=RespuestaOptimizacionViviendas)
def optimize_viviendas(solicitud: SolicitudOptimizacionViviendas):
    try:
        resultado = optimizador_viviendas.optimizar(solicitud)
        if 'error' in resultado:
            raise HTTPException(status_code=400, detail=resultado['error'])
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
