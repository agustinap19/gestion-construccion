import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui';
import { Settings, Play, Check, Home, Building2 } from '../../components/icons/Icons';
import proyectoService from '../../services/proyectoService';
import viviendaService from '../../services/viviendaService';
import { toast } from 'react-hot-toast';

export default function PanelOptimizacion({
    onOptimizar,
    cargando,
    nodos,
    setNodos,
    activo,
    configOptimizacion,
    planResultado,
    planCalculadoId,
    onAprobarPlan,
    onDescartarPlan,
    aprobando,
    ruta,
    // Modo del panel: 'proyectos' (Simplex) o 'viviendas' (VRP de un proyecto social fijo)
    modo = 'proyectos',
    proyectoFijo = null,
}) {
    // ── Modo 'proyectos' ────────────────────────────────────────────────────
    const [proyectos, setProyectos] = useState([]);
    const [cargandoProyectos, setCargandoProyectos] = useState(false);
    const [selectedProyectos, setSelectedProyectos] = useState(new Set());
    const [diasDisponibles, setDiasDisponibles] = useState('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const [fechaInicioPlan, setFechaInicioPlan] = useState(tomorrowStr);

    useEffect(() => {
        if (modo !== 'proyectos') return;
        setCargandoProyectos(true);
        proyectoService.listar({ per_page: 50 })
            .then(res => {
                const validos = (res.data || []).filter(p => p.latitud && p.longitud);
                setProyectos(validos);
                setSelectedProyectos(new Set());
            })
            .catch(() => toast.error('Error al cargar proyectos'))
            .finally(() => setCargandoProyectos(false));
    }, [modo]);

    const toggleProyecto = (proyectoId) => {
        setSelectedProyectos(prev => {
            const next = new Set(prev);
            if (next.has(proyectoId)) next.delete(proyectoId);
            else next.add(proyectoId);
            return next;
        });
    };

    useEffect(() => {
        if (modo !== 'proyectos') return;
        const nodosNuevos = [
            {
                id: 'almacen-0',
                original_id: 0,
                latitud: activo?.almacen?.latitud ?? -16.5000,
                longitud: activo?.almacen?.longitud ?? -68.1193,
                nombre: activo?.almacen?.nombre ?? 'Almacén Central',
                tipo: 'almacen',
            },
            ...proyectos
                .filter(p => selectedProyectos.has(p.id))
                .map(p => ({
                    id: `proyecto-${p.id}`,
                    original_id: p.id,
                    latitud: p.latitud,
                    longitud: p.longitud,
                    nombre: p.nombre,
                    tipo: 'proyecto',
                    es_social: p.es_social,
                    avance_real: p.avance_fisico ?? 0,
                    avance_esperado: p.avance_esperado ?? 0,
                    fecha_fin_contractual: p.fecha_fin_planificada ?? new Date(
                        Date.now() + 90 * 24 * 60 * 60 * 1000
                    ).toISOString().split('T')[0],
                    penalidad_diaria: p.penalidad_diaria ?? (p.monto_contractual ? p.monto_contractual * 0.001 : 0),
                    dias_necesarios: p.dias_estimados_activo ?? 5,
                })),
        ];
        setNodos(nodosNuevos);
    }, [modo, selectedProyectos, proyectos, activo]);

    const socialesSeleccionados = proyectos.filter(p => selectedProyectos.has(p.id) && p.es_social);

    // ── Modo 'viviendas' ────────────────────────────────────────────────────
    const [viviendas, setViviendas] = useState([]);
    const [cargandoViviendas, setCargandoViviendas] = useState(false);
    const [selectedViviendas, setSelectedViviendas] = useState(new Set());
    const [numEquipos, setNumEquipos] = useState(1);
    const [viviendasSinGps, setViviendasSinGps] = useState(0);
    const [viviendasConGps, setViviendasConGps] = useState(0);

    // Cadena de fuentes de coordenadas, de más a menos específica:
    // 1) la vivienda misma  2) el terreno del beneficiario (mismo predio, casi siempre
    // coincide con la vivienda)  3) el proyecto entero, como último recurso —
    // pero esto colapsa todas las viviendas en el mismo punto, así que solo cuenta
    // como GPS "aproximado", no real.
    const coordenadasVivienda = (v) => {
        if (v.latitud && v.longitud) return { latitud: v.latitud, longitud: v.longitud, esAproximada: false };
        if (v.beneficiario?.latitud_terreno && v.beneficiario?.longitud_terreno) {
            return { latitud: v.beneficiario.latitud_terreno, longitud: v.beneficiario.longitud_terreno, esAproximada: false };
        }
        return { latitud: proyectoFijo?.latitud, longitud: proyectoFijo?.longitud, esAproximada: true };
    };

    useEffect(() => {
        if (modo !== 'viviendas' || !proyectoFijo) return;
        setCargandoViviendas(true);
        viviendaService.listarPorProyecto(proyectoFijo.id, {}, 1, 100)
            .then(res => {
                const crudas = res.data || [];
                const conCoords = crudas.map(v => ({ ...v, ...coordenadasVivienda(v) }));
                const sinGps = conCoords.filter(v => v.esAproximada);
                const conGps = conCoords.filter(v => !v.esAproximada);
                setViviendasConGps(conGps.length);
                setViviendasSinGps(sinGps.length);

                const data = conCoords.filter(v => v.latitud && v.longitud);
                setViviendas(data);
                setSelectedViviendas(new Set(data.map(v => v.id)));
            })
            .catch(() => toast.error('Error al cargar viviendas'))
            .finally(() => setCargandoViviendas(false));
    }, [modo, proyectoFijo]);

    const toggleVivienda = (id) => {
        setSelectedViviendas(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleTodasViviendas = () => {
        if (selectedViviendas.size === viviendas.length) {
            setSelectedViviendas(new Set());
        } else {
            setSelectedViviendas(new Set(viviendas.map(v => v.id)));
        }
    };

    // selectedViviendas solo contiene ids que vienen de `viviendas`, así que su tamaño
    // ya es el conteo de seleccionadas — no hace falta volver a filtrar.
    const viviendasSeleccionadasCount = selectedViviendas.size;

    // No puede haber más equipos que viviendas seleccionadas (un equipo sin
    // vivienda asignada no tiene sentido).
    useEffect(() => {
        if (numEquipos > viviendasSeleccionadasCount && viviendasSeleccionadasCount > 0) {
            setNumEquipos(viviendasSeleccionadasCount);
        }
        if (viviendasSeleccionadasCount === 1) {
            setNumEquipos(1);
        }
    }, [viviendasSeleccionadasCount, numEquipos]);

    useEffect(() => {
        if (modo !== 'viviendas') return;
        const nodosNuevos = [
            {
                id: 'almacen-0',
                original_id: 0,
                latitud: activo?.almacen?.latitud ?? proyectoFijo?.latitud ?? -16.5000,
                longitud: activo?.almacen?.longitud ?? proyectoFijo?.longitud ?? -68.1193,
                nombre: 'Punto de partida',
                tipo: 'almacen',
            },
            ...viviendas
                .filter(v => selectedViviendas.has(v.id))
                .map(v => ({
                    id: `vivienda-${v.id}`,
                    original_id: v.id,
                    latitud: v.latitud,
                    longitud: v.longitud,
                    nombre: v.beneficiario
                        ? `${v.beneficiario.nombre} ${v.beneficiario.apellido_paterno ?? ''}`.trim()
                        : v.codigo,
                    tipo: 'vivienda',
                    proyecto_id: proyectoFijo?.id,
                    avance_real: v.porcentaje_avance ?? 0,
                    estado_acta: v.estado_acta ?? 'generada',
                    tiempo_trabajo_horas: 4.0,
                })),
        ];
        setNodos(nodosNuevos);
    }, [modo, selectedViviendas, viviendas, proyectoFijo, activo]);

    // ── Acción de calcular (común a ambos modos) ───────────────────────────
    const handleOptimizarClick = () => {
        if (nodos.length < 2) {
            toast.error('Selecciona al menos 1 destino además del almacén');
            return;
        }
        const dias = modo === 'proyectos' && diasDisponibles ? parseInt(diasDisponibles, 10) : null;
        onOptimizar(nodos, dias, numEquipos, fechaInicioPlan);
    };

    // ── Resultado editable (solo modo 'proyectos') ─────────────────────────
    const [planEditable, setPlanEditable] = useState([]);
    const [editandoDias, setEditandoDias] = useState(null);

    useEffect(() => {
        if (!planResultado?.asignaciones) {
            setPlanEditable([]);
            return;
        }
        setPlanEditable([...planResultado.asignaciones].sort((a, b) => a.orden - b.orden));
    }, [planResultado]);

    const moverArriba = (idx) => {
        if (idx === 0) return;
        setPlanEditable(prev => {
            const next = [...prev];
            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
            return next.map((item, i) => ({ ...item, orden: i + 1 }));
        });
    };

    const moverAbajo = (idx) => {
        setPlanEditable(prev => {
            if (idx >= prev.length - 1) return prev;
            const next = [...prev];
            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
            return next.map((item, i) => ({ ...item, orden: i + 1 }));
        });
    };

    const actualizarDias = (proyectoId, nuevoDias) => {
        setPlanEditable(prev =>
            prev.map(a => a.proyecto_id === proyectoId
                ? { ...a, dias_asignados: Math.max(1, parseInt(nuevoDias, 10) || 1) }
                : a
            )
        );
    };

    // ── Resultado editable (VRP de viviendas) ──────────────────────────────
    // Una entrada por equipo/ruta — antes solo se tomaba rutas[0], así que con
    // 2+ equipos se perdían las viviendas de los demás.
    const [rutasEditables, setRutasEditables] = useState([]);
    const [editandoHoras, setEditandoHoras] = useState(null);

    useEffect(() => {
        if (!planResultado?.rutas) {
            setRutasEditables([]);
            return;
        }
        setRutasEditables(
            planResultado.rutas.map(ruta => ({
                ...ruta,
                viviendas_ordenadas: [...ruta.viviendas_ordenadas],
            }))
        );
    }, [planResultado]);

    const moverViviendaArriba = (equipoIdx, viviendaIdx) => {
        if (viviendaIdx === 0) return;
        setRutasEditables(prev => {
            const next = prev.map(r => ({ ...r, viviendas_ordenadas: [...r.viviendas_ordenadas] }));
            const viviendas = next[equipoIdx].viviendas_ordenadas;
            [viviendas[viviendaIdx - 1], viviendas[viviendaIdx]] = [viviendas[viviendaIdx], viviendas[viviendaIdx - 1]];
            next[equipoIdx].viviendas_ordenadas = viviendas.map((v, i) => ({ ...v, orden: i + 1 }));
            return next;
        });
    };

    const moverViviendaAbajo = (equipoIdx, viviendaIdx) => {
        setRutasEditables(prev => {
            const viviendas = prev[equipoIdx].viviendas_ordenadas;
            if (viviendaIdx >= viviendas.length - 1) return prev;
            const next = prev.map(r => ({ ...r, viviendas_ordenadas: [...r.viviendas_ordenadas] }));
            const viviendasNext = next[equipoIdx].viviendas_ordenadas;
            [viviendasNext[viviendaIdx], viviendasNext[viviendaIdx + 1]] = [viviendasNext[viviendaIdx + 1], viviendasNext[viviendaIdx]];
            next[equipoIdx].viviendas_ordenadas = viviendasNext.map((v, i) => ({ ...v, orden: i + 1 }));
            return next;
        });
    };

    const actualizarHoras = (equipoIdx, viviendaId, nuevasHoras) => {
        setRutasEditables(prev =>
            prev.map((ruta, idx) =>
                idx === equipoIdx
                    ? {
                        ...ruta,
                        viviendas_ordenadas: ruta.viviendas_ordenadas.map(v =>
                            v.vivienda_id === viviendaId
                                ? { ...v, horas_estimadas: Math.max(0.5, parseFloat(nuevasHoras) || 4) }
                                : v
                        ),
                    }
                    : ruta
            )
        );
    };

    const handleAprobarConEdicion = () => {
        if (planResultado?.rutas) {
            onAprobarPlan(planCalculadoId, null, { ...planResultado, rutas: rutasEditables });
        } else {
            onAprobarPlan(planCalculadoId, modo === 'proyectos' ? planEditable : null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden text-white">
            <div className="p-4 border-b border-white/10 bg-white/[0.02]">
                <h2 className="text-sm font-bold flex items-center gap-2">
                    <Settings className="w-4 h-4 text-violet-400" />
                    {modo === 'viviendas'
                        ? `Distribuir entre viviendas — ${proyectoFijo?.nombre ?? ''}`
                        : 'Seleccionar proyectos destino'}
                </h2>
                <p className="text-[10px] text-white/50 mt-1">
                    {modo === 'viviendas'
                        ? 'Selecciona las viviendas que necesitan el activo. El sistema calculará la ruta óptima.'
                        : 'El activo se asignará a cada proyecto en secuencia según prioridad.'}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {modo === 'viviendas' ? (
                    <>
                        {!cargandoViviendas && viviendasSinGps > 0 && (
                            <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
                                <span className="font-semibold block mb-1">
                                    ⚠ {viviendasSinGps} vivienda{viviendasSinGps > 1 ? 's' : ''} sin GPS propio
                                </span>
                                {viviendasConGps === 0
                                    ? 'Ninguna vivienda tiene coordenadas GPS registradas. La ruta calculada no tendrá precisión geográfica real. Registra las coordenadas en el módulo de viviendas.'
                                    : `${viviendasSinGps} vivienda${viviendasSinGps > 1 ? 's usan' : ' usa'} la ubicación del proyecto como aproximación.`}
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] text-white/50">
                                {selectedViviendas.size} de {viviendas.length} viviendas
                            </span>
                            <button onClick={toggleTodasViviendas} className="text-[11px] text-violet-400 hover:text-violet-300">
                                {selectedViviendas.size === viviendas.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
                            </button>
                        </div>

                        {cargandoViviendas ? (
                            <div className="text-xs text-white/50 text-center py-4">Cargando viviendas...</div>
                        ) : viviendas.length === 0 ? (
                            <div className="text-xs text-white/30 text-center py-4">Sin viviendas geolocalizadas en este proyecto</div>
                        ) : (
                            <div className="space-y-1.5">
                                {viviendas.map(v => {
                                    const nombre = v.beneficiario
                                        ? `${v.beneficiario.nombre} ${v.beneficiario.apellido_paterno ?? ''}`.trim()
                                        : v.codigo;
                                    const seleccionada = selectedViviendas.has(v.id);
                                    return (
                                        <div key={v.id}
                                            onClick={() => toggleVivienda(v.id)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-all select-none
                                                ${seleccionada ? 'bg-pink-500/10 border-pink-500/30' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'}`}>
                                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                                ${seleccionada ? 'bg-pink-500 border-pink-500' : 'border-white/20'}`}>
                                                {seleccionada && <Check className="w-2.5 h-2.5 text-white" />}
                                            </div>
                                            <Home className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-white truncate">{nombre}</p>
                                                <p className="text-[10px] text-white/40">{v.codigo}</p>
                                            </div>
                                            {v.porcentaje_avance > 0 && (
                                                <span className="text-[10px] text-white/40 shrink-0">{v.porcentaje_avance}%</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {viviendasSeleccionadasCount > 1 && (
                            <div className="pt-3 border-t border-white/10">
                                <label className="text-[11px] text-white/50 block mb-1.5">Número de equipos disponibles</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const deshabilitado = n > viviendasSeleccionadasCount;
                                        return (
                                            <button
                                                key={n}
                                                onClick={() => !deshabilitado && setNumEquipos(n)}
                                                disabled={deshabilitado}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors
                                                    ${deshabilitado
                                                        ? 'opacity-25 cursor-not-allowed bg-white/[0.01] border-white/5 text-white/20'
                                                        : numEquipos === n
                                                            ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                                            : 'bg-white/[0.02] border-white/10 text-white/40 hover:text-white/60 cursor-pointer'}`}
                                            >
                                                {n}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-white/30 mt-1">
                                    Máximo {viviendasSeleccionadasCount} (1 por vivienda disponible)
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="space-y-2">
                            {cargandoProyectos ? (
                                <div className="text-xs text-white/50 text-center py-4">Cargando proyectos...</div>
                            ) : (
                                proyectos.map(p => (
                                    <div key={p.id}
                                        onClick={() => toggleProyecto(p.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all select-none
                                            ${selectedProyectos.has(p.id) ? 'bg-violet-500/15 border-violet-500/40' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'}`}>
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                                            ${selectedProyectos.has(p.id) ? 'bg-violet-500 border-violet-500' : 'border-white/20'}`}>
                                            {selectedProyectos.has(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                                        </div>
                                        <Building2 className={`w-4 h-4 shrink-0 ${p.es_social ? 'text-blue-400' : 'text-emerald-400'}`} />
                                        <span className="text-sm text-white flex-1 truncate">{p.nombre}</span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0
                                            ${p.es_social ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                            {p.es_social ? 'Social' : 'Privado'}
                                        </span>
                                    </div>
                                ))
                            )}
                            {proyectos.length > 0 && selectedProyectos.size === 0 && (
                                <p className="text-[11px] text-white/30 text-center py-2">
                                    Selecciona al menos un destino para calcular la ruta
                                </p>
                            )}
                        </div>

                        {socialesSeleccionados.length > 0 && (
                            <div className="mt-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 leading-relaxed">
                                <span className="font-semibold">
                                    {socialesSeleccionados.length} proyecto{socialesSeleccionados.length > 1 ? 's' : ''} social{socialesSeleccionados.length > 1 ? 'es' : ''}:
                                </span>{' '}
                                el activo se asignará al proyecto completo. La distribución entre viviendas individuales se configura
                                una vez el activo llegue al proyecto.
                            </div>
                        )}

                        <div className="pt-2">
                            <label className="text-[11px] text-white/60 font-medium">Días disponibles del activo (opcional)</label>
                            <p className="text-[10px] text-white/40 mt-0.5 mb-1.5 leading-snug">
                                Si el activo tiene una fecha límite de disponibilidad, indica cuántos días tiene en total. El sistema
                                distribuirá ese tiempo priorizando según urgencia. Si lo dejas vacío, cada proyecto recibirá los días
                                que solicitó en secuencia.
                            </p>
                            <input
                                type="number"
                                min="1"
                                placeholder="Ej: 20 (vacío = sin límite)"
                                value={diasDisponibles}
                                onChange={e => setDiasDisponibles(e.target.value)}
                                className="w-full rounded-lg bg-white/[0.03] border border-white/10 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                    </>
                )}

                <div className="pt-3 border-t border-white/10">
                    <label className="text-[11px] text-white/50 font-medium block mb-1">
                        Fecha de inicio del plan
                    </label>
                    <p className="text-[10px] text-white/30 mb-1.5">
                        ¿Cuándo estará disponible el activo para este plan?
                    </p>
                    <input
                        type="date"
                        value={fechaInicioPlan}
                        min={tomorrowStr}
                        onChange={e => setFechaInicioPlan(e.target.value)}
                        className="w-full rounded-lg bg-white/[0.03] border border-white/10
                                   px-3 py-1.5 text-xs text-white
                                   focus:outline-none focus:border-violet-500/50
                                   [color-scheme:dark]"
                    />
                </div>

                <div className="pt-4 mt-4 border-t border-white/10">
                    {modo === 'viviendas' && viviendas.length > 0 && viviendasConGps === 0 ? (
                        <div className="w-full py-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                            <p className="text-xs text-white/40">
                                Registra las coordenadas GPS de las viviendas para calcular rutas
                            </p>
                            <a href={`/dashboard/proyectos/${proyectoFijo?.id}`}
                                className="text-xs text-violet-400 hover:text-violet-300 mt-1 inline-block">
                                Ir al proyecto →
                            </a>
                        </div>
                    ) : (
                        <Button
                            className="w-full shadow-violet-900/40"
                            disabled={cargando || nodos.length < 2}
                            onClick={handleOptimizarClick}
                            startIcon={cargando ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4" />}
                        >
                            {cargando ? 'Calculando rutas...' : 'Calcular Ruta Óptima'}
                        </Button>
                    )}
                    {modo === 'proyectos' && configOptimizacion && (
                        <div className="text-[10px] text-white/40 mt-2 leading-snug">
                            Pesos activos: Atraso {Math.round(configOptimizacion.peso_atraso * 100)}% ·{' '}
                            Plazo {Math.round(configOptimizacion.peso_plazo * 100)}% ·{' '}
                            Penalidad {Math.round(configOptimizacion.peso_penalidad * 100)}% ·{' '}
                            Distancia {Math.round(configOptimizacion.peso_distancia * 100)}%
                        </div>
                    )}
                </div>

                {/* Resultado — modo 'proyectos': lista editable de orden/días */}
                {modo === 'proyectos' && ruta.length > 0 && planResultado && (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Plan generado</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-white/40">
                                <span>{planResultado.distancia_total_km?.toFixed(1)} km</span>
                                <span>·</span>
                                <span>Score {planResultado.score_total?.toFixed(0)}</span>
                            </div>
                        </div>

                        {planResultado.modo === 'escasez' && (
                            <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20">
                                <p className="text-[11px] text-amber-300">
                                    Modo escasez · {planResultado.dias_disponibles} días disponibles
                                    {planResultado.dias_no_cubiertos > 0 && (
                                        <span className="text-amber-400 font-semibold"> · {planResultado.dias_no_cubiertos} días sin cubrir</span>
                                    )}
                                </p>
                            </div>
                        )}

                        <div className="p-3 space-y-2">
                            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                <div className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] text-violet-300 font-bold">0</span>
                                </div>
                                <span className="text-xs text-white/70 flex-1">Almacén (origen)</span>
                            </div>

                            {planEditable.map((asig, idx) => {
                                const nodoProyecto = nodos.find(n => n.original_id === asig.proyecto_id);
                                const nombreProyecto = nodoProyecto?.nombre ?? `Proyecto ${asig.proyecto_id}`;
                                const esSocialAsig = nodoProyecto?.es_social;

                                return (
                                    <div key={asig.proyecto_id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10">
                                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                                            <span className="text-[9px] text-emerald-400 font-bold">{idx + 1}</span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium text-white truncate">{nombreProyecto}</p>
                                            {editandoDias === asig.proyecto_id ? (
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={asig.dias_asignados}
                                                        onChange={e => actualizarDias(asig.proyecto_id, e.target.value)}
                                                        onBlur={() => setEditandoDias(null)}
                                                        autoFocus
                                                        className="w-14 text-[11px] bg-white/10 border border-violet-500/50 rounded px-1.5 py-0.5 text-white"
                                                    />
                                                    <span className="text-[10px] text-white/40">días</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setEditandoDias(asig.proyecto_id)}
                                                    className="text-[10px] text-white/40 mt-0.5 hover:text-violet-400 transition-colors flex items-center gap-1"
                                                >
                                                    {asig.dias_asignados} días
                                                    <span className="text-[9px]">✏</span>
                                                </button>
                                            )}
                                        </div>

                                        {esSocialAsig && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 shrink-0">Social</span>
                                        )}

                                        <div className="flex flex-col gap-0.5 shrink-0">
                                            <button onClick={() => moverArriba(idx)} disabled={idx === 0}
                                                className="text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none">▲</button>
                                            <button onClick={() => moverAbajo(idx)} disabled={idx === planEditable.length - 1}
                                                className="text-white/30 hover:text-white/70 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] leading-none">▼</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {planResultado.advertencias?.length > 0 && (
                            <div className="px-4 pb-3 space-y-1">
                                {planResultado.advertencias.map((adv, i) => (
                                    <p key={i} className="text-[10px] text-amber-300/70">⚠ {adv}</p>
                                ))}
                            </div>
                        )}

                        <div className="p-3 pt-0 space-y-2">
                            <button
                                onClick={handleAprobarConEdicion}
                                disabled={aprobando}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {aprobando
                                    ? <><div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" /> Aplicando...</>
                                    : <><Check className="w-4 h-4" /> Aprobar y crear asignaciones</>
                                }
                            </button>
                            <p className="text-[10px] text-white/30 text-center">Se crearán {planEditable.length} asignaciones</p>
                            <button
                                onClick={onDescartarPlan}
                                disabled={aprobando}
                                className="w-full py-2 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white/60 hover:border-white/20 transition-colors"
                            >
                                Descartar plan
                            </button>
                        </div>
                    </div>
                )}

                {/* Resultado — modo 'viviendas': una sección editable por equipo */}
                {modo === 'viviendas' && planResultado?.rutas && rutasEditables.length > 0 && (
                    <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-white/[0.02] overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Ruta generada</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-white/40">
                                <span>{rutasEditables.length} equipo{rutasEditables.length > 1 ? 's' : ''}</span>
                                <span>·</span>
                                <span>{rutasEditables.reduce((s, r) => s + r.viviendas_ordenadas.length, 0)} viviendas</span>
                            </div>
                        </div>

                        <div className="p-3 space-y-4">
                            {rutasEditables.map((rutaEquipo, equipoIdx) => (
                                <div key={rutaEquipo.equipo_numero} className="rounded-xl border border-white/10 overflow-hidden">
                                    <div className={`px-3 py-2 flex items-center justify-between
                                        ${equipoIdx === 0 ? 'bg-violet-500/10 border-b border-violet-500/20'
                                            : equipoIdx === 1 ? 'bg-blue-500/10 border-b border-blue-500/20'
                                            : 'bg-emerald-500/10 border-b border-emerald-500/20'}`}>
                                        <span className={`text-xs font-semibold
                                            ${equipoIdx === 0 ? 'text-violet-300' : equipoIdx === 1 ? 'text-blue-300' : 'text-emerald-300'}`}>
                                            Equipo {rutaEquipo.equipo_numero}
                                        </span>
                                        <span className="text-[10px] text-white/40">
                                            {rutaEquipo.distancia_total_km?.toFixed(2)} km · {rutaEquipo.dias_estimados} día{rutaEquipo.dias_estimados !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    <div className="p-2 space-y-1.5 bg-white/[0.01]">
                                        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                                            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                                <span className="text-[8px] text-white/40">0</span>
                                            </div>
                                            <span className="text-[11px] text-white/40">Almacén (origen)</span>
                                        </div>

                                        {rutaEquipo.viviendas_ordenadas.map((v, vIdx) => (
                                            <div key={v.vivienda_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03] border border-white/5">
                                                <div className="w-4 h-4 rounded-full bg-pink-500/20 flex items-center justify-center shrink-0">
                                                    <span className="text-[8px] text-pink-400 font-bold">{vIdx + 1}</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white truncate">{v.numero ?? `Vivienda ${v.vivienda_id}`}</p>
                                                    {editandoHoras === `${equipoIdx}-${v.vivienda_id}` ? (
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <input
                                                                type="number"
                                                                min="0.5"
                                                                max="24"
                                                                step="0.5"
                                                                value={v.horas_estimadas}
                                                                onChange={e => actualizarHoras(equipoIdx, v.vivienda_id, e.target.value)}
                                                                onBlur={() => setEditandoHoras(null)}
                                                                autoFocus
                                                                className="w-12 text-[10px] bg-white/10 border border-pink-500/50 rounded px-1 py-0.5 text-white"
                                                            />
                                                            <span className="text-[10px] text-white/40">h</span>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEditandoHoras(`${equipoIdx}-${v.vivienda_id}`)}
                                                            className="text-[10px] text-white/30 hover:text-pink-400 transition-colors"
                                                        >
                                                            {v.horas_estimadas}h ✏
                                                        </button>
                                                    )}
                                                </div>

                                                <span className="text-[10px] text-white/25 shrink-0">{v.fecha_estimada}</span>

                                                {rutaEquipo.viviendas_ordenadas.length > 1 && (
                                                    <div className="flex flex-col gap-0.5 shrink-0">
                                                        <button onClick={() => moverViviendaArriba(equipoIdx, vIdx)} disabled={vIdx === 0}
                                                            className="text-white/20 hover:text-white/60 disabled:opacity-0 text-[10px] leading-none">▲</button>
                                                        <button onClick={() => moverViviendaAbajo(equipoIdx, vIdx)} disabled={vIdx === rutaEquipo.viviendas_ordenadas.length - 1}
                                                            className="text-white/20 hover:text-white/60 disabled:opacity-0 text-[10px] leading-none">▼</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-3 pt-0 space-y-2">
                            <button
                                onClick={handleAprobarConEdicion}
                                disabled={aprobando}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {aprobando
                                    ? <><div className="w-4 h-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full animate-spin" /> Aplicando...</>
                                    : <><Check className="w-4 h-4" /> Aprobar y crear asignaciones</>
                                }
                            </button>
                            <p className="text-[10px] text-white/30 text-center">
                                Se crearán {rutasEditables.reduce((s, r) => s + r.viviendas_ordenadas.length, 0)} asignaciones con actas generadas
                            </p>
                            <button
                                onClick={onDescartarPlan}
                                disabled={aprobando}
                                className="w-full py-2 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white/60 transition-colors"
                            >
                                Descartar plan
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
