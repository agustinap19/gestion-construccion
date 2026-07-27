import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    X, Camera, Search, Plus, Trash2, CheckCircle2, Clock,
    Circle, AlertTriangle, MapPin, ChevronDown, Loader2,
    CheckCheck, AlertCircle, ImageIcon, SlidersHorizontal
} from 'lucide-react';
import api from '../../../services/api';

/* ─── Chips de estado ────────────────────────────────────────────────────── */
const ESTADO_CFG = {
    terminado:  { label: 'Terminado',  color: 'var(--accent)',           bg: 'oklch(62% 0.2 145 / 0.12)',   Icon: CheckCircle2 },
    en_proceso: { label: 'En proceso', color: 'oklch(58% 0.18 240)',     bg: 'oklch(58% 0.18 240 / 0.1)',   Icon: Clock },
    pendiente:  { label: 'Pendiente',  color: 'var(--fg-subtle)',        bg: 'oklch(50% 0.01 260 / 0.1)',   Icon: Circle },
};
const getCfg = (e) => ESTADO_CFG[e] ?? ESTADO_CFG.pendiente;

const ChipEstado = ({ estado }) => {
    const { label, color, bg, Icon } = getCfg(estado);
    return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0"
            style={{ background: bg, color, border: `1px solid ${color}33` }}>
            <Icon size={8} />{label}
        </span>
    );
};

