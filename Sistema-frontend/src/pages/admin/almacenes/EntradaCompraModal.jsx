import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, ShoppingCart, Check, Package, Search, Camera, MapPin, Image } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import { proveedorService } from '../../../services/proveedorService';
import api from '../../../services/api';

const glassInput = (hasError) =>
    `w-full px-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1 font-medium';

/* ── Material selector ─────────────────────────────────────────────── */
const MaterialSearchSelect = ({ value, onChange, materiales, hasError }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const ref = useRef(null);
    const inputRef = useRef(null);
    const selected = materiales.find(m => String(m.id) === String(value));

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQuery(''); } };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const filtered = query
        ? materiales.filter(m => m.nombre?.toLowerCase().includes(query.toLowerCase()) || m.codigo?.toLowerCase().includes(query.toLowerCase()))
        : materiales;

    return (
        <div ref={ref} className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                <input ref={inputRef} type="text"
                    value={open ? query : (selected ? `${selected.nombre} (${selected.codigo})` : '')}
                    onChange={e => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => { setQuery(''); setOpen(true); }}
                    placeholder="Buscar material por nombre o código…"
                    className={`w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/25
                        focus:outline-none transition-all focus:bg-white/[0.09]
                        ${hasError && !open ? 'border-red-500/60 focus:border-red-500/80' : 'border-white/10 focus:border-violet-400/60'}`}
                />
            </div>
            {open && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-xl overflow-hidden
                    bg-white/[0.08] backdrop-blur-2xl border border-white/15 shadow-2xl shadow-black/40">
                    <div className="max-h-56 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-4 py-5 text-center text-white/30 text-sm">Sin resultados</div>
                        ) : (
                            filtered.map(m => (
                                <button key={m.id} type="button"
                                    onMouseDown={e => e.preventDefault()}
                                    onClick={() => { onChange(String(m.id)); setQuery(''); setOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3
                                        ${String(m.id) === String(value) ? 'bg-violet-500/25 text-violet-200' : 'text-white/80 hover:bg-white/10'}`}>
                                    <span className="truncate">{m.nombre}</span>
                                    <span className="text-white/30 text-xs shrink-0 font-mono">{m.codigo}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Línea de material ─────────────────────────────────────────────── */
const LineaMaterial = ({ linea, idx, onChange, onRemove, materiales, canRemove }) => {
    const material = materiales.find(m => String(m.id) === String(linea.material_id));
    const unidad   = material?.unidad_medida?.simbolo ?? material?.unidadMedida?.simbolo ?? null;
    return (
        <div className="flex items-end gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/8">
            <div className="flex-1 min-w-0">
                <label className={labelCls}>Material</label>
                <MaterialSearchSelect value={linea.material_id} onChange={val => onChange(idx, 'material_id', val)} materiales={materiales} hasError={!linea.material_id} />
            </div>
            <div className="w-28">
                <label className={labelCls}>Cantidad{unidad && <span className="ml-1 text-violet-400/80">({unidad})</span>}</label>
                <input type="number" min="0.0001" step="any" value={linea.cantidad}
                    onChange={e => onChange(idx, 'cantidad', e.target.value)} placeholder="0"
                    className={glassInput(!linea.cantidad || linea.cantidad <= 0)} />
            </div>
            <div className="w-32">
                <label className={labelCls}>Precio unit.</label>
                <input type="number" min="0" step="any" value={linea.precio_unitario}
                    onChange={e => onChange(idx, 'precio_unitario', e.target.value)} placeholder="0.00"
                    className={glassInput(false)} />
            </div>
            <div className="w-28 text-right pb-0.5">
                <label className={labelCls}>Subtotal</label>
                <div className="text-emerald-400 font-mono text-sm pt-2">
                    {((linea.cantidad || 0) * (linea.precio_unitario || 0)).toFixed(2)}
                </div>
            </div>
            <button onClick={() => onRemove(idx)} disabled={!canRemove}
                className="mb-0.5 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    );
};

/* ── Tarjeta de foto capturada ─────────────────────────────────────── */
const FotoCard = ({ foto, idx, onRemove }) => (
    <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]">
        <img src={foto.preview} alt={`Foto ${idx + 1}`} className="w-full h-24 object-cover" />
        {foto.latitud && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                <span className="text-white/70 text-[9px] truncate">{foto.latitud.toFixed(5)}, {foto.longitud.toFixed(5)}</span>
            </div>
        )}
        <button type="button" onClick={() => onRemove(idx)}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <X className="w-3 h-3" />
        </button>
    </div>
);

