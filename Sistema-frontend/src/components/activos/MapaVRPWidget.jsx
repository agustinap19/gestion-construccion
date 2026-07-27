import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import PanelOptimizacion from './PanelOptimizacion';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { obtenerRutaORS, perfilORS } from '../../services/orsService';

// Custom Icons
const createCustomIcon = (color) => {
    return new L.DivIcon({
        className: 'custom-leaflet-icon',
        html: `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid #0d0f1a; box-shadow: 0 0 10px ${color}80; display: flex; align-items: center; justify-content: center;">
                <div style="background-color: white; width: 6px; height: 6px; border-radius: 50%;"></div>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${color}; margin: -2px auto 0 auto;"></div>
        `,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32]
    });
};

const icons = {
    almacen: createCustomIcon('#8b5cf6'), // Violet
    proyecto: createCustomIcon('#10b981'), // Emerald
    vivienda: createCustomIcon('#ec4899') // Pink
};

function MapBounds({ nodos }) {
    const map = useMap();
    useEffect(() => {
        if (nodos && nodos.length > 0) {
            const validNodos = nodos.filter(n => n.latitud && n.longitud);
            if (validNodos.length > 0) {
                const bounds = L.latLngBounds(validNodos.map(n => [n.latitud, n.longitud]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    }, [nodos, map]);
    return null;
}

// Defaults de respaldo, deben coincidir con los defaults del motor Python
// (services/indice_prioridad.py) por si la config aún no cargó o falló el fetch.
const PESOS_DEFAULT = {
    peso_atraso: 0.40,
    peso_plazo: 0.30,
    peso_penalidad: 0.20,
    peso_distancia: 0.10,
    peso_gerente_override: 2.0,
};

export default function MapaVRPWidget({ activo, asignaciones, modoInicial = 'proyectos', proyectoFijoInicial = null }) {
    const [nodos, setNodos] = useState([]);
    const [rutaCalculada, setRutaCalculada] = useState([]); // Arreglo de IDs en orden
    const [polylinePositions, setPolylinePositions] = useState([]);
    const [cargandoRutaORS, setCargandoRutaORS] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [aprobando, setAprobando] = useState(false);
    const [planCalculadoId, setPlanCalculadoId] = useState(null);
    const [planResultado, setPlanResultado] = useState(null);
    const [configOptimizacion, setConfigOptimizacion] = useState(PESOS_DEFAULT);
    const [modoPanel, setModoPanel] = useState(modoInicial);
    const [proyectoFijo, setProyectoFijo] = useState(proyectoFijoInicial);

    useEffect(() => {
        setModoPanel(modoInicial);
        setProyectoFijo(proyectoFijoInicial);
    }, [modoInicial, proyectoFijoInicial]);

    // Centro inicial (La Paz aprox)
    const center = [-16.5000, -68.1193];

    useEffect(() => {
        api.get('/configuracion-optimizacion')
            .then(res => {
                const data = res.data?.data;
                if (!data) return;
                setConfigOptimizacion({
                    peso_atraso: Number(data.peso_atraso),
                    peso_plazo: Number(data.peso_plazo),
                    peso_penalidad: Number(data.peso_penalidad),
                    peso_distancia: Number(data.peso_distancia),
                    peso_gerente_override: Number(data.peso_gerente_override),
                });
            })
            .catch(() => {
                // Sin permiso o el endpoint falló: seguimos con los defaults.
            });
    }, []);

    const handleAprobarPlan = async (planId, planEditado = null, planEditadoVRP = null) => {
        if (!planId) return;
        setAprobando(true);
        try {
            await api.post(`/optimizacion/planes/${planId}/aprobar`, {
                plan_editado: planEditado ?? null,
                plan_editado_vrp: planEditadoVRP ?? null,
            });

            const esVRP = planResultado?.rutas !== undefined;
            const totalAsignaciones = planEditadoVRP?.rutas?.[0]?.viviendas_ordenadas?.length
                ?? planEditado?.length
                ?? (esVRP
                    ? planResultado.rutas.reduce((s, r) => s + r.viviendas_ordenadas.length, 0)
                    : (planResultado?.asignaciones?.length ?? 0));

            toast.success(
                `Plan aprobado: ${totalAsignaciones} asignaciones creadas` +
                (esVRP ? ' con actas generadas' : '')
            );

            setPlanCalculadoId(null);
            setRutaCalculada([]);
            setPlanResultado(null);
            setPolylinePositions([]);

            // Recargar la página para ver las nuevas asignaciones
            setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al aprobar el plan. Revisa la consola.');
        } finally {
            setAprobando(false);
        }
    };

    const handleDescartarPlan = () => {
        setPlanCalculadoId(null);
        setRutaCalculada([]);
        setPlanResultado(null);
        setPolylinePositions([]);
        toast('Plan descartado', { icon: '🗑️' });
    };

    // Cuando cambia la ruta, actualizar los puntos de la línea
    useEffect(() => {
        if (rutaCalculada.length === 0) {
            setPolylinePositions([]);
            return;
        }

        // El backend devuelve coordenadas explícitas o los IDs ordenados.
        // Si son IDs, buscamos las coordenadas en nuestro array de nodos.
        let coordenadas = [];
        if (typeof rutaCalculada[0] === 'string' || typeof rutaCalculada[0] === 'number') {
            coordenadas = rutaCalculada.map(id => {
                const nodo = nodos.find(n => n.id === id);
                return nodo ? { lat: nodo.latitud, lng: nodo.longitud } : null;
            }).filter(Boolean);
        } else if (Array.isArray(rutaCalculada[0])) {
            // Si la API devuelve [[lat, lng], [lat, lng]]
            coordenadas = rutaCalculada.map(([lat, lng]) => ({ lat, lng }));
        }

        if (coordenadas.length < 2) {
            setPolylinePositions(coordenadas.map(c => [c.lat, c.lng]));
            return;
        }

        // Intentar ORS para ruta real por calles.
        // Si falla, el fallback dentro de obtenerRutaORS devuelve línea recta.
        const trazar = async () => {
            setCargandoRutaORS(true);
            try {
                const perfil = perfilORS(activo?.tipo);
                const rutaReal = await obtenerRutaORS(coordenadas, perfil);
                setPolylinePositions(rutaReal);
            } finally {
                setCargandoRutaORS(false);
            }
        };

        trazar();
    }, [rutaCalculada, nodos, activo]);

    const handleOptimizar = async (nodosSeleccionados, diasDisponiblesActivo = null, numEquipos = 1, fechaInicioPlan = null) => {
        if (nodosSeleccionados.length < 2) return;

        setCargando(true);
        try {
            const almacenOrigen = nodosSeleccionados[0]; // asumimos que el primero es el almacén
            const destinos = nodosSeleccionados.slice(1);

            const proyectosDestino = destinos.filter(n => n.tipo === 'proyecto');
            const viviendasDestino = destinos.filter(n => n.tipo === 'vivienda');

            // Validación: No permitir mezclar proyectos y viviendas en la misma optimización
            if (proyectosDestino.length > 0 && viviendasDestino.length > 0) {
                toast.error("No puedes mezclar proyectos y viviendas en el mismo plan. " +
                    "Selecciona solo proyectos o solo viviendas de un proyecto social.");
                setCargando(false);
                return;
            }

            // Validación: Para viviendas, solo permitir de un mismo proyecto a la vez
            if (viviendasDestino.length > 0) {
                const proyectoIdUnico = viviendasDestino[0].proyecto_id;
                const todasMismoProyecto = viviendasDestino.every(v => v.proyecto_id === proyectoIdUnico);
                if (!todasMismoProyecto) {
                    toast.error("Selecciona viviendas de un solo proyecto social a la vez.");
                    setCargando(false);
                    return;
                }
            }

            let endpoint = '';
            let payload = {};

            if (viviendasDestino.length > 0) {
                // Optimización VRP para Viviendas Sociales
                endpoint = '/optimizacion/viviendas';
                payload = {
                    activo_id: activo?.id || activo?.data?.id || window.location.pathname.split('/')[3] || 1,
                    proyecto_id: viviendasDestino[0].proyecto_id || 0,
                    num_equipos: numEquipos,
                    almacen_lat: almacenOrigen.latitud,
                    almacen_lng: almacenOrigen.longitud,
                    horas_trabajo_diarias: 8.0,
                    fecha_inicio_plan: fechaInicioPlan,
                    viviendas: viviendasDestino.map(v => ({
                        id: String(v.original_id),
                        original_id: v.original_id,
                        tipo: 'vivienda',
                        numero: v.nombre,
                        latitud: v.latitud,
                        longitud: v.longitud,
                        avance_real: v.avance_real,
                        estado_acta: v.estado_acta,
                        tiempo_trabajo_horas: v.tiempo_trabajo_horas
                    })),
                    configuracion: configOptimizacion
                };
            } else if (proyectosDestino.length > 0) {
                // Optimización Simplex para Proyectos Privados
                endpoint = '/optimizacion/proyectos';
                payload = {
                    activo_id: activo?.id || activo?.data?.id || window.location.pathname.split('/')[3] || 1,
                    costo_dia_activo: activo?.costo_dia || activo?.costo_dia_uso || 100,
                    proyectos: proyectosDestino.map(p => {
                        // Calcular distancia simple Haversine desde el almacén hasta el proyecto
                        const R = 6371; // Radio de la tierra en km
                        const dLat = (p.latitud - almacenOrigen.latitud) * Math.PI / 180;
                        const dLon = (p.longitud - almacenOrigen.longitud) * Math.PI / 180;
                        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                                  Math.cos(almacenOrigen.latitud * Math.PI / 180) * Math.cos(p.latitud * Math.PI / 180) *
                                  Math.sin(dLon/2) * Math.sin(dLon/2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                        const distancia_km = R * c;

                        return {
                            id: p.original_id,
                            nombre: p.nombre,
                            avance_real: p.avance_real,
                            avance_esperado: p.avance_esperado,
                            fecha_fin_contractual: p.fecha_fin_contractual,
                            penalidad_diaria: p.penalidad_diaria,
                            distancia_km: distancia_km || 1, // fallback si es 0
                            dias_necesarios: p.dias_necesarios
                        };
                    }),
                    configuracion: configOptimizacion,
                    dias_disponibles_activo: diasDisponiblesActivo || null,
                    fecha_inicio_plan: fechaInicioPlan
                };
            }

            const response = await api.post(endpoint, payload);
            
            const planModel = response.data?.data;
            const plan = planModel?.resultados;
            
            if (plan) {
                setPlanCalculadoId(planModel.id);
                setPlanResultado(plan);
                if (endpoint === '/optimizacion/viviendas' && plan.rutas && plan.rutas.length > 0) {
                    // Extraer los ids en orden desde las rutas
                    const orderedIds = [];
                    orderedIds.push('almacen-0'); // Empieza en almacen
                    plan.rutas[0].viviendas_ordenadas.forEach(v => {
                        orderedIds.push(`vivienda-${v.vivienda_id}`);
                    });
                    setRutaCalculada(orderedIds);
                    toast.success("Ruta VRP calculada exitosamente");
                } else if (endpoint === '/optimizacion/proyectos' && plan.asignaciones) {
                    const orderedIds = [];
                    orderedIds.push('almacen-0');
                    plan.asignaciones.sort((a,b) => a.orden - b.orden).forEach(p => {
                        orderedIds.push(`proyecto-${p.proyecto_id}`);
                    });
                    setRutaCalculada(orderedIds);
                    toast.success(`Días asignados (Score total: ${plan.score_total.toFixed(2)})`);
                } else {
                    toast.error("El motor no devolvió una ruta válida");
                }
            } else {
                toast.error("El motor no devolvió una ruta válida");
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Error al conectar con el motor VRP");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="flex h-[550px] w-full relative bg-[#0d0f1a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            {/* Panel Lateral Integrado */}
            <div className="w-80 md:w-96 shrink-0 bg-white/[0.02] border-r border-white/10 flex flex-col z-[1000] relative">
                <PanelOptimizacion
                    onOptimizar={handleOptimizar}
                    cargando={cargando}
                    ruta={rutaCalculada}
                    nodos={nodos}
                    setNodos={setNodos}
                    activo={activo}
                    configOptimizacion={configOptimizacion}
                    planResultado={planResultado}
                    planCalculadoId={planCalculadoId}
                    onAprobarPlan={handleAprobarPlan}
                    onDescartarPlan={handleDescartarPlan}
                    aprobando={aprobando}
                    modo={modoPanel}
                    proyectoFijo={proyectoFijo}
                />
            </div>

            {/* Mapa */}
            <div className="flex-1 relative z-0">
                <MapContainer 
                    center={center} 
                    zoom={13} 
                    zoomControl={false}
                    style={{ height: '100%', width: '100%', backgroundColor: '#0a0a0a' }}
                >
                    <MapBounds nodos={nodos} />
                    <ZoomControl position="bottomright" />
                    <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    />

                    <MarkerClusterGroup
                        chunkedLoading
                        maxClusterRadius={40}
                        spiderfyOnMaxZoom={true}
                    >
                        {nodos.map(nodo => (
                            <Marker 
                                key={nodo.id} 
                                position={[nodo.latitud, nodo.longitud]} 
                                icon={icons[nodo.tipo] || icons.proyecto}
                            >
                                <Popup className="dark-popup">
                                    <div className="p-1">
                                        <h3 className="font-bold text-sm mb-1">{nodo.nombre}</h3>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{nodo.tipo}</p>
                                        {nodo.es_social && <p className="text-[10px] text-blue-400 mt-1">Proyecto Social</p>}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MarkerClusterGroup>

                    {polylinePositions.length > 0 && (
                        <Polyline
                            positions={polylinePositions}
                            color="#8b5cf6"
                            weight={4}
                            opacity={cargandoRutaORS ? 0.4 : 0.85}
                            dashArray={cargandoRutaORS ? "8, 8" : undefined}
                            className={cargandoRutaORS ? "route-path-animation" : ""}
                        />
                    )}
                </MapContainer>
                {cargandoRutaORS && (
                    <div className="absolute bottom-12 left-4 z-[1000] flex items-center
                                   gap-2 px-3 py-1.5 rounded-lg bg-black/60
                                   backdrop-blur-sm border border-white/10">
                        <div className="w-3 h-3 border border-violet-400/40
                                       border-t-violet-400 rounded-full animate-spin"/>
                        <span className="text-[10px] text-white/50">
                            Trazando ruta...
                        </span>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{__html: `
                .leaflet-container { font-family: inherit; }
                .leaflet-popup-content-wrapper { background: #0d0f1a; color: white; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
                .leaflet-popup-tip { background: #0d0f1a; }
                .leaflet-bar a { background-color: #0d0f1a; color: white; border-bottom-color: rgba(255,255,255,0.1); }
                .leaflet-bar a:hover { background-color: #1a1c2e; color: white; }
                .custom-leaflet-icon { background: transparent; border: none; }
                
                @keyframes dash {
                  to {
                    stroke-dashoffset: -100;
                  }
                }
                .route-path-animation {
                  animation: dash 3s linear infinite;
                }
            `}} />
        </div>
    );
}