/* ─── Barra de progreso ──────────────────────────────────────────────────── */
const MiniBar = ({ pct, color }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const c = color || (p >= 80 ? 'var(--accent)' : p >= 40 ? 'oklch(58% 0.18 240)' : 'oklch(55% 0.2 290)');
    return (
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <motion.div className="h-full rounded-full"
                initial={{ width: 0 }} animate={{ width: `${p}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ background: `linear-gradient(90deg, ${c}, ${c}bb)` }} />
        </div>
    );
};

/* ─── Slider personalizado ───────────────────────────────────────────────── */
const PctSlider = ({ value, onChange }) => {
    const pct = parseFloat(value) || 0;
    const color = pct >= 80 ? 'var(--accent)' : pct >= 40 ? 'oklch(58% 0.18 240)' : 'oklch(55% 0.2 290)';
    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 relative py-1">
                <input
                    type="range" min={0} max={100} step={5}
                    value={pct}
                    onChange={e => onChange(e.target.value)}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                        background: `linear-gradient(to right, ${color} ${pct}%, var(--border) ${pct}%)`,
                        outline: 'none',
                    }}
                />
            </div>
            <div className="relative shrink-0">
                <input
                    type="number" min={0} max={100}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-16 text-center text-sm font-bold rounded-xl px-2 py-1.5 focus:outline-none transition-all"
                    style={{
                        background: 'var(--surface-3)',
                        border: `1px solid var(--border)`,
                        color: color,
                    }}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none"
                    style={{ color: 'var(--fg-subtle)' }}>%</span>
            </div>
        </div>
    );
};

/* ─── GPS Indicator ──────────────────────────────────────────────────────── */
const GpsIndicator = ({ coords }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium"
        style={{ background: 'oklch(62% 0.2 145 / 0.1)', border: '1px solid oklch(62% 0.2 145 / 0.25)', color: 'var(--accent)' }}>
        <div className="relative shrink-0">
            <MapPin size={13} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-ping"
                style={{ background: 'var(--accent)' }} />
        </div>
        <span className="truncate">GPS: {coords}</span>
    </motion.div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   FORMULARIO PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function FormularioReporteAvance({ viviendaId, viviendaCodigo, onCerrar, onGuardado }) {
    const fileRef    = useRef(null);
    const dropRef    = useRef(null);
    const searchRef  = useRef(null);

    /* Estado de datos */
    const [items,           setItems]           = useState([]);
    const [cargandoItems,   setCargandoItems]   = useState(true);
    const [itemsSeleccionados, setItemsSeleccionados] = useState([]);
    const [observacion,     setObservacion]     = useState('');
    const [foto,            setFoto]            = useState(null);
    const [fotoPreview,     setFotoPreview]     = useState(null);
    const [coordenadas,     setCoordenadas]     = useState('');
    const [guardando,       setGuardando]       = useState(false);
    const [errores,         setErrores]         = useState({});
    const [confirmando,     setConfirmando]     = useState(false);
    const [errorMsg,        setErrorMsg]        = useState(null);

    /* Estado del buscador */
    const [busqueda,        setBusqueda]        = useState('');
    const [dropOpen,        setDropOpen]        = useState(false);

    /* Cierre del dropdown al click exterior */
    useEffect(() => {
        const fn = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, []);

    /* Cargar ítems */
    useEffect(() => {
        if (!viviendaId) return;
        setCargandoItems(true);
        api.get(`/viviendas/${viviendaId}/checklist`)
            .then(res => setItems(res.data.items ?? []))
            .catch(() => toast.error('No se pudieron cargar los ítems'))
            .finally(() => setCargandoItems(false));
    }, [viviendaId]);

    /* Focus en buscador al abrir dropdown */
    useEffect(() => {
        if (dropOpen) setTimeout(() => searchRef.current?.focus(), 50);
    }, [dropOpen]);

    /* ── Lógica ─────────────────────────────────────────────────────────────── */

    const itemsFiltrados = items.filter(item => {
        if (itemsSeleccionados.find(s => s.item.id === item.id)) return false;
        const t = busqueda.toLowerCase();
        return (item.nombre ?? '').toLowerCase().includes(t) ||
               (item.codigo ?? '').toLowerCase().includes(t);
    });

    const agregarItem = (item) => {
        if (itemsSeleccionados.length >= 3) {
            toast.error('Máximo 3 ítems por reporte');
            return;
        }
        setItemsSeleccionados(p => [...p, { item, pctNuevo: String(Math.round(item.porcentaje_avance)) }]);
        setErrores({});
        setDropOpen(false);
        setBusqueda('');
    };

    const removerItem = (id) => setItemsSeleccionados(p => p.filter(s => s.item.id !== id));

    const actualizarPct = (id, val) => {
        const num = Math.min(100, Math.max(0, Number(String(val).replace(/[^0-9]/g, ''))));
        setItemsSeleccionados(p => p.map(s => s.item.id === id ? { ...s, pctNuevo: String(num) } : s));
    };

    const hayRetrograda = itemsSeleccionados.some(s => parseFloat(s.pctNuevo || 0) < s.item.porcentaje_avance);

    const handleFoto = (file) => {
        if (!file) return;
        setFoto(file);
        setFotoPreview(URL.createObjectURL(file));
        setErrores(p => ({ ...p, foto: undefined }));
    };

    const capturarGPS = () => new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('GPS no disponible en este navegador'));
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
            () => reject(new Error('Es obligatorio permitir el acceso a la ubicación GPS para registrar avances.')),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    const validar = () => {
        const e = {};
        if (itemsSeleccionados.length === 0) e.item = 'Añade al menos un ítem';
        const faltaPct = itemsSeleccionados.some(s => s.pctNuevo === '' || isNaN(parseFloat(s.pctNuevo)));
        if (faltaPct) e.pct = 'Todos los porcentajes son requeridos';
        if (!foto) e.foto = 'La foto es obligatoria para el registro';
        if (hayRetrograda && !observacion.trim()) e.observacion = 'Observación obligatoria al reducir avance';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const iniciarGuardado = async () => {
        if (!validar()) return;
        const id = toast.loading('Obteniendo ubicación GPS…');
        try {
            const coords = await capturarGPS();
            setCoordenadas(coords);
            toast.dismiss(id);
            setConfirmando(true);
        } catch (err) {
            toast.error(err.message, { id });
        }
    };

    const handleSubmit = async () => {
        setConfirmando(false);
        setGuardando(true);
        try {
            const form = new FormData();
            const payload = itemsSeleccionados.map(s => ({
                presupuesto_item_proyecto_id: s.item.id,
                porcentaje_avance: parseFloat(s.pctNuevo) || 0,
            }));
            form.append('items', JSON.stringify(payload));
            form.append('foto', foto);
            if (observacion.trim()) form.append('observacion', observacion.trim());
            if (coordenadas) form.append('coordenadas_gps', coordenadas);

            const res = await api.post(`/viviendas/${viviendaId}/reportes-avance`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('¡Avance registrado con éxito!');
            onGuardado?.(res.data);
            onCerrar();
        } catch (e) {
            const msgs = e.response?.data?.errors ?? {};
            if (Object.keys(msgs).length) setErrores(msgs);
            const main = e.response?.data?.message;
            if (main) setErrorMsg(main);
            else toast.error('Error al guardar el reporte');
        } finally {
            setGuardando(false);
        }
    };

    const puedeGuardar = itemsSeleccionados.length > 0 && foto &&
        itemsSeleccionados.every(s => s.pctNuevo !== '');

    /* ── Render ──────────────────────────────────────────────────────────── */

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4"
            style={{ background: 'oklch(0% 0 0 / 0.75)', backdropFilter: 'blur(10px)' }}>

            <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="w-full sm:max-w-lg max-h-[96vh] flex flex-col rounded-t-3xl sm:rounded-3xl overflow-hidden relative"
                style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-lg)',
                }}>

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'linear-gradient(135deg, oklch(62% 0.2 145 / 0.15), oklch(55% 0.2 290 / 0.1))' }}>
                            <Camera size={16} style={{ color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                                Registrar avance
                            </h3>
                            <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                {viviendaCodigo}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Contador de ítems */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)', border: '1px solid var(--border)' }}>
                            <SlidersHorizontal size={11} />
                            {itemsSeleccionados.length}/3
                        </div>
                        <button onClick={onCerrar}
                            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                            style={{ background: 'var(--surface-2)', color: 'var(--fg-muted)' }}>
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* ── Cuerpo scrolleable ───────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-thin">

                    {/* GPS capturado */}
                    {coordenadas && <GpsIndicator coords={coordenadas} />}

                    {/* ── 1. Ítems ──────────────────────────────────────── */}
                    <section>
                        <div className="flex items-center justify-between mb-2.5">
                            <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--fg-muted)' }}>
                                Ítems constructivos <span style={{ color: 'var(--danger)' }}>*</span>
                            </label>
                            <span className="text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                                máx. 3 por reporte
                            </span>
                        </div>

                        {cargandoItems ? (
                            <div className="flex items-center justify-center gap-2 py-5 rounded-2xl"
                                style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
                                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--tech)' }} />
                                <span className="text-xs" style={{ color: 'var(--fg-subtle)' }}>Cargando ítems…</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {/* Items seleccionados */}
                                <AnimatePresence>
                                    {itemsSeleccionados.map((sel) => {
                                        const diff = (parseFloat(sel.pctNuevo) || 0) - sel.item.porcentaje_avance;
                                        const retro = diff < 0;
                                        const pctColor = (parseFloat(sel.pctNuevo)||0) >= 80 ? 'var(--accent)' :
                                                         (parseFloat(sel.pctNuevo)||0) >= 40 ? 'oklch(58% 0.18 240)' : 'oklch(55% 0.2 290)';
                                        return (
                                            <motion.div
                                                key={sel.item.id}
                                                layout
                                                initial={{ opacity: 0, scale: 0.97, height: 0 }}
                                                animate={{ opacity: 1, scale: 1, height: 'auto' }}
                                                exit={{ opacity: 0, scale: 0.97, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden">
                                                <div className="rounded-2xl p-3.5 space-y-3"
                                                    style={{
                                                        background: 'var(--surface-2)',
                                                        border: `1px solid ${retro ? 'oklch(72% 0.18 85 / 0.35)' : 'var(--border)'}`,
                                                    }}>
                                                    {/* Info + quitar */}
                                                    <div className="flex items-start gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {sel.item.codigo && (
                                                                    <span className="text-[9px] font-mono shrink-0" style={{ color: 'var(--tech)' }}>
                                                                        {sel.item.codigo}
                                                                    </span>
                                                                )}
                                                                <ChipEstado estado={sel.item.estado_ejecucion} />
                                                            </div>
                                                            <p className="text-[12px] font-semibold leading-snug mt-0.5" style={{ color: 'var(--fg)' }}>
                                                                {sel.item.nombre}
                                                            </p>
                                                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                                                Actual: <span className="font-bold" style={{ color: 'var(--fg-muted)' }}>
                                                                    {Math.round(sel.item.porcentaje_avance)}%
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <button onClick={() => removerItem(sel.item.id)}
                                                            className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-105"
                                                            style={{ background: 'oklch(58% 0.22 25 / 0.1)', color: 'var(--danger)' }}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>

                                                    {/* Slider */}
                                                    <div className="space-y-1.5">
                                                        <div className="flex justify-between text-[10px]" style={{ color: 'var(--fg-subtle)' }}>
                                                            <span>Nuevo avance</span>
                                                            <span style={{ color: pctColor, fontWeight: 700 }}>
                                                                {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                        <PctSlider value={sel.pctNuevo} onChange={v => actualizarPct(sel.item.id, v)} />
                                                        <MiniBar pct={sel.pctNuevo} />
                                                    </div>

                                                    {/* Advertencia retrogradar */}
                                                    {retro && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg"
                                                            style={{ background: 'oklch(72% 0.18 85 / 0.1)', color: 'var(--warning)', border: '1px solid oklch(72% 0.18 85 / 0.25)' }}>
                                                            <AlertTriangle size={11} />
                                                            Reduciendo {Math.abs(diff).toFixed(0)}% — requiere observación
                                                        </motion.div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Botón añadir ítem */}
                                {itemsSeleccionados.length < 3 && (
                                    <div ref={dropRef} className="relative">
                                        <button
                                            onClick={() => setDropOpen(v => !v)}
                                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[11px] font-semibold transition-all hover:scale-[1.01]"
                                            style={{
                                                background: errores.item ? 'oklch(58% 0.22 25 / 0.06)' : 'var(--surface-2)',
                                                border: `1.5px dashed ${errores.item ? 'oklch(58% 0.22 25 / 0.4)' : 'oklch(55% 0.2 290 / 0.35)'}`,
                                                color: errores.item ? 'var(--danger)' : 'var(--tech)',
                                            }}>
                                            <Plus size={13} strokeWidth={2.5} />
                                            {itemsSeleccionados.length > 0 ? 'Añadir otro ítem' : 'Seleccionar ítem'}
                                        </button>

                                        {/* Dropdown buscador */}
                                        <AnimatePresence>
                                            {dropOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -6, scale: 0.98 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -6, scale: 0.98 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute z-50 inset-x-0 mt-2 rounded-2xl overflow-hidden"
                                                    style={{
                                                        background: 'var(--surface-1)',
                                                        border: '1px solid var(--border)',
                                                        boxShadow: 'var(--shadow-lg)',
                                                    }}>
                                                    {/* Input búsqueda */}
                                                    <div className="p-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                                                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                                                            <Search size={13} style={{ color: 'var(--fg-subtle)', flexShrink: 0 }} />
                                                            <input
                                                                ref={searchRef}
                                                                type="text"
                                                                placeholder="Buscar por código o nombre…"
                                                                value={busqueda}
                                                                onChange={e => setBusqueda(e.target.value)}
                                                                className="flex-1 text-xs bg-transparent focus:outline-none"
                                                                style={{ color: 'var(--fg)' }}
                                                            />
                                                            {busqueda && (
                                                                <button onClick={() => setBusqueda('')}>
                                                                    <X size={11} style={{ color: 'var(--fg-subtle)' }} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Lista */}
                                                    <div className="max-h-56 overflow-y-auto scrollbar-thin p-1.5">
                                                        {itemsFiltrados.length === 0 ? (
                                                            <div className="py-6 text-center text-[11px]" style={{ color: 'var(--fg-subtle)' }}>
                                                                Sin resultados
                                                            </div>
                                                        ) : itemsFiltrados.map(item => {
                                                            const pct = item.porcentaje_avance ?? 0;
                                                            const cfg = getCfg(item.estado_ejecucion);
                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    onClick={() => agregarItem(item)}
                                                                    className="w-full text-left px-3 py-2.5 rounded-xl transition-all hover:scale-[1.01] flex items-start gap-2.5"
                                                                    style={{ color: 'var(--fg)' }}
                                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                                                        style={{ background: cfg.bg }}>
                                                                        <cfg.Icon size={11} style={{ color: cfg.color }} />
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            {item.codigo && (
                                                                                <span className="text-[9px] font-mono" style={{ color: 'var(--tech)' }}>
                                                                                    {item.codigo}
                                                                                </span>
                                                                            )}
                                                                            <ChipEstado estado={item.estado_ejecucion} />
                                                                        </div>
                                                                        <p className="text-[11px] font-semibold leading-snug mt-0.5 truncate">
                                                                            {item.nombre}
                                                                        </p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                                                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
                                                                            </div>
                                                                            <span className="text-[9px] font-bold shrink-0" style={{ color: cfg.color }}>
                                                                                {Math.round(pct)}%
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}

                        {errores.item && (
                            <p className="text-[11px] mt-1.5 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                <AlertCircle size={11} />{errores.item}
                            </p>
                        )}
                        {errores.pct && (
                            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                <AlertCircle size={11} />{errores.pct}
                            </p>
                        )}
                    </section>

                    {/* ── 2. Foto de evidencia ──────────────────────────── */}
                    <section>
                        <label className="block text-[11px] font-bold uppercase tracking-widest mb-2.5" style={{ color: 'var(--fg-muted)' }}>
                            Foto de evidencia <span style={{ color: 'var(--danger)' }}>*</span>
                        </label>

                        {fotoPreview ? (
                            <div className="relative rounded-2xl overflow-hidden group"
                                style={{ border: '1px solid var(--border)', height: '160px' }}>
                                <img src={fotoPreview} alt="preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all"
                                    style={{ background: 'oklch(0% 0 0 / 0.6)', backdropFilter: 'blur(4px)' }}>
                                    <button onClick={() => fileRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                                        style={{ background: 'oklch(55% 0.2 290 / 0.9)' }}>
                                        <Camera size={13} /> Cambiar
                                    </button>
                                    <button onClick={() => { setFoto(null); setFotoPreview(null); }}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:scale-105"
                                        style={{ background: 'oklch(58% 0.22 25 / 0.9)' }}>
                                        <Trash2 size={13} /> Quitar
                                    </button>
                                </div>
                                {/* Indicador esquina */}
                                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                    style={{ background: 'oklch(62% 0.2 145 / 0.9)', color: 'white' }}>
                                    ✓ Foto cargada
                                </div>
                            </div>
                        ) : (
                            <button type="button" onClick={() => fileRef.current?.click()}
                                className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.01]"
                                style={{
                                    height: '140px',
                                    background: errores.foto ? 'oklch(58% 0.22 25 / 0.05)' : 'var(--surface-2)',
                                    border: `2px dashed ${errores.foto ? 'oklch(58% 0.22 25 / 0.4)' : 'oklch(55% 0.2 290 / 0.3)'}`,
                                }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: errores.foto ? 'oklch(58% 0.22 25 / 0.1)' : 'oklch(55% 0.2 290 / 0.1)' }}>
                                    <Camera size={18} style={{ color: errores.foto ? 'var(--danger)' : 'var(--tech)' }} />
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-semibold" style={{ color: errores.foto ? 'var(--danger)' : 'var(--fg-muted)' }}>
                                        {errores.foto ? errores.foto : 'Toca para capturar evidencia'}
                                    </p>
                                    {!errores.foto && (
                                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--fg-subtle)' }}>
                                            JPG, PNG o WEBP · se compartirá entre todos los ítems
                                        </p>
                                    )}
                                </div>
                            </button>
                        )}

                        <input ref={fileRef} type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            capture="environment" className="hidden"
                            onChange={e => handleFoto(e.target.files?.[0])} />
                    </section>

                    {/* ── 3. Observación ───────────────────────────────── */}
                    <section>
                        <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--fg-muted)' }}>
                            Observación
                            {hayRetrograda && (
                                <span className="ml-1 normal-case font-normal" style={{ color: 'var(--danger)' }}>
                                    * obligatoria al reducir avance
                                </span>
                            )}
                        </label>
                        <textarea
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            rows={3}
                            placeholder={hayRetrograda
                                ? 'Explica por qué se reduce el avance…'
                                : 'Notas adicionales sobre los avances (opcional)'}
                            className="w-full rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none transition-all scrollbar-thin"
                            style={{
                                background: 'var(--surface-2)',
                                border: `1px solid ${errores.observacion ? 'oklch(58% 0.22 25 / 0.5)' : 'var(--border)'}`,
                                color: 'var(--fg)',
                                caretColor: 'var(--tech)',
                            }}
                        />
                        {errores.observacion && (
                            <p className="text-[11px] mt-1 flex items-center gap-1" style={{ color: 'var(--danger)' }}>
                                <AlertCircle size={11} />{errores.observacion}
                            </p>
                        )}
                    </section>

                    {/* Nota GPS */}
                    <p className="flex items-start gap-1.5 text-[10px] leading-relaxed"
                        style={{ color: 'var(--fg-subtle)' }}>
                        <MapPin size={11} className="mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
                        La ubicación GPS se captura automáticamente al guardar. Debes estar dentro de los 100 metros del terreno del beneficiario.
                    </p>
                </div>

                {/* ── Footer ──────────────────────────────────────────── */}
                <div className="shrink-0 px-5 py-4 flex gap-3"
                    style={{ borderTop: '1px solid var(--border)' }}>
                    <button onClick={onCerrar}
                        className="flex-1 py-3 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                        Cancelar
                    </button>
                    <motion.button
                        onClick={iniciarGuardado}
                        disabled={!puedeGuardar || guardando}
                        whileHover={puedeGuardar && !guardando ? { scale: 1.02 } : {}}
                        whileTap={puedeGuardar && !guardando ? { scale: 0.98 } : {}}
                        className="flex-1 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-40"
                        style={{
                            background: puedeGuardar && !guardando
                                ? 'linear-gradient(135deg, oklch(62% 0.2 145), oklch(55% 0.2 165))'
                                : 'var(--surface-3)',
                            boxShadow: puedeGuardar && !guardando ? '0 6px 20px oklch(62% 0.2 145 / 0.35)' : 'none',
                            color: puedeGuardar && !guardando ? 'white' : 'var(--fg-subtle)',
                        }}>
                        {guardando ? (
                            <span className="flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Guardando…
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CheckCheck size={15} /> Guardar reporte
                            </span>
                        )}
                    </motion.button>
                </div>

                {/* ── Modal Confirmación ───────────────────────────────── */}
                <AnimatePresence>
                    {confirmando && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-5"
                            style={{ background: 'oklch(0% 0 0 / 0.7)', backdropFilter: 'blur(8px)' }}>
                            <motion.div
                                initial={{ scale: 0.9, y: 12 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 12 }}
                                className="w-full max-w-xs rounded-3xl p-6 text-center"
                                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                    style={{ background: 'oklch(62% 0.2 145 / 0.15)' }}>
                                    <CheckCircle2 size={26} style={{ color: 'var(--accent)' }} />
                                </div>

                                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--fg)' }}>
                                    ¿Confirmar registro?
                                </h3>
                                <p className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>
                                    Registrarás avance en{' '}
                                    <span className="font-bold" style={{ color: 'var(--tech)' }}>
                                        {itemsSeleccionados.length} {itemsSeleccionados.length === 1 ? 'ítem' : 'ítems'}
                                    </span>
                                </p>
                                {coordenadas && (
                                    <p className="text-[10px] mb-4 flex items-center justify-center gap-1" style={{ color: 'var(--accent)' }}>
                                        <MapPin size={10} /> GPS verificado
                                    </p>
                                )}

                                {/* Resumen */}
                                <div className="space-y-1.5 mb-5 text-left">
                                    {itemsSeleccionados.map(s => {
                                        const diff = (parseFloat(s.pctNuevo)||0) - s.item.porcentaje_avance;
                                        const color = diff >= 0 ? 'var(--accent)' : 'var(--danger)';
                                        return (
                                            <div key={s.item.id} className="flex items-center justify-between px-3 py-2 rounded-xl gap-2"
                                                style={{ background: 'var(--surface-2)' }}>
                                                <span className="text-[11px] truncate flex-1" style={{ color: 'var(--fg-muted)' }}>
                                                    {s.item.nombre}
                                                </span>
                                                <span className="text-[11px] font-bold shrink-0" style={{ color }}>
                                                    {diff >= 0 ? '+' : ''}{diff.toFixed(0)}%
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-2.5">
                                    <button onClick={() => setConfirmando(false)}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                                        Atrás
                                    </button>
                                    <motion.button
                                        onClick={handleSubmit}
                                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                                        style={{ background: 'linear-gradient(135deg, oklch(62% 0.2 145), oklch(55% 0.2 165))', boxShadow: '0 4px 16px oklch(62% 0.2 145 / 0.35)' }}>
                                        Sí, registrar
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Modal Error ──────────────────────────────────────── */}
                <AnimatePresence>
                    {errorMsg && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-5"
                            style={{ background: 'oklch(0% 0 0 / 0.7)', backdropFilter: 'blur(8px)' }}>
                            <motion.div
                                initial={{ scale: 0.9, y: 12 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.9, y: 12 }}
                                className="w-full max-w-xs rounded-3xl p-6 text-center"
                                style={{ background: 'var(--surface-1)', border: '1px solid oklch(58% 0.22 25 / 0.3)', boxShadow: 'var(--shadow-lg)' }}>

                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                    style={{ background: 'oklch(58% 0.22 25 / 0.12)' }}>
                                    <AlertTriangle size={26} style={{ color: 'var(--danger)' }} />
                                </div>

                                <h3 className="text-base font-bold mb-2" style={{ color: 'var(--fg)' }}>
                                    No se pudo guardar
                                </h3>
                                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--fg-muted)' }}>
                                    {errorMsg}
                                </p>
                                <button onClick={() => setErrorMsg(null)}
                                    className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.01]"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                                    Entendido
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </div>
    );

    return createPortal(modal, document.body);
}
