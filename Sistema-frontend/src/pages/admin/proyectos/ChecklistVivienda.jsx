import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    CheckCircle2, Clock, Circle, ChevronRight, ImageIcon,
    X, ZoomIn, Calendar, User, TrendingUp, TrendingDown,
    BarChart3, FileText, AlertCircle, Layers, Plus, Search
} from 'lucide-react';
import api from '../../../services/api';
import FormularioReporteAvance from './FormularioReporteAvance';

// Resolve storage image paths.
// APP_URL in the backend .env may differ from the actual serving port,
// so we replace the origin with the one from VITE_API_URL when available.
const _backendOrigin = (() => {
    const v = import.meta.env.VITE_API_URL;
    if (v && v.startsWith('http')) {
        try { return new URL(v).origin; } catch { /* ignore */ }
    }
    return '';
})();

const getImgUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) {
        // Replace whatever origin is stored in the DB with the real backend origin
        try {
            const pathname = new URL(path).pathname;
            return _backendOrigin ? _backendOrigin + pathname : path;
        } catch { return path; }
    }
    // Relative path — prefix with backend origin if set
    return _backendOrigin ? _backendOrigin + path : path;
};

/* ─── Paleta de estados ──────────────────────────────────────────────────── */
const ESTADO_CFG = {
    terminado:  {
        label: 'Terminado',
        color: 'var(--accent)',
        bg: 'oklch(62% 0.2 145 / 0.12)',
        border: 'oklch(62% 0.2 145 / 0.3)',
        Icon: CheckCircle2,
    },
    en_proceso: {
        label: 'En proceso',
        color: 'oklch(58% 0.18 240)',
        bg: 'oklch(58% 0.18 240 / 0.1)',
        border: 'oklch(58% 0.18 240 / 0.25)',
        Icon: Clock,
    },
    pendiente: {
        label: 'Pendiente',
        color: 'var(--fg-subtle)',
        bg: 'oklch(50% 0.01 260 / 0.08)',
        border: 'oklch(50% 0.01 260 / 0.2)',
        Icon: Circle,
    },
};

const getCfg = (estado) => ESTADO_CFG[estado] ?? ESTADO_CFG.pendiente;

// Derive state purely from porcentaje_avance — ignores stale DB estado_ejecucion values
// (e.g. items set to en_proceso by material delivery with 0% photo progress)
const estadoEfectivo = (item) => {
    const pct = parseFloat(item.porcentaje_avance) || 0;
    if (pct >= 100) return 'terminado';
    if (pct > 0)    return 'en_proceso';
    return 'pendiente';
};

/* ─── Barra de avance animada ────────────────────────────────────────────── */
const BarraAvance = ({ pct, colorVar, height = '6px' }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const color = colorVar || (p >= 80 ? 'var(--accent)' : p >= 40 ? 'oklch(58% 0.18 240)' : 'oklch(55% 0.2 290)');
    return (
        <div className="w-full rounded-full overflow-hidden" style={{ background: 'var(--border)', height }}>
            <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${p}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
            />
        </div>
    );
};

/* ─── Chip de estado ─────────────────────────────────────────────────────── */
const ChipEstado = ({ estado }) => {
    const cfg = getCfg(estado);
    const { Icon } = cfg;
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
            <Icon size={9} />
            {cfg.label}
        </span>
    );
};

