from fastapi import FastAPI
from routers import proyectos, viviendas

app = FastAPI(
    title="Optimizador VRP/Simplex - Constructora CA&KANAGF",
    description="Motor de optimización inteligente de flotas y asignaciones"
)

# Incluir routers
app.include_router(proyectos.router, tags=["Proyectos Privados"])
app.include_router(viviendas.router, tags=["Viviendas Sociales"])

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Motor de optimización corriendo correctamente"}
