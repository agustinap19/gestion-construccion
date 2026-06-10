import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import FormularioReporteAvance from './FormularioReporteAvance';

// ── Colores y chips ──────────────────────────────────────────────────────────

const COLOR = {
    terminado:  '#34d399',
    en_proceso: '#60a5fa',
    pendiente:  '#475569',
};

const CHIP_ESTADO = {
    terminado:  { label: 'Terminado',  bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  text: '#34d399' },
    en_proceso: { label: 'En proceso', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  text: '#60a5fa' },
    pendiente:  { label: 'Pendiente',  bg: 'rgba(71,85,105,0.2)',    border: 'rgba(71,85,105,0.4)',   text: '#94a3b8' },
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

const BarraAvance = ({ pct, color, height = '6px' }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    return (
        <div className="flex-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)', height }}>
            <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${p}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ background: color }}
            />
        </div>
    );
};

const ChipEstado = ({ estado }) => {
    const cfg = CHIP_ESTADO[estado] ?? CHIP_ESTADO.pendiente;
    return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}>
            {cfg.label}
        </span>
    );
};

// ── Drawer de historial de reportes por ítem ─────────────────────────────────

const HistorialDrawer = ({ item, viviendaId, onCerrar }) => {
    const [reportes,  setReportes]  = useState(null);
    const [fotoAmp,   setFotoAmp]   = useState(null);

    useEffect(() => {
        api.get(`/viviendas/${viviendaId}/reportes-avance`, { params: { item_id: item.id } })
            .then(res => setReportes(res.data.data ?? []))
            .catch(() => { toast.error('Error al cargar historial'); setReportes([]); });
    }, [viviendaId, item.id]);

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCerrar}
                className="fixed inset-0 z-40"
                style={{ background: 'rgba(0,0,0,0.5)' }}
            />
            <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-96 flex flex-col"
                style={{ background: 'rgba(8,18,36,0.99)', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <p className="text-[10px] text-slate-500 font-mono">{item.codigo}</p>
                        <h4 className="text-sm font-bold text-white leading-tight">{item.nombre}</h4>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                    {reportes === null && (
                        <div className="flex justify-center py-8">
                            <span className="w-6 h-6 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                    )}
                    {reportes?.length === 0 && (
                        <p className="text-xs text-slate-600 text-center py-8">Sin reportes para este ítem</p>
                    )}
                    {reportes?.map(r => (
                        <div key={r.id} className="rounded-xl p-3 space-y-2"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

                            {/* Fecha + técnico */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-300">
                                        {r.tecnico ?? 'Técnico'}
                                    </p>
                                    <p className="text-[10px] text-slate-500">
                                        {r.fecha_reporte ? new Date(r.fecha_reporte).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                                    </p>
                                </div>
                                {/* Cambio de avance */}
                                <div className="text-right shrink-0">
                                    <span className="text-[10px] text-slate-500">{r.porcentaje_anterior}%</span>
                                    <span className="text-[10px] text-slate-600"> → </span>
                                    <span className="text-[11px] font-bold" style={{
                                        color: r.porcentaje_avance >= r.porcentaje_anterior ? '#34d399' : '#f87171'
                                    }}>{r.porcentaje_avance}%</span>
                                </div>
                            </div>

                            {/* Foto thumbnail */}
                            {r.foto_thumbnail_url || r.foto_url ? (
                                <button
                                    onClick={() => setFotoAmp(r.foto_url ?? r.foto_thumbnail_url)}
                                    className="w-full rounded-lg overflow-hidden"
                                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <img
                                        src={r.foto_thumbnail_url ?? r.foto_url}
                                        alt="evidencia"
                                        className="w-full h-28 object-cover"
                                    />
                                </button>
                            ) : null}

                            {/* Observación */}
                            {r.observacion && (
                                <p className="text-[11px] text-slate-400 leading-relaxed">{r.observacion}</p>
                            )}
                        </div>
                    ))}
                </div>
            </motion.div>

            {/* Lightbox foto */}
            <AnimatePresence>
                {fotoAmp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setFotoAmp(null)}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
                        style={{ background: 'rgba(0,0,0,0.92)' }}>
                        <img src={fotoAmp} alt="evidencia ampliada" className="max-h-full max-w-full rounded-xl object-contain" />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

// ── Ítem (solo lectura) ───────────────────────────────────────────────────────

const ItemChecklist = ({ item, viviendaId, conteoReportes }) => {
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const pct   = parseFloat(item.porcentaje_avance) || 0;
    const color = COLOR[item.estado_ejecucion] ?? COLOR.pendiente;
    const nRep  = conteoReportes ?? 0;

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 space-y-2"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}>

                {/* Fila 1: código + nombre + estado */}
                <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 mt-0.5">{item.codigo}</span>
                    <span className="text-sm font-semibold text-slate-200 flex-1 min-w-0">{item.nombre}</span>
                    <ChipEstado estado={item.estado_ejecucion} />
                </div>

                {/* Fila 2: categoría + cantidad + ponderación */}
                <div className="flex items-center gap-3 flex-wrap text-[10px] text-slate-500">
                    {item.categoria && (
                        <span className="px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                            {item.categoria}
                        </span>
                    )}
                    {item.cantidad_planificada > 0 && (
                        <span>{item.cantidad_planificada} {item.unidad_base}</span>
                    )}
                    <span>Pond: <span className="font-semibold text-slate-400">{item.ponderacion_avance}%</span></span>
                </div>

                {/* Fila 3: barra + porcentaje + ver reportes */}
                <div className="flex items-center gap-3">
                    <BarraAvance pct={pct} color={color} height="6px" />
                    <span className="text-sm font-bold w-10 text-right shrink-0" style={{ color }}>
                        {pct.toFixed(0)}%
                    </span>
                    {nRep > 0 && (
                        <button
                            onClick={() => setDrawerAbierto(true)}
                            className="shrink-0 text-[10px] text-slate-500 hover:text-blue-400 transition-colors underline underline-offset-2">
                            Ver {nRep} {nRep === 1 ? 'reporte' : 'reportes'}
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {drawerAbierto && (
                    <HistorialDrawer
                        key="drawer"
                        item={item}
                        viviendaId={viviendaId}
                        onCerrar={() => setDrawerAbierto(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function ChecklistVivienda({ viviendaId, viviendaCodigo }) {
    const [data,         setData]         = useState(null);
    const [cargando,     setCargando]     = useState(true);
    const [error,        setError]        = useState(null);
    const [conteos,      setConteos]      = useState({});
    const [modalAbierto, setModalAbierto] = useState(false);

    const cargar = useCallback(async () => {
        if (!viviendaId) return;
        setCargando(true);
        setError(null);
        try {
            const [checkRes, repRes] = await Promise.all([
                api.get(`/viviendas/${viviendaId}/checklist`),
                api.get(`/viviendas/${viviendaId}/reportes-avance`).catch(() => ({ data: { data: [] } })),
            ]);
            setData(checkRes.data);

            // Conteo de reportes por item
            const ct = {};
            (repRes.data.data ?? []).forEach(r => {
                ct[r.presupuesto_item_proyecto_id] = (ct[r.presupuesto_item_proyecto_id] ?? 0) + 1;
            });
            setConteos(ct);
        } catch (e) {
            setError(e.response?.data?.message || 'Error al cargar el checklist');
        } finally {
            setCargando(false);
        }
    }, [viviendaId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleGuardado = useCallback((resultado) => {
        setData(prev => {
            if (!prev) return prev;
            const actualizados = resultado.items_actualizados ?? [];
            const actualizadoMap = Object.fromEntries(actualizados.map(a => [a.id, a]));
            const items = prev.items.map(i =>
                actualizadoMap[i.id] ? { ...i, ...actualizadoMap[i.id] } : i
            );
            return {
                ...prev,
                items,
                vivienda: { ...prev.vivienda, avance_total: resultado.avance_vivienda },
            };
        });
        const reportes = resultado.reportes ?? [];
        if (reportes.length > 0) {
            setConteos(prev => {
                const nuevos = { ...prev };
                reportes.forEach(r => {
                    nuevos[r.presupuesto_item_proyecto_id] = (nuevos[r.presupuesto_item_proyecto_id] ?? 0) + 1;
                });
                return nuevos;
            });
        }
    }, []);

    // ── Skeleton ───────────────────────────────────────────────────────────

    if (cargando) {
        return (
            <div className="space-y-2 py-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-16 rounded-xl animate-pulse"
                        style={{ background: 'rgba(255,255,255,0.03)' }} />
                ))}
            </div>
        );
    }

    if (error) return <div className="text-xs text-red-400 py-3 text-center">{error}</div>;

    if (!data || data.items.length === 0) {
        return (
            <div className="text-xs text-slate-600 py-3 text-center">
                Esta vivienda no tiene ítems de presupuesto asignados.
            </div>
        );
    }

    const { vivienda, items } = data;
    const avance        = vivienda.avance_total ?? 0;
    const avanceColor   = avance >= 80 ? '#34d399' : avance >= 40 ? '#60a5fa' : '#fbbf24';
    const puedeRegistrar = items.some(i => i.puede_marcar_avance);

    return (
        <>
            <div className="space-y-3 pt-1">
                {/* Encabezado con avance total + botón registrar */}
                <div className="px-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <div>
                            <span className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold">
                                Avance total — {items.length} ítems
                            </span>
                            <p className="text-[10px] text-slate-600 mt-0.5">
                                El avance se registra mediante reportes fotográficos.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <motion.span
                                key={avance}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-sm font-bold"
                                style={{ color: avanceColor }}>
                                {avance.toFixed(1)}%
                            </motion.span>
                            {puedeRegistrar && (
                                <button
                                    onClick={() => setModalAbierto(true)}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                                    style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>
                                    <span>+</span> Registrar avance
                                </button>
                            )}
                        </div>
                    </div>
                    <BarraAvance pct={avance} color={avanceColor} height="8px" />
                </div>

                {/* Lista de ítems (solo lectura) */}
                <div className="space-y-2">
                    {items.map(item => (
                        <ItemChecklist
                            key={item.id}
                            item={item}
                            viviendaId={viviendaId}
                            conteoReportes={conteos[item.id]}
                        />
                    ))}
                </div>
            </div>

            {/* Modal de reporte */}
            <AnimatePresence>
                {modalAbierto && (
                    <FormularioReporteAvance
                        key="modal-reporte"
                        viviendaId={viviendaId}
                        viviendaCodigo={viviendaCodigo ?? data.vivienda.codigo}
                        onCerrar={() => setModalAbierto(false)}
                        onGuardado={handleGuardado}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