/* ── Modal principal ───────────────────────────────────────────────── */
export default function EntradaCompraModal({ almacen, onClose, onGuardado }) {
    const hoy = new Date().toISOString().split('T')[0];
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({ proveedor_id: '', proveedor_nombre: '', fecha_factura: hoy, notas: '' });
    const [lineas, setLineas]         = useState([{ material_id: '', cantidad: '', precio_unitario: '' }]);
    const [fotos, setFotos]           = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loadingProvs, setLoadingProvs] = useState(true);
    const [geoLoading, setGeoLoading]   = useState(false);
    const [saving, setSaving]           = useState(false);

    useEffect(() => {
        api.get('/materiales', { params: { per_page: 500, activo: 1 } })
           .then(r => setMateriales(r.data?.data?.data || r.data?.data || r.data || [])).catch(() => {});
        proveedorService.listar({ estado: 'activo', per_page: 500 })
           .then(r => setProveedores(r.data?.data?.data ?? r.data?.data ?? [])).catch(() => {}).finally(() => setLoadingProvs(false));
    }, [almacen.id]);

    const agregarLinea = () => setLineas(prev => [...prev, { material_id: '', cantidad: '', precio_unitario: '' }]);
    const cambiarLinea = (idx, campo, valor) => setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
    const quitarLinea  = (idx) => setLineas(prev => prev.filter((_, i) => i !== idx));
    const total = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0), 0);

    /* ── Captura de foto ── */
    const capturarGeo = () => new Promise((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        setGeoLoading(true);
        navigator.geolocation.getCurrentPosition(
            pos => { setGeoLoading(false); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
            ()  => { setGeoLoading(false); resolve(null); },
            { timeout: 8000, enableHighAccuracy: true }
        );
    });

    const handleFotoSeleccionada = useCallback(async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const geo = await capturarGeo();
        for (const file of files) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setFotos(prev => [...prev, {
                    preview:    ev.target.result,
                    base64:     ev.target.result,
                    tipo:       'foto',
                    latitud:    geo?.lat ?? null,
                    longitud:   geo?.lng ?? null,
                    dispositivo: navigator.userAgent.slice(0, 100),
                }]);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    }, []);

    const quitarFoto = (idx) => setFotos(prev => prev.filter((_, i) => i !== idx));

    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        const errores = [];
        lineas.forEach((l, i) => {
            if (!l.material_id) errores.push(`Línea ${i + 1}: seleccione un material.`);
            if (!l.cantidad || parseFloat(l.cantidad) <= 0) errores.push(`Línea ${i + 1}: cantidad inválida.`);
        });
        if (errores.length) { toast.error(errores[0]); return; }

        setSaving(true);
        try {
            await movimientoAlmacenService.registrarEntrada({
                almacen_id:       almacen.id,
                proyecto_id:      almacen.proyecto_id || null,
                proveedor_id:     form.proveedor_id ? parseInt(form.proveedor_id) : null,
                proveedor_nombre: form.proveedor_nombre || null,
                fecha_factura:    form.fecha_factura || null,
                notas:            form.notas || null,
                materiales: lineas.map(l => ({
                    material_id:     parseInt(l.material_id),
                    cantidad:        parseFloat(l.cantidad),
                    precio_unitario: parseFloat(l.precio_unitario) || 0,
                })),
                evidencias: fotos.length ? fotos.map(f => ({
                    tipo:       f.tipo,
                    base64:     f.base64,
                    latitud:    f.latitud,
                    longitud:   f.longitud,
                    dispositivo: f.dispositivo,
                })) : undefined,
            });
            toast.success('Entrada registrada correctamente.');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar entrada.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="animate-modal-in relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden
                    shadow-2xl shadow-black/50 backdrop-blur-2xl
                    bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-white/10 flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">Registrar Entrada (Compra)</h2>
                            <p className="text-white/40 text-xs">{almacen.nombre} · {almacen.codigo}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

                        {/* Proveedor + fecha */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-3 sm:col-span-1">
                                <label className={labelCls}>Proveedor</label>
                                <select value={form.proveedor_id} disabled={loadingProvs}
                                    onChange={e => {
                                        const sel = proveedores.find(p => String(p.id) === e.target.value);
                                        setForm(prev => ({ ...prev, proveedor_id: e.target.value, proveedor_nombre: sel ? sel.razon_social : '' }));
                                    }}
                                    className={glassInput(false)}>
                                    <option value="">{loadingProvs ? 'Cargando…' : 'Sin proveedor'}</option>
                                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.razon_social}</option>)}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <label className={labelCls}>Fecha de entrada</label>
                                <input type="date" value={form.fecha_factura} readOnly className={`${glassInput(false)} cursor-default opacity-70`} />
                            </div>
                        </div>

                        {/* Materiales */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-white/70 text-sm font-semibold flex items-center gap-1.5">
                                    <Package className="w-4 h-4" /> Materiales
                                </h3>
                                <button type="button" onClick={agregarLinea}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs hover:bg-violet-500/30 transition-all">
                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                </button>
                            </div>
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {lineas.map((linea, idx) => (
                                        <motion.div key={idx} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                            <LineaMaterial linea={linea} idx={idx} onChange={cambiarLinea} onRemove={quitarLinea} materiales={materiales} canRemove={lineas.length > 1} />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Notas */}
                        <div>
                            <label className={labelCls}>Notas</label>
                            <textarea rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Observaciones adicionales" className={`${glassInput(false)} resize-none`} />
                        </div>

                        {/* ── Fotografías de la entrada ── */}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-white/70 text-sm font-semibold flex items-center gap-1.5">
                                    <Camera className="w-4 h-4 text-sky-400" />
                                    Fotografías de la Entrada
                                    <span className="text-white/30 font-normal text-xs ml-1">(opcional)</span>
                                </h3>
                                <div className="flex items-center gap-2">
                                    {geoLoading && (
                                        <span className="flex items-center gap-1 text-xs text-amber-400">
                                            <MapPin className="w-3 h-3 animate-pulse" /> Obteniendo GPS…
                                        </span>
                                    )}
                                    <button type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs hover:bg-sky-500/30 transition-all">
                                        <Image className="w-3.5 h-3.5" /> Agregar foto
                                    </button>
                                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                                        multiple className="hidden" onChange={handleFotoSeleccionada} />
                                </div>
                            </div>

                            {fotos.length === 0 ? (
                                <button type="button" onClick={() => fileInputRef.current?.click()}
                                    className="w-full border border-dashed border-white/15 rounded-xl py-6 flex flex-col items-center gap-2 text-white/30 hover:border-sky-500/40 hover:text-sky-400/60 transition-all">
                                    <Camera className="w-8 h-8" />
                                    <span className="text-xs">Toca para tomar o seleccionar fotos</span>
                                    <span className="text-[10px] opacity-60">Las coordenadas GPS se capturan automáticamente</span>
                                </button>
                            ) : (
                                <div className="grid grid-cols-4 gap-2">
                                    <AnimatePresence>
                                        {fotos.map((foto, idx) => (
                                            <motion.div key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                                                <FotoCard foto={foto} idx={idx} onRemove={quitarFoto} />
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="h-24 rounded-xl border border-dashed border-white/15 flex flex-col items-center justify-center gap-1 text-white/30 hover:border-sky-500/40 hover:text-sky-400/60 transition-all">
                                        <Plus className="w-5 h-5" />
                                        <span className="text-[10px]">Más</span>
                                    </button>
                                </div>
                            )}

                            {fotos.some(f => f.latitud) && (
                                <p className="mt-2 text-[10px] text-emerald-400/70 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Coordenadas GPS registradas en {fotos.filter(f => f.latitud).length} foto(s)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                        <div className="text-white/60 text-sm">
                            Total: <span className="text-emerald-400 font-bold font-mono text-base ml-1">Bs. {total.toFixed(2)}</span>
                            {fotos.length > 0 && <span className="ml-3 text-sky-400/70 text-xs">· {fotos.length} foto(s)</span>}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                                Cancelar
                            </button>
                            <button type="submit" disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all">
                                {saving ? 'Guardando…' : <><Check className="w-4 h-4" /> Registrar entrada</>}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