/* ─── Modal historial de evidencias fotográficas ─────────────────────────── */
const HistorialDrawer = ({ item, viviendaId, onCerrar }) => {
    const [reportes, setReportes] = useState(null);
    const [fotoAmp,  setFotoAmp]  = useState(null);

    useEffect(() => {
        api.get(`/viviendas/${viviendaId}/reportes-avance`, { params: { item_id: item.id } })
            .then(res => setReportes(res.data.data ?? []))
            .catch(() => { toast.error('Error al cargar historial'); setReportes([]); });
    }, [viviendaId, item.id]);

    // Cerrar con Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onCerrar]);

    const modal = (
        <>
            {/* Overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onCerrar}
                className="fixed inset-0 z-40"
                style={{ background: 'oklch(0% 0 0 / 0.65)', backdropFilter: 'blur(6px)' }}
            />

            {/* Modal centrado */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.93, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 8 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                    className="relative flex flex-col w-full max-w-2xl"
                    style={{
                        maxHeight: 'min(90vh, 720px)',
                        background: 'var(--surface-1)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        boxShadow: '0 32px 80px oklch(0% 0 0 / 0.45)',
                    }}
                    onClick={(e) => e.stopPropagation()}>

                    {/* ── Header ───────────────────────────────────── */}
                    <div className="shrink-0 px-5 py-4 flex items-start justify-between gap-3"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="min-w-0">
                            <p className="text-[10px] font-mono uppercase tracking-widest mb-1"
                                style={{ color: 'var(--tech)' }}>
                                Evidencias fotográficas
                            </p>
                            <h4 className="text-base font-bold leading-tight" style={{ color: 'var(--fg)' }}>
                                {item.nombre}
                            </h4>
                            {item.codigo && (
                                <span className="text-[10px] mt-0.5 inline-block font-mono px-1.5 py-0.5 rounded"
                                    style={{ background: 'oklch(55% 0.2 290 / 0.1)', color: 'var(--fg-subtle)' }}>
                                    {item.codigo}
                                </span>
                            )}
                        </div>
                        <button onClick={onCerrar}
                            className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105 hover:rotate-90"
                            style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                            <X size={15} />
                        </button>
                    </div>

                    {/* ── Contenido scrollable ─────────────────────── */}
                    <div className="flex-1 overflow-y-auto p-5 scrollbar-thin" style={{ minHeight: 0 }}>

                        {/* Loading */}
                        {reportes === null && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
                                    style={{ borderColor: 'var(--tech)', borderTopColor: 'transparent' }} />
                                <p className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Cargando evidencias…</p>
                            </div>
                        )}

                        {/* Vacío */}
                        {reportes?.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'var(--surface-2)' }}>
                                    <ImageIcon size={22} style={{ color: 'var(--fg-subtle)' }} />
                                </div>
                                <p className="text-sm font-semibold" style={{ color: 'var(--fg-muted)' }}>Sin evidencias aún</p>
                                <p className="text-xs text-center max-w-xs" style={{ color: 'var(--fg-subtle)' }}>
                                    Las fotos registradas de este ítem aparecerán aquí
                                </p>
                            </div>
                        )}

                        {/* Grid 2 columnas en desktop, 1 en móvil */}
                        {reportes?.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {reportes.map((r, idx) => (
                                    <motion.div
                                        key={r.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="rounded-2xl overflow-hidden flex flex-col"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>

                                        {/* Foto */}
                                        {(r.foto_thumbnail_url || r.foto_url) ? (
                                            <button
                                                onClick={() => setFotoAmp(getImgUrl(r.foto_url ?? r.foto_thumbnail_url))}
                                                className="relative overflow-hidden group flex-shrink-0"
                                                style={{ height: '180px' }}>
                                                <img
                                                    src={getImgUrl(r.foto_thumbnail_url ?? r.foto_url)}
                                                    alt="evidencia"
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                />
                                                {/* Badge completado al 100% */}
                                                {r.porcentaje_avance >= 100 && (
                                                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold z-10"
                                                        style={{
                                                            background: 'oklch(62% 0.2 145)',
                                                            color: 'white',
                                                            boxShadow: '0 3px 10px oklch(62% 0.2 145 / 0.6)',
                                                        }}>
                                                        <CheckCircle2 size={11} />
                                                        Completado
                                                    </div>
                                                )}
                                                {/* Hover overlay */}
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                                    style={{ background: 'oklch(0% 0 0 / 0.45)' }}>
                                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold text-white"
                                                        style={{ background: 'oklch(0% 0 0 / 0.4)', backdropFilter: 'blur(4px)' }}>
                                                        <ZoomIn size={14} />
                                                        Ampliar
                                                    </div>
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="flex items-center justify-center flex-shrink-0"
                                                style={{ height: '120px', background: 'var(--surface-3)' }}>
                                                <ImageIcon size={28} style={{ color: 'var(--fg-subtle)' }} />
                                            </div>
                                        )}

                                        {/* Info */}
                                        <div className="px-3.5 py-3 space-y-2 flex-1">
                                            {/* Técnico + fecha + cambio % */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                                                        style={{ background: 'oklch(55% 0.2 290 / 0.15)', color: 'var(--tech)' }}>
                                                        {(r.tecnico ?? 'T')[0].toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                                            {r.tecnico ?? 'Técnico'}
                                                        </p>
                                                        <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--fg-subtle)' }}>
                                                            <Calendar size={9} />
                                                            {r.fecha_reporte
                                                                ? new Date(r.fecha_reporte).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })
                                                                : '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Porcentaje */}
                                                <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-lg"
                                                    style={{ background: r.porcentaje_avance >= (r.porcentaje_anterior ?? 0) ? 'oklch(62% 0.2 145 / 0.1)' : 'oklch(58% 0.22 25 / 0.1)' }}>
                                                    <span className="text-[9px]" style={{ color: 'var(--fg-subtle)' }}>
                                                        {r.porcentaje_anterior ?? 0}%
                                                    </span>
                                                    {r.porcentaje_avance >= (r.porcentaje_anterior ?? 0)
                                                        ? <TrendingUp size={10} style={{ color: 'var(--accent)' }} />
                                                        : <TrendingDown size={10} style={{ color: 'var(--danger)' }} />
                                                    }
                                                    <span className="text-[12px] font-bold"
                                                        style={{ color: r.porcentaje_avance >= (r.porcentaje_anterior ?? 0) ? 'var(--accent)' : 'var(--danger)' }}>
                                                        {r.porcentaje_avance}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Barra */}
                                            <BarraAvance pct={r.porcentaje_avance} height="4px" />

                                            {/* Observación */}
                                            {r.observacion && (
                                                <p className="text-[10px] leading-relaxed px-2 py-1.5 rounded-lg"
                                                    style={{ color: 'var(--fg-muted)', background: 'var(--surface-3)', borderLeft: '2px solid var(--border)' }}>
                                                    {r.observacion}
                                                </p>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Lightbox */}
            <AnimatePresence>
                {fotoAmp && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setFotoAmp(null)}
                        className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                        style={{ background: 'oklch(0% 0 0 / 0.93)', backdropFilter: 'blur(10px)' }}>
                        <motion.img
                            initial={{ scale: 0.88 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                            src={fotoAmp}
                            alt="evidencia ampliada"
                            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
                            style={{ boxShadow: '0 40px 100px oklch(0% 0 0 / 0.8)' }}
                        />
                        <button onClick={() => setFotoAmp(null)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: 'oklch(100% 0 0 / 0.12)', color: 'white', backdropFilter: 'blur(4px)' }}>
                            <X size={17} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );

    return createPortal(modal, document.body);
};

/* ─── Ítem del checklist ─────────────────────────────────────────────────── */
const ItemChecklist = ({ item, viviendaId, conteoReportes, index }) => {
    const [drawerAbierto, setDrawerAbierto] = useState(false);
    const pct    = parseFloat(item.porcentaje_avance) || 0;
    const estado = estadoEfectivo(item);   // always derived from porcentaje_avance
    const cfg    = getCfg(estado);
    const nRep   = conteoReportes ?? 0;

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
                className="group rounded-2xl px-4 py-3.5 transition-all duration-200"
                style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                }}>

                {/* Fila 1: estado icon + nombre + chip */}
                <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                        style={{ background: cfg.bg }}>
                        <cfg.Icon size={12} style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 flex-wrap">
                            {item.codigo && (
                                <span className="text-[9px] font-mono shrink-0 mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                    {item.codigo}
                                </span>
                            )}
                            <span className="text-sm font-semibold leading-snug flex-1 min-w-0" style={{ color: 'var(--fg)' }}>
                                {item.nombre}
                            </span>
                            <ChipEstado estado={estado} />
                        </div>

                        {/* Fila 2: categoría + meta */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            {item.categoria && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: 'oklch(55% 0.2 290 / 0.1)', color: 'var(--tech)' }}>
                                    {item.categoria}
                                </span>
                            )}
                            {item.cantidad_planificada > 0 && (
                                <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                                    {item.cantidad_planificada} {item.unidad_base}
                                </span>
                            )}
                            {item.ponderacion_avance > 0 && (
                                <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                                    Pond: <span className="font-semibold" style={{ color: 'var(--fg-muted)' }}>{item.ponderacion_avance}%</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Fila 3: barra + % + link */}
                <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 min-w-0">
                        <BarraAvance pct={pct} height="6px" />
                    </div>
                    <span className="text-sm font-bold w-10 text-right shrink-0" style={{ color: cfg.color }}>
                        {pct.toFixed(0)}%
                    </span>
                    {nRep > 0 && (
                        <button
                            onClick={() => setDrawerAbierto(true)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:scale-105"
                            style={{ background: 'oklch(58% 0.18 240 / 0.1)', color: 'oklch(58% 0.18 240)', border: '1px solid oklch(58% 0.18 240 / 0.2)' }}>
                            <ImageIcon size={10} />
                            {nRep} {nRep === 1 ? 'foto' : 'fotos'}
                        </button>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {drawerAbierto && (
                    <HistorialDrawer
                        key="historial"
                        item={item}
                        viviendaId={viviendaId}
                        onCerrar={() => setDrawerAbierto(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

/* ─── Componente principal ────────────────────────────────────────────────── */
export default function ChecklistVivienda({ viviendaId, viviendaCodigo }) {
    const [data,         setData]         = useState(null);
    const [cargando,     setCargando]     = useState(true);
    const [error,        setError]        = useState(null);
    const [conteos,      setConteos]      = useState({});
    const [modalAbierto, setModalAbierto] = useState(false);
    const [filtro,       setFiltro]       = useState('todos');
    const [busqueda,     setBusqueda]     = useState('');

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
            const actualizadoMap = Object.fromEntries(
                (resultado.items_actualizados ?? []).map(a => [a.id, a])
            );
            const items = prev.items.map(i => actualizadoMap[i.id] ? { ...i, ...actualizadoMap[i.id] } : i);
            return { ...prev, items, vivienda: { ...prev.vivienda, avance_total: resultado.avance_vivienda } };
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

    /* Skeleton */
    if (cargando) {
        return (
            <div className="space-y-2 py-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[88px] rounded-2xl animate-pulse"
                        style={{ background: 'var(--surface-2)' }} />
                ))}
            </div>
        );
    }

    if (error) return (
        <div className="flex items-center gap-2 text-xs py-4 px-3 rounded-xl"
            style={{ background: 'oklch(58% 0.22 25 / 0.08)', color: 'var(--danger)', border: '1px solid oklch(58% 0.22 25 / 0.2)' }}>
            <AlertCircle size={14} /> {error}
        </div>
    );

    if (!data || data.items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Layers size={28} style={{ color: 'var(--fg-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--fg-subtle)' }}>Sin ítems de presupuesto asignados</p>
            </div>
        );
    }

    const { vivienda, items } = data;
    const avance       = vivienda.avance_total ?? 0;
    const avanceColor  = avance >= 80 ? 'var(--accent)' : avance >= 40 ? 'oklch(58% 0.18 240)' : 'oklch(55% 0.2 290)';
    const puedeRegistrar = items.some(i => i.puede_marcar_avance);

    const FILTROS = [
        { key: 'todos',      label: 'Todos',      count: items.length },
        { key: 'pendiente',  label: 'Pendientes', count: items.filter(i => estadoEfectivo(i) === 'pendiente').length },
        { key: 'en_proceso', label: 'En proceso', count: items.filter(i => estadoEfectivo(i) === 'en_proceso').length },
        { key: 'terminado',  label: 'Terminados', count: items.filter(i => estadoEfectivo(i) === 'terminado').length },
    ].filter(f => f.key === 'todos' || f.count > 0);

    const q = busqueda.trim().toLowerCase();
    const itemsFiltrados = items
        .filter(i => filtro === 'todos' || estadoEfectivo(i) === filtro)
        .filter(i => !q || i.nombre?.toLowerCase().includes(q) || i.codigo?.toLowerCase().includes(q));

    return (
        <>
            <div className="space-y-4 pt-1">

                {/* ── Encabezado de avance ───────────────────────────────────── */}
                <div className="rounded-2xl px-4 py-3.5"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>

                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <BarChart3 size={14} style={{ color: 'var(--tech)' }} />
                                <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                                    Avance total
                                </span>
                            </div>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                {items.length} ítems constructivos · registros fotográficos
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <motion.span
                                key={avance}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-2xl font-black tracking-tight"
                                style={{ color: avanceColor }}>
                                {avance.toFixed(1)}%
                            </motion.span>
                            {puedeRegistrar && (
                                <motion.button
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                    onClick={() => setModalAbierto(true)}
                                    className="flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-2 rounded-xl transition-all"
                                    style={{
                                        background: 'linear-gradient(135deg, oklch(62% 0.2 145 / 0.9), oklch(55% 0.2 165 / 0.9))',
                                        color: 'white',
                                        boxShadow: '0 4px 12px oklch(62% 0.2 145 / 0.3)',
                                    }}>
                                    <Plus size={13} strokeWidth={2.5} />
                                    Registrar avance
                                </motion.button>
                            )}
                        </div>
                    </div>

                    <BarraAvance pct={avance} height="8px" />

                    {/* Stats rápidas */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                        {[
                            { label: 'Terminados', val: items.filter(i => estadoEfectivo(i) === 'terminado').length, color: 'var(--accent)' },
                            { label: 'En proceso', val: items.filter(i => estadoEfectivo(i) === 'en_proceso').length, color: 'oklch(58% 0.18 240)' },
                            { label: 'Pendientes', val: items.filter(i => estadoEfectivo(i) === 'pendiente').length, color: 'var(--fg-subtle)' },
                        ].map(s => (
                            <div key={s.label} className="text-center py-1.5 rounded-xl"
                                style={{ background: 'var(--surface-3)' }}>
                                <p className="text-base font-black" style={{ color: s.color }}>{s.val}</p>
                                <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--fg-subtle)' }}>{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Buscador ───────────────────────────────────────────────── */}
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: 'var(--fg-subtle)' }} />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar ítem por nombre o código…"
                        className="w-full rounded-xl text-xs pl-8 pr-9 py-2.5 outline-none transition-all"
                        style={{
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            color: 'var(--fg)',
                        }}
                    />
                    {busqueda && (
                        <button onClick={() => setBusqueda('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: 'var(--surface-3)', color: 'var(--fg-subtle)' }}>
                            <X size={10} />
                        </button>
                    )}
                </div>

                {/* ── Filtros por estado ──────────────────────────────────────── */}
                {FILTROS.length > 2 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                        {FILTROS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFiltro(f.key)}
                                className="shrink-0 flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                                style={filtro === f.key ? {
                                    background: 'oklch(55% 0.2 290 / 0.15)',
                                    border: '1px solid oklch(55% 0.2 290 / 0.35)',
                                    color: 'var(--tech)',
                                } : {
                                    background: 'var(--surface-2)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--fg-subtle)',
                                }}>
                                {f.label}
                                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                    style={{ background: filtro === f.key ? 'oklch(55% 0.2 290 / 0.2)' : 'var(--surface-3)' }}>
                                    {f.count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Lista de ítems ──────────────────────────────────────────── */}
                <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                        {itemsFiltrados.map((item, idx) => (
                            <ItemChecklist
                                key={item.id}
                                item={item}
                                viviendaId={viviendaId}
                                conteoReportes={conteos[item.id]}
                                index={idx}
                            />
                        ))}
                    </AnimatePresence>
                    {itemsFiltrados.length === 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-2 py-8 rounded-2xl"
                            style={{ color: 'var(--fg-subtle)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <Search size={18} style={{ color: 'var(--fg-subtle)' }} />
                            <p className="text-xs">
                                {q ? `Sin resultados para "${busqueda}"` : 'Sin ítems en este estado'}
                            </p>
                        </motion.div>
                    )}
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
