import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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

    const [itemsSeleccionados, setItemsSeleccionados] = useState([]); // Array de { item, pctNuevo }
    const [observacion, setObservacion] = useState('');
    const [foto,        setFoto]       = useState(null);     // File
    const [fotoPreview, setFotoPreview] = useState(null);   // URL preview
    const [coordenadas, setCoordenadas] = useState('');
    const [guardando,   setGuardando]  = useState(false);
    const [errores,     setErrores]    = useState({});
    const [mostrandoConfirmacion, setMostrandoConfirmacion] = useState(false);
    const [errorModalMensaje, setErrorModalMensaje] = useState(null);

    // Estados para el Combobox buscador
    const [busquedaItem, setBusquedaItem] = useState('');
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickFuera = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownAbierto(false);
            }
        };
        document.addEventListener('mousedown', handleClickFuera);
        return () => document.removeEventListener('mousedown', handleClickFuera);
    }, []);

    // Cargar items del checklist
    useEffect(() => {
        if (!viviendaId) return;
        setCargandoItems(true);
        api.get(`/viviendas/${viviendaId}/checklist`)
            .then(res => setItems(res.data.items ?? []))
            .catch(() => toast.error('No se pudieron cargar los ítems'))
            .finally(() => setCargandoItems(false));
    }, [viviendaId]);

    // Filtrar ítems para el buscador (excluyendo los ya seleccionados)
    const itemsFiltrados = items.filter(item => {
        if (itemsSeleccionados.find(sel => sel.item.id === item.id)) return false;
        const term = busquedaItem.toLowerCase();
        return item.nombre.toLowerCase().includes(term) || item.codigo.toLowerCase().includes(term);
    });

    const agregarItem = (item) => {
        if (itemsSeleccionados.length >= 3) {
            toast.error('Puedes añadir un máximo de 3 ítems a la vez.');
            return;
        }
        setItemsSeleccionados(prev => [...prev, {
            item: item,
            pctNuevo: String(Math.round(item.porcentaje_avance))
        }]);
        setErrores({});
        setDropdownAbierto(false);
        setBusquedaItem('');
    };

    const removerItem = (itemId) => {
        setItemsSeleccionados(prev => prev.filter(sel => sel.item.id !== itemId));
    };

    const actualizarPctItem = (itemId, nuevoPct) => {
        const num = Math.min(100, Math.max(0, Number(nuevoPct.replace(/[^0-9]/g, ''))));
        setItemsSeleccionados(prev => prev.map(sel => 
            sel.item.id === itemId ? { ...sel, pctNuevo: String(num) } : sel
        ));
    };

    const algunaRetrograda = itemsSeleccionados.some(sel => parseFloat(sel.pctNuevo || 0) < sel.item.porcentaje_avance);

    const handleFoto = (file) => {
        if (!file) return;
        setFoto(file);
        const url = URL.createObjectURL(file);
        setFotoPreview(url);
        setErrores(p => ({ ...p, foto: undefined }));
    };

    const capturarGPSAsync = () => {
        return new Promise((resolve, reject) => {
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
    };

    const validar = () => {
        const errs = {};
        if (itemsSeleccionados.length === 0) errs.item = 'Añade al menos un ítem';
        
        let faltanPorcentajes = false;
        itemsSeleccionados.forEach(sel => {
            if (sel.pctNuevo === '' || isNaN(parseFloat(sel.pctNuevo))) faltanPorcentajes = true;
        });
        if (faltanPorcentajes) errs.pct = 'Todos los porcentajes son requeridos';

        if (!foto) errs.foto = 'La foto es obligatoria para registrar el avance';
        if (algunaRetrograda && !observacion.trim()) {
            errs.observacion = 'La observación es obligatoria al reducir el avance en algún ítem';
        }
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const iniciarGuardado = async () => {
        if (!validar()) return;
        
        const idToast = toast.loading('Obteniendo ubicación GPS obligatoria...');
        try {
            const coords = await capturarGPSAsync();
            setCoordenadas(coords);
            toast.dismiss(idToast);
            setMostrandoConfirmacion(true);
        } catch (error) {
            toast.error(error.message, { id: idToast });
        }
    };

    const handleSubmit = async () => {
        setMostrandoConfirmacion(false);
        setGuardando(true);
        try {
            const form = new FormData();
            
            const payloadItems = itemsSeleccionados.map(sel => ({
                presupuesto_item_proyecto_id: sel.item.id,
                porcentaje_avance: parseFloat(sel.pctNuevo) || 0
            }));

            form.append('items', JSON.stringify(payloadItems));
            form.append('foto', foto);
            if (observacion.trim()) form.append('observacion', observacion.trim());
            if (coordenadas) form.append('coordenadas_gps', coordenadas);

            const res = await api.post(`/viviendas/${viviendaId}/reportes-avance`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(`Avance registrado con éxito.`);
            onGuardado?.(res.data);
            onCerrar();
        } catch (e) {
            const msgs = e.response?.data?.errors ?? {};
            const mainMsg = e.response?.data?.message;
            if (Object.keys(msgs).length) setErrores(msgs);
            
            if (mainMsg) {
                setErrorModalMensaje(mainMsg);
            } else {
                toast.error('Error al guardar el reporte');
            }
        } finally {
            setGuardando(false);
        }
    };

    const puedeGuardar = itemsSeleccionados.length > 0 && foto && itemsSeleccionados.every(s => s.pctNuevo !== '');

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
            
            {/* Modal Principal */}
            <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-full sm:max-w-lg max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden relative shadow-2xl shadow-blue-900/20"
                style={{ background: 'rgba(8,18,36,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <h3 className="text-sm font-bold text-white">Registrar avance múltiple</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{viviendaCodigo}</p>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors p-1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>

                {/* Scroll body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 custom-scrollbar">

                    {/* 1. Selección de ítems */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-slate-400">
                                Ítems constructivos <span className="text-red-400">*</span>
                            </label>
                            <span className="text-[10px] text-slate-500">{itemsSeleccionados.length}/3 seleccionados</span>
                        </div>
                        
                        {cargandoItems ? (
                            <div className="h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        ) : (
                            <div className="space-y-3">
                                {/* Lista de seleccionados */}
                                <AnimatePresence>
                                    {itemsSeleccionados.map((sel) => {
                                        const diferencia = (parseFloat(sel.pctNuevo) || 0) - sel.item.porcentaje_avance;
                                        const retrograda = diferencia < 0;
                                        
                                        return (
                                            <motion.div
                                                key={sel.item.id}
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="p-3 rounded-xl relative flex flex-col gap-3"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    
                                                    <button onClick={() => removerItem(sel.item.id)} className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                    </button>
                                                    
                                                    <div className="pr-6">
                                                        <div className="text-xs font-bold text-blue-400">{sel.item.codigo}</div>
                                                        <div className="text-[11px] text-slate-300 leading-snug mt-0.5">{sel.item.nombre}</div>
                                                        <div className="mt-1.5 flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400">Avance: {Math.round(sel.item.porcentaje_avance)}%</span>
                                                            <ChipEstado estado={sel.item.estado_ejecucion} />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg">
                                                        <input
                                                            type="range" min={0} max={100} value={parseFloat(sel.pctNuevo) || 0}
                                                            onChange={e => actualizarPctItem(sel.item.id, e.target.value)}
                                                            className="flex-1 accent-blue-500"
                                                        />
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number" min={0} max={100}
                                                                value={sel.pctNuevo}
                                                                onChange={e => actualizarPctItem(sel.item.id, e.target.value)}
                                                                className="w-14 text-center text-sm font-bold rounded-md px-1 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                                                                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                                                            />
                                                            <span className="text-xs text-slate-500">%</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {retrograda && (
                                                        <p className="text-[10px] font-semibold text-amber-400">
                                                            ⚠ Reduciendo avance {Math.abs(diferencia).toFixed(0)}% (requiere observación)
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>

                                {/* Botón / Buscador para agregar */}
                                {itemsSeleccionados.length < 3 && (
                                    <div ref={dropdownRef} className="relative mt-1">
                                        <button 
                                            onClick={() => setDropdownAbierto(!dropdownAbierto)}
                                            className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 flex items-center justify-center gap-2 transition-all hover:bg-white/5"
                                            style={{ border: `1px dashed ${errores.item ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.2)'}` }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                            Añadir {itemsSeleccionados.length > 0 ? 'otro ' : ''}ítem
                                        </button>

                                        <AnimatePresence>
                                            {dropdownAbierto && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -5 }}
                                                    className="absolute z-50 left-0 right-0 mt-2 rounded-xl overflow-hidden shadow-2xl"
                                                    style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}>
                                                    <div className="p-2 border-b border-white/10">
                                                        <input
                                                            type="text"
                                                            autoFocus
                                                            placeholder="Buscar por código o nombre..."
                                                            value={busquedaItem}
                                                            onChange={(e) => setBusquedaItem(e.target.value)}
                                                            className="w-full bg-black/20 text-sm text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                                            style={{ border: '1px solid rgba(255,255,255,0.05)' }}
                                                        />
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                                                        {itemsFiltrados.length === 0 ? (
                                                            <div className="px-3 py-4 text-center text-sm text-slate-500">No se encontraron ítems</div>
                                                        ) : (
                                                            itemsFiltrados.map(item => (
                                                                <div
                                                                    key={item.id}
                                                                    onClick={() => agregarItem(item)}
                                                                    className="px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors flex flex-col gap-1 text-slate-300 hover:bg-white/5"
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-bold text-xs text-slate-400">{item.codigo}</span>
                                                                        <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-slate-400">Avance: {Math.round(item.porcentaje_avance)}%</span>
                                                                    </div>
                                                                    <span className="text-[11px] leading-snug">{item.nombre}</span>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        )}
                        {errores.item && <p className="text-[11px] text-red-400 mt-1">{errores.item}</p>}
                        {errores.pct && <p className="text-[11px] text-red-400 mt-1">{errores.pct}</p>}
                    </div>

                    {/* 2. Foto de evidencia (Compartida) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Foto de evidencia <span className="text-red-400">*</span>
                        </label>
                        {fotoPreview ? (
                            <div className="relative rounded-xl overflow-hidden group cursor-pointer"
                                style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                <img src={fotoPreview} alt="preview" className="w-full h-32 object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                                        className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-md mr-2">
                                        Cambiar foto
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setFoto(null); setFotoPreview(null); }}
                                        className="bg-red-500/80 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-md">
                                        Quitar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="w-full h-28 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:bg-white/5"
                                style={{
                                    background: errores.foto ? 'rgba(248,113,113,0.05)' : 'rgba(255,255,255,0.02)',
                                    border: `2px dashed ${errores.foto ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.12)'}`,
                                }}>
                                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                                    <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span className="text-xs text-slate-500">
                                    {errores.foto ? errores.foto : 'Toca para tomar foto o elegir archivo'}
                                </span>
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

                    {/* 3. Observación compartida */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-2">
                            Observación {algunaRetrograda && <span className="text-red-400">* (obligatoria al reducir)</span>}
                        </label>
                        <textarea
                            value={observacion}
                            onChange={e => setObservacion(e.target.value)}
                            rows={3}
                            placeholder={algunaRetrograda ? 'Explica por qué se reduce el avance en los ítems marcados...' : 'Notas sobre los avances (opcional)'}
                            className="w-full rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400/50"
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: `1px solid ${errores.observacion ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.09)'}`,
                            }}
                        />
                        {errores.observacion && <p className="text-[11px] text-red-400 mt-1">{errores.observacion}</p>}
                    </div>

                    {/* Se omitió UI de GPS, se captura automáticamente al guardar */}
                </div>

                {/* Footer */}
                <div className="shrink-0 px-5 py-4 flex gap-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button
                        onClick={onCerrar}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all hover:bg-white/5"
                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={iniciarGuardado}
                        disabled={!puedeGuardar || guardando}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40 shadow-lg shadow-blue-500/20"
                        style={{ background: puedeGuardar && !guardando ? 'linear-gradient(to right, #3b82f6, #2563eb)' : 'rgba(96,165,250,0.2)' }}>
                        {guardando ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Guardando...
                            </span>
                        ) : 'Guardar reporte'}
                    </button>
                </div>

                {/* Animación de Modal de Confirmación */}
                <AnimatePresence>
                    {mostrandoConfirmacion && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-4"
                            style={{ background: 'rgba(8, 18, 36, 0.9)', backdropFilter: 'blur(4px)' }}>
                            <motion.div
                                initial={{ scale: 0.95, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 10 }}
                                className="w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl"
                                style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">¿Confirmar Avances?</h3>
                                <p className="text-xs text-slate-400 mb-5">
                                    Estás a punto de registrar el avance de <span className="font-bold text-white">{itemsSeleccionados.length} {itemsSeleccionados.length === 1 ? 'ítem' : 'ítems'}</span>.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setMostrandoConfirmacion(false)}
                                        className="flex-1 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
                                        Atrás
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30">
                                        Sí, registrar
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Animación de Modal de Error */}
                <AnimatePresence>
                    {errorModalMensaje && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-4"
                            style={{ background: 'rgba(8, 18, 36, 0.9)', backdropFilter: 'blur(4px)' }}>
                            <motion.div
                                initial={{ scale: 0.95, y: 10 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 10 }}
                                className="w-full max-w-sm rounded-2xl p-5 text-center shadow-2xl"
                                style={{ background: '#111827', border: '1px solid rgba(248,113,113,0.3)' }}>
                                <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No se pudo guardar</h3>
                                <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                                    {errorModalMensaje}
                                </p>
                                <button
                                    onClick={() => setErrorModalMensaje(null)}
                                    className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-slate-700 hover:bg-slate-600 transition-colors">
                                    Entendido
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
