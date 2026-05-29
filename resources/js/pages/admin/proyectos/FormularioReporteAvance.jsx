import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_ESTADO = {
    terminado:  '#34d399',
    en_proceso: '#60a5fa',
    pendiente:  '#475569',
};

const CHIP_ESTADO = {
    terminado:  { label: 'Terminado',  bg: 'rgba(52,211,153,0.1)',  text: '#34d399' },
    en_proceso: { label: 'En proceso', bg: 'rgba(96,165,250,0.1)',  text: '#60a5fa' },
    pendiente:  { label: 'Pendiente',  bg: 'rgba(71,85,105,0.15)', text: '#94a3b8' },
};

// ── Sub-componentes ──────────────────────────────────────────────────────────

const ChipEstado = ({ estado }) => {
    const cfg = CHIP_ESTADO[estado] ?? CHIP_ESTADO.pendiente;
    return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: cfg.bg, color: cfg.text }}>
            {cfg.label}
        </span>
    );
};

// ── Componente principal ─────────────────────────────────────────────────────

export default function FormularioReporteAvance({ viviendaId, viviendaCodigo, onCerrar, onGuardado }) {
    const fileRef  = useRef(null);
    const [items,       setItems]       = useState([]);
    const [cargandoItems, setCargandoItems] = useState(true);

    const [itemSeleccionado, setItemSeleccionado] = useState(null);
    const [pctNuevo,   setPctNuevo]   = useState('');
    const [observacion, setObservacion] = useState('');
    const [foto,        setFoto]       = useState(null);     // File
    const [fotoPreview, setFotoPreview] = useState(null);   // URL preview
    const [gpsLoading,  setGpsLoading]  = useState(false);
    const [coordenadas, setCoordenadas] = useState('');
    const [guardando,   setGuardando]  = useState(false);
    const [errores,     setErrores]    = useState({});

    // Cargar items del checklist
    useEffect(() => {
        if (!viviendaId) return;
        setCargandoItems(true);
        api.get(`/viviendas/${viviendaId}/checklist`)
            .then(res => setItems(res.data.items ?? []))
            .catch(() => toast.error('No se pudieron cargar los ítems'))
            .finally(() => setCargandoItems(false));
    }, [viviendaId]);

    // Calcular diferencia al cambiar porcentaje
    const pctActual = parseFloat(itemSeleccionado?.porcentaje_avance ?? 0);
    const pctNum    = parseFloat(pctNuevo) || 0;
    const diferencia = pctNum - pctActual;
    const retrograda = diferencia < 0;

    const handleItemChange = (e) => {
        const id = parseInt(e.target.value);
        const item = items.find(i => i.id === id);
        setItemSeleccionado(item ?? null);
        setPctNuevo(item ? String(Math.round(item.porcentaje_avance)) : '');
        setErrores({});
    };

    const handlePctChange = (v) => {
        const num = Math.min(100, Math.max(0, Number(v.replace(/[^0-9]/g, ''))));
        setPctNuevo(String(num));
    };

    const handleFoto = (file) => {
        if (!file) return;
        setFoto(file);
        const url = URL.createObjectURL(file);
        setFotoPreview(url);
        setErrores(p => ({ ...p, foto: undefined }));
    };

    const capturarGPS = () => {
        if (!navigator.geolocation) { toast.error('GPS no disponible'); return; }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                setCoordenadas(`${pos.coords.latitude},${pos.coords.longitude}`);
                setGpsLoading(false);
                toast.success('Ubicación capturada');
            },
            () => { toast.error('No se pudo obtener la ubicación'); setGpsLoading(false); }
        );
    };

    const validar = () => {
        const errs = {};
        if (!itemSeleccionado) errs.item = 'Selecciona un ítem';
        if (pctNuevo === '' || isNaN(pctNum)) errs.pct = 'El porcentaje es requerido';
        if (!foto) errs.foto = 'La foto es obligatoria para registrar el avance';
        if (retrograda && !observacion.trim()) {
            errs.observacion = 'La observación es obligatoria al reducir el avance';
        }
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async () => {
        if (!validar()) return;
        setGuardando(true);
        try {
            const form = new FormData();
            form.append('presupuesto_item_proyecto_id', itemSeleccionado.id);
            form.append('porcentaje_avance', pctNum);
            form.append('foto', foto);
            if (observacion.trim()) form.append('observacion', observacion.trim());
            if (coordenadas) form.append('coordenadas_gps', coordenadas);

            const res = await api.post(`/viviendas/${viviendaId}/reportes-avance`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(`Reporte registrado. Avance de la vivienda actualizado a ${res.data.avance_vivienda?.toFixed(1)}%`);
            onGuardado?.(res.data);
            onCerrar();
        } catch (e) {
            const msgs = e.response?.data?.errors ?? {};
            if (Object.keys(msgs).length) setErrores(msgs);
            toast.error(e.response?.data?.message || 'Error al guardar el reporte');
        } finally {
            setGuardando(false);
        }
    };

    const puedeGuardar = itemSeleccionado && foto && pctNuevo !== '';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full sm:max-w-lg max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden"
                style={{ background: 'rgba(8,18,36,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <h3 className="text-sm font-bold text-white">Registrar avance</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{viviendaCodigo}</p>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Scroll body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

                    {/* 1. Selector de ítem */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Ítem constructivo <span className="text-red-400">*</span>
                        </label>
                        {cargandoItems ? (
                            <div className="h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        ) : (
                            <select
                                value={itemSeleccionado?.id ?? ''}
                                onChange={handleItemChange}
                                className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${errores.item ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.1)'}` }}>
                                <option value="">— Selecciona un ítem —</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.codigo} — {item.nombre} (Avance: {Math.round(item.porcentaje_avance)}%)
                                    </option>
                                ))}
                            </select>
                        )}
                        {errores.item && <p className="text-[11px] text-red-400 mt-1">{errores.item}</p>}

                        {/* Info del item seleccionado */}
                        <AnimatePresence>
                            {itemSeleccionado && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 px-3 py-2 rounded-xl text-[11px] flex items-center gap-3"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <span className="text-slate-400">
                                        Avance actual: <span className="font-bold text-slate-200">{Math.round(itemSeleccionado.porcentaje_avance)}%</span>
                                    </span>
                                    <ChipEstado estado={itemSeleccionado.estado_ejecucion} />
                                    <span className="text-slate-600">Pond: {itemSeleccionado.ponderacion_avance}%</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 2. Nuevo porcentaje */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Nuevo porcentaje de avance <span className="text-red-400">*</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range" min={0} max={100} value={pctNum}
                                onChange={e => setPctNuevo(e.target.value)}
                                className="flex-1 accent-blue-500"
                            />
                            <div className="flex items-center gap-1">
                                <input
                                    type="number" min={0} max={100}
                                    value={pctNuevo}
                                    onChange={e => handlePctChange(e.target.value)}
                                    className="w-16 text-center text-sm font-bold rounded-lg px-2 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                />
                                <span className="text-xs text-slate-500">%</span>
                            </div>
                        </div>
                        {/* Diferencia */}
                        {itemSeleccionado && pctNuevo !== '' && (
                            <p className={`text-[11px] mt-1.5 font-semibold ${retrograda ? 'text-amber-400' : diferencia > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {retrograda
                                    ? `⚠ Reduciendo el avance ${Math.abs(diferencia).toFixed(0)}% — agrega observación`
                                    : diferencia > 0
                                        ? `+${diferencia.toFixed(0)}% respecto al avance actual`
                                        : 'Sin cambio de avance'}
                            </p>
                        )}
                        {errores.pct && <p className="text-[11px] text-red-400 mt-1">{errores.pct}</p>}
                    </div>

                    {/* 3. Foto de evidencia */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Foto de evidencia <span className="text-red-400">*</span>
                        </label>
                        {fotoPreview ? (
                            <div className="relative rounded-xl overflow-hidden"
                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={fotoPreview} alt="preview" className="w-full h-40 object-cover" />
                                <button
                                    onClick={() => { setFoto(null); setFotoPreview(null); }}
                                    className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs"
                                    style={{ background: 'rgba(0,0,0,0.6)' }}>
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="w-full h-32 rounded-xl flex flex-col items-center justify-center gap-2 transition-all"
                                style={{
                                    background: errores.foto ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.03)',
                                    border: `2px dashed ${errores.foto ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}`,
                                }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                    <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span className="text-xs text-slate-500">
                                    {errores.foto ? errores.foto : 'Toca para tomar foto o elegir archivo'}
                                </span>
                                <span className="text-[10px] text-slate-600">JPG, PNG, WEBP — máx. 10 MB</span>
                            </button>
                        )}
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            capture="environment"
                            className="hidden"
                            onChange={e => handleFoto(e.target.files?.[0])}
                        />
                        {errores.foto && !fotoPreview && <p className="text-[11px] text-red-400 mt-1">{errores.foto}</p>}
                    </div>

                    {/* 4. Observación */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Observación {retrograda && <span className="text-red-400">* (obligatoria al reducir)</span>}
                        </label>
                        <textarea
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            rows={3}
                            placeholder={retrograda ? 'Explica por qué se reduce el avance...' : 'Notas sobre el avance registrado (opcional)'}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${errores.observacion ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)'}`,
                            }}
                        />
                        {errores.observacion && <p className="text-[11px] text-red-400 mt-1">{errores.observacion}</p>}
                    </div>

                    {/* 5. GPS */}
                    <div>
                        <button
                            type="button"
                            onClick={capturarGPS}
                            disabled={gpsLoading}
                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-40"
                            style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                            {gpsLoading ? (
                                <span className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                            ) : (
                                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                                </svg>
                            )}
                            {coordenadas ? `GPS: ${coordenadas}` : 'Capturar ubicación GPS'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 px-5 py-4 flex gap-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button
                        onClick={onCerrar}
                        className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!puedeGuardar || guardando}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                        style={{ background: puedeGuardar && !guardando ? 'rgba(96,165,250,0.9)' : 'rgba(96,165,250,0.3)' }}>
                        {guardando ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : 'Guardar reporte'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
