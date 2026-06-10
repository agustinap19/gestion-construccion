import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Camera, CheckCircle, ChevronRight, ChevronLeft,
         XCircle, Search, Package } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import api from '../../../services/api';

const PASOS = ['Beneficiario', 'Material & Cantidad', 'Ítems', 'Evidencias', 'Confirmar'];

const glassInput = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const getPct = (asignado, restante) => {
    const a = parseFloat(asignado || 0);
    const r = parseFloat(restante || 0);
    if (a === 0) return 0;
    if (r <= 0) return 9999; // ítem ya completo — entrega adicional
    return Math.round((a / r) * 100);
};

// 'extra' = ítem con restante=0, cualquier cantidad es sobre-entrega (requiere justif, no bloquea)
const nivelDePct = (pct, restante) => {
    if (parseFloat(restante) <= 0) return 'extra';
    return pct <= 110 ? 'ok' : pct <= 150 ? 'alerta' : 'bloqueado';
};

const PctBadge = ({ asignado, restante }) => {
    const pct   = getPct(asignado, restante);
    if (pct === 0) return null;
    const nivel = nivelDePct(pct, restante);
    const cfg = {
        ok:        { cls: 'bg-emerald-500/20 text-emerald-400', icon: '✓', label: `${pct}%` },
        alerta:    { cls: 'bg-amber-500/20 text-amber-400',    icon: '⚠', label: `${pct}% — justificación requerida` },
        extra:     { cls: 'bg-amber-500/20 text-amber-400',    icon: '⚠', label: 'Entrega adicional — justificación requerida' },
        bloqueado: { cls: 'bg-red-500/20 text-red-400',        icon: '✗', label: `${pct}% — requiere aprobación admin` },
    }[nivel];
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

export default function EntregaSocialModal({ almacen, onClose, onGuardado }) {
    const [paso, setPaso]     = useState(0);
    const [saving, setSaving] = useState(false);

    // Paso 0 — Beneficiario
    const [beneficiarios, setBeneficiarios] = useState([]);
    const [busqBen, setBusqBen]             = useState('');
    const [beneficiario, setBeneficiario]   = useState(null);

    // Paso 1 — Material + Cantidad
    const [materialesConStock, setMatConStock] = useState([]);
    const [busqMat, setBusqMat]               = useState('');
    const [materialSel, setMaterialSel]       = useState(null);
    const [cantidadEntrega, setCantidad]      = useState('');

    // Paso 2 — Ítems (multi-selección)
    const [itemsPorMaterial, setItemsPorMat]  = useState([]);
    const [loadingItems, setLoadingItems]     = useState(false);
    const [itemsSeleccionados, setItemsSel]   = useState([]);
    // [{...item, cantidadAsignada: "16.00", justificacion: ""}]
    const [justificacionAdicional, setJustAdicional] = useState('');

    // Paso 3 — Evidencias
    const [foto, setFoto] = useState(null);
    const [gps, setGps]   = useState(null);

    // ── Effects ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        api.get(`/almacenes/${almacen.id}/materiales-con-stock`)
            .then(r => setMatConStock(r.data?.data || []))
            .catch(() => setMatConStock([]));
    }, [almacen.id]);

    useEffect(() => {
        if (busqBen.length < 2) { setBeneficiarios([]); return; }
        const t = setTimeout(() => {
            api.get('/beneficiarios', {
                params: { busqueda: busqBen, proyecto_id: almacen.proyecto_id, per_page: 10 }
            }).then(r => setBeneficiarios(r.data?.data?.data || r.data?.data || r.data || []));
        }, 350);
        return () => clearTimeout(t);
    }, [busqBen, almacen.proyecto_id]);

    useEffect(() => {
        // Solo fetchear al entrar a paso 2 — NO borrar al avanzar (modoAdicional lo necesita después)
        if (paso !== 2 || !materialSel || !beneficiario) return;
        setLoadingItems(true);
        api.get(`/almacenes/${almacen.id}/beneficiarios/${beneficiario.id}/material/${materialSel.material_id}/items`)
            .then(r => setItemsPorMat(r.data?.items || []))
            .catch(() => setItemsPorMat([]))
            .finally(() => setLoadingItems(false));
    }, [paso, materialSel, beneficiario, almacen.id]);

    // ── Derived ───────────────────────────────────────────────────────────────────

    const cantNum    = parseFloat(cantidadEntrega) || 0;
    const stockDisp  = parseFloat(materialSel?.cantidad_disponible ?? 0);
    const excedStock = cantNum > stockDisp + 0.001;

    const totalAsignado = useMemo(() =>
        itemsSeleccionados.reduce((sum, it) => sum + (parseFloat(it.cantidadAsignada) || 0), 0),
    [itemsSeleccionados]);

    const cantRestante = Math.max(0, cantNum - totalAsignado);

    const modoAdicional = !loadingItems && itemsPorMaterial.length === 0;

    // isSelected debe estar antes de los derivados que lo usan
    const isSelected = (pip_id) => itemsSeleccionados.some(it => it.pip_id === pip_id);

    // Todos los ítems disponibles que aún no fueron seleccionados
    const itemsDisponibles           = itemsPorMaterial.filter(it => !isSelected(it.pip_id));
    const itemsDisponiblesPendientes = itemsDisponibles.filter(it => parseFloat(it.restante) > 0.001);
    const itemsDisponiblesCompletados= itemsDisponibles.filter(it => parseFloat(it.restante) <= 0.001);

    // Hard block solo cuando restante > 0 y supera 150% sin justificación
    const hayBloqueado = itemsSeleccionados.some(it => {
        const restante = parseFloat(it.restante || 0);
        if (restante <= 0) return false; // ítem completo: es sobre-entrega, no bloqueo duro
        const pct = getPct(it.cantidadAsignada, it.restante);
        return pct > 150 && !it.justificacion?.trim();
    });

    // Justificación pendiente: cualquier consumo >110%, cualquier sobre-entrega (restante=0 con asignado>0)
    const alertaSinJust = itemsSeleccionados.some(it => {
        const restante = parseFloat(it.restante || 0);
        const asignado = parseFloat(it.cantidadAsignada || 0);
        if (!it.justificacion?.trim()) {
            if (restante <= 0 && asignado > 0) return true; // ítem completo → sobre-entrega
            const pct = getPct(it.cantidadAsignada, it.restante);
            if (pct > 110) return true; // alerta o bloqueado
        }
        return false;
    });

    const todoDistribuido = Math.abs(totalAsignado - cantNum) < 0.001 && itemsSeleccionados.length > 0;

    const materialesFiltrados = useMemo(() =>
        materialesConStock.filter(m =>
            busqMat.length < 2 ||
            m.nombre?.toLowerCase().includes(busqMat.toLowerCase()) ||
            m.codigo?.toLowerCase().includes(busqMat.toLowerCase())
        ),
    [materialesConStock, busqMat]);

    const puedeAvanzar = [
        !!beneficiario,
        !!materialSel && cantNum > 0 && !excedStock,
        !loadingItems && (modoAdicional
            ? justificacionAdicional.trim().length > 0
            : todoDistribuido && !hayBloqueado && !alertaSinJust),
        !!foto,
        true,
    ][paso];

    // ── Item selection ────────────────────────────────────────────────────────────

    const toggleItem = (it) => {
        if (isSelected(it.pip_id)) {
            setItemsSel(prev => prev.filter(s => s.pip_id !== it.pip_id));
        } else {
            const restante = parseFloat(it.restante || 0);
            // Si restante > 0: asignar min(restante, pendiente). Si restante = 0: asignar todo lo pendiente (sobre-entrega)
            const autoQty = restante > 0 ? Math.min(restante, cantRestante) : cantRestante;
            setItemsSel(prev => [...prev, {
                ...it,
                cantidadAsignada: autoQty > 0 ? autoQty.toFixed(4).replace(/\.?0+$/, '') : '',
                justificacion: '',
            }]);
        }
    };

    const updateItemField = (pip_id, field, value) => {
        setItemsSel(prev => prev.map(it => it.pip_id === pip_id ? { ...it, [field]: value } : it));
    };

    // ── Helpers ───────────────────────────────────────────────────────────────────

    const seleccionarMaterial = (m) => {
        setMaterialSel(m);
        setCantidad('');
        setItemsSel([]);
        setItemsPorMat([]);
        setJustAdicional('');
    };

    const solicitarGps = () => {
        navigator.geolocation?.getCurrentPosition(
            pos => setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => toast.error('No se pudo obtener la ubicación GPS.')
        );
    };

    const handleFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setFoto(ev.target.result);
        reader.readAsDataURL(file);
    };

    // ── Submit ────────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!foto) { toast.error('Se requiere una foto de evidencia.'); return; }
        setSaving(true);
        try {
            await movimientoAlmacenService.registrarSalidaSocial({
                almacen_id:                  almacen.id,
                beneficiario_id:             beneficiario.id,
                material_id:                 parseInt(materialSel.material_id),
                cantidad_total:              cantNum,
                items_distribucion: modoAdicional ? [] : itemsSeleccionados.map(it => ({
                    presupuesto_item_proyecto_id: it.pip_id ?? it.id,
                    cantidad:      parseFloat(it.cantidadAsignada),
                    justificacion: it.justificacion?.trim() || null,
                })),
                justificacion_sobre_consumo: modoAdicional ? justificacionAdicional.trim() : null,
                notas:                       null,
                evidencias: [{ tipo: 'foto', base64: foto, latitud: gps?.lat, longitud: gps?.lon }],
            });
            toast.success('Entrega registrada correctamente.');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar entrega.');
        } finally { setSaving(false); }
    };

    // ── Render ────────────────────────────────────────────────────────────────────

    const renderPaso = () => {
        switch (paso) {

            // ── Paso 0: Beneficiario ──────────────────────────────────────────────
            case 0: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5 font-medium">Buscar beneficiario</label>
                        <input value={busqBen} onChange={e => setBusqBen(e.target.value)}
                            placeholder="Nombre, CI o apellido…" className={glassInput(false)} />
                    </div>
                    {beneficiarios.length > 0 && (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto">
                            {beneficiarios.map(b => (
                                <button key={b.id} type="button"
                                    onClick={() => { setBeneficiario(b); setBeneficiarios([]); setBusqBen(''); }}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
                                        ${beneficiario?.id === b.id
                                            ? 'bg-violet-500/20 border-violet-500/40 text-white'
                                            : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'}`}>
                                    <div className="font-medium text-sm">{b.nombre_completo || `${b.nombre} ${b.apellido_paterno}`}</div>
                                    <div className="text-xs text-white/40">CI: {b.ci} · {b.tipo_vivienda?.nombre}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    {beneficiario && (
                        <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-violet-400" />
                                <div>
                                    <div className="text-white text-sm font-medium">{beneficiario.nombre} {beneficiario.apellido_paterno}</div>
                                    <div className="text-white/40 text-xs">CI {beneficiario.ci} · {beneficiario.tipo_vivienda?.nombre}</div>
                                </div>
                                <button type="button" onClick={() => { setBeneficiario(null); setItemsPorMat([]); setItemsSel([]); }}
                                    className="ml-auto text-white/40 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );

            // ── Paso 1: Material + Cantidad ───────────────────────────────────────
            case 1: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5 font-medium flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" /> Material a entregar
                        </label>
                        <div className="relative mb-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <input value={busqMat} onChange={e => setBusqMat(e.target.value)}
                                placeholder="Filtrar materiales…"
                                className={`${glassInput(false)} pl-9`} />
                        </div>
                        {materialesFiltrados.length === 0 ? (
                            <p className="text-amber-400/70 text-xs py-2">Sin stock disponible en este almacén.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                {materialesFiltrados.map(m => (
                                    <button key={m.material_id} type="button"
                                        onClick={() => seleccionarMaterial(m)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
                                            ${materialSel?.material_id === m.material_id
                                                ? 'bg-emerald-500/20 border-emerald-500/40 text-white'
                                                : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white'}`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm">{m.nombre}</span>
                                            <span className="text-xs text-emerald-400 font-mono">
                                                {parseFloat(m.cantidad_disponible).toFixed(2)} {m.unidad}
                                            </span>
                                        </div>
                                        {m.codigo && <div className="text-xs text-white/30">{m.codigo}</div>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {materialSel && (
                        <AnimatePresence>
                            <motion.div key="cantidad"
                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}
                                className="space-y-2">
                                <div className="h-px bg-white/10" />
                                <label className="block text-white/50 text-xs font-medium">Cantidad a entregar</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" min="0.01" step="any"
                                        value={cantidadEntrega}
                                        onChange={e => { setCantidad(e.target.value); setItemsSel([]); }}
                                        placeholder="0"
                                        className={`${glassInput(excedStock)} flex-1`}
                                        autoFocus />
                                    <span className="text-white/50 text-sm shrink-0 min-w-[3rem]">{materialSel.unidad}</span>
                                </div>
                                <p className={`text-xs ${excedStock ? 'text-red-400' : 'text-white/30'}`}>
                                    {excedStock
                                        ? `Stock insuficiente — solo hay ${stockDisp.toFixed(2)} ${materialSel.unidad}`
                                        : `Disponible: ${stockDisp.toFixed(2)} ${materialSel.unidad}`}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            );

            // ── Paso 2: Ítems (multi-selección) ──────────────────────────────────
            case 2: return (
                <div className="space-y-4">
                    {/* Header con resumen */}
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-white/80 text-sm font-medium">{materialSel?.nombre}</span>
                        <span className="ml-auto text-emerald-400 font-mono text-sm">{cantNum.toFixed(2)} {materialSel?.unidad}</span>
                    </div>

                    {/* Barra de progreso de distribución */}
                    {!modoAdicional && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs">
                                <span className="text-white/50">Distribuido</span>
                                <span className={totalAsignado > cantNum + 0.001
                                    ? 'text-red-400'
                                    : todoDistribuido ? 'text-emerald-400' : 'text-white/50'}>
                                    {totalAsignado.toFixed(2)} / {cantNum.toFixed(2)} {materialSel?.unidad}
                                    {cantRestante > 0.001 && <span className="text-amber-400 ml-1">— faltan {cantRestante.toFixed(2)}</span>}
                                    {todoDistribuido && <span className="ml-1">✓</span>}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${
                                    totalAsignado > cantNum + 0.001 ? 'bg-red-500' :
                                    todoDistribuido ? 'bg-emerald-500' : 'bg-violet-500'
                                }`} style={{ width: `${Math.min(100, (totalAsignado / cantNum) * 100)}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Modo: sin ítems configurados en absoluto */}
                    {modoAdicional ? (
                        <div className="space-y-3">
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                                <p className="text-amber-300 text-sm font-medium">Sin ítems configurados para este material</p>
                                <p className="text-amber-300/60 text-xs mt-0.5">
                                    No hay ítems asociados. Para registrar esta entrega debes justificarla.
                                </p>
                            </div>
                            <div>
                                <label className="block text-white/50 text-xs mb-1.5 font-medium">
                                    Justificación <span className="text-red-400">*</span>
                                </label>
                                <textarea rows={3}
                                    value={justificacionAdicional}
                                    onChange={e => setJustAdicional(e.target.value)}
                                    placeholder="Motivo de la entrega (merma, ajuste de obra, otro…)"
                                    className={`${glassInput(!justificacionAdicional.trim())} resize-none text-sm`} />
                            </div>
                        </div>
                    ) : loadingItems ? (
                        <div className="text-white/30 text-xs text-center py-6">Buscando ítems…</div>
                    ) : (
                        <div className="space-y-3">

                            {/* ── Ítems seleccionados con sus inputs ── */}
                            {itemsSeleccionados.length > 0 && (
                                <div className="space-y-2">
                                    {itemsSeleccionados.map(it => {
                                        const pct   = getPct(it.cantidadAsignada, it.restante);
                                        const nivel = nivelDePct(pct, it.restante);
                                        return (
                                            <div key={it.pip_id}
                                                className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/35 space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-white text-sm font-medium truncate">{it.item_nombre}</div>
                                                        <div className="text-xs text-white/40 mt-0.5">
                                                            {it.item_codigo}
                                                            {parseFloat(it.restante) > 0.001
                                                                ? ` · restante: ${parseFloat(it.restante).toFixed(2)} ${materialSel?.unidad}`
                                                                : ' · ítem completado'}
                                                        </div>
                                                        {parseFloat(it.cantidad_teorica_total) > 0 && (
                                                            <div className="mt-1.5 space-y-0.5">
                                                                <div className="flex justify-between text-[10px] text-white/25">
                                                                    <span>Entregado anteriormente</span>
                                                                    <span className="text-emerald-400/50 font-mono">
                                                                        {parseFloat(it.ya_entregado || 0).toFixed(2)} / {parseFloat(it.cantidad_teorica_total).toFixed(2)} {materialSel?.unidad}
                                                                    </span>
                                                                </div>
                                                                <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                                    <div className="h-full rounded-full bg-emerald-500/40 transition-all"
                                                                        style={{ width: `${Math.min(100, (parseFloat(it.ya_entregado || 0) / parseFloat(it.cantidad_teorica_total)) * 100)}%` }} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => toggleItem(it)}
                                                        className="text-white/30 hover:text-red-400 transition-colors shrink-0 mt-0.5">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input type="number" min="0.001" step="any"
                                                        value={it.cantidadAsignada}
                                                        onChange={e => updateItemField(it.pip_id, 'cantidadAsignada', e.target.value)}
                                                        className={`${glassInput(nivel === 'bloqueado')} flex-1 text-sm`} />
                                                    <span className="text-white/40 text-xs shrink-0">{materialSel?.unidad}</span>
                                                    <PctBadge asignado={it.cantidadAsignada} restante={it.restante} />
                                                </div>
                                                {(nivel === 'alerta' || nivel === 'extra' || nivel === 'bloqueado') && (
                                                    <textarea rows={2}
                                                        value={it.justificacion || ''}
                                                        onChange={e => updateItemField(it.pip_id, 'justificacion', e.target.value)}
                                                        placeholder={
                                                            nivel === 'extra'     ? 'Justificación requerida (entrega adicional sobre lo planificado)…' :
                                                            nivel === 'bloqueado' ? 'Justificación requerida (supera 150% — se notificará al administrador)…' :
                                                                                    'Justificación requerida (consumo entre 110-150%)…'
                                                        }
                                                        className={`${glassInput(!it.justificacion?.trim())} resize-none text-xs`} />
                                                )}
                                                {nivel === 'bloqueado' && (
                                                    <div className="flex items-center gap-1.5 text-xs text-amber-400/70">
                                                        <XCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                                                        Supera 150% — con justificación se notificará al admin para aprobación
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* ── Excedente: todos los ítems cubiertos pero sobra cantidad ── */}
                            {cantRestante > 0.001 && itemsDisponibles.length === 0 && itemsSeleccionados.length > 0 && (
                                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                                    <p className="text-xs text-amber-300">
                                        <span className="font-medium">Quedan {cantRestante.toFixed(2)} {materialSel?.unidad} sin asignar.</span>
                                        {' '}Agrégalo a uno de los ítems ya seleccionados:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {itemsSeleccionados.map(it => (
                                            <button key={it.pip_id} type="button"
                                                onClick={() => {
                                                    const actual = parseFloat(it.cantidadAsignada || 0);
                                                    updateItemField(it.pip_id, 'cantidadAsignada',
                                                        (actual + cantRestante).toFixed(4).replace(/\.?0+$/, ''));
                                                }}
                                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-500/30 transition-all truncate max-w-[200px]">
                                                + {it.item_codigo}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── Ítems pendientes disponibles ── */}
                            {itemsDisponiblesPendientes.length > 0 && (
                                <div className="space-y-1.5">
                                    {itemsSeleccionados.length === 0 && (
                                        <label className="block text-white/50 text-xs font-medium">
                                            Selecciona ítems y distribuye las {cantNum.toFixed(2)} {materialSel?.unidad}
                                        </label>
                                    )}
                                    <div className="space-y-1.5 max-h-52 overflow-y-auto">
                                        {itemsDisponiblesPendientes.map(it => {
                                            const restante = parseFloat(it.restante || 0);
                                            const preview  = Math.min(restante, cantRestante);
                                            const cubrePct = restante > 0 && preview > 0 ? Math.round((preview / restante) * 100) : 0;
                                            return (
                                                <button key={it.pip_id} type="button"
                                                    onClick={() => toggleItem(it)}
                                                    disabled={cantRestante < 0.001}
                                                    className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
                                                        ${cantRestante < 0.001
                                                            ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                                                            : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-white'}`}>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-sm truncate">{it.item_nombre}</div>
                                                            <div className="text-xs text-white/40 flex gap-2 mt-0.5">
                                                                <span>{it.item_codigo}</span>
                                                                <span>Avance: {it.porcentaje_avance ?? 0}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <div className="text-xs text-white/50 font-mono">
                                                                {restante.toFixed(2)} {materialSel?.unidad} restante
                                                            </div>
                                                            {cantRestante > 0.001 && preview > 0 && (
                                                                <div className={`text-[10px] mt-0.5 ${cubrePct > 110 ? 'text-amber-400' : 'text-emerald-400/70'}`}>
                                                                    asignaría {preview.toFixed(2)} ({cubrePct}%)
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {parseFloat(it.cantidad_teorica_total) > 0 && (
                                                        <div className="mt-1.5 space-y-0.5">
                                                            <div className="flex justify-between text-[10px] text-white/25">
                                                                <span>
                                                                    {parseFloat(it.ya_entregado || 0) > 0
                                                                        ? `${parseFloat(it.ya_entregado).toFixed(2)} entregado`
                                                                        : 'Sin entregas previas'}
                                                                </span>
                                                                <span className="font-mono">total: {parseFloat(it.cantidad_teorica_total).toFixed(2)} {materialSel?.unidad}</span>
                                                            </div>
                                                            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                                <div className="h-full rounded-full bg-emerald-500/50 transition-all"
                                                                    style={{ width: `${Math.min(100, (parseFloat(it.ya_entregado || 0) / parseFloat(it.cantidad_teorica_total)) * 100)}%` }} />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {it.alerta_sin_reporte && (
                                                        <div className="mt-1 text-[10px] text-amber-400">
                                                            ⚠ Entrega previa sin reporte de avance
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* ── Ítems completados (sobre-entrega) — siempre visibles si existen ── */}
                            {itemsDisponiblesCompletados.length > 0 && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-px bg-amber-500/20" />
                                        <span className="text-amber-400/60 text-[10px] font-medium uppercase tracking-wide">
                                            ítems completados — sobre-entrega
                                        </span>
                                        <div className="flex-1 h-px bg-amber-500/20" />
                                    </div>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                        {itemsDisponiblesCompletados.map(it => (
                                            <button key={it.pip_id} type="button"
                                                onClick={() => toggleItem(it)}
                                                disabled={cantRestante < 0.001}
                                                className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all
                                                    ${cantRestante < 0.001
                                                        ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                                                        : 'bg-amber-500/[0.04] border-amber-500/20 text-white/70 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-white'}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="font-medium text-sm truncate">{it.item_nombre}</div>
                                                        <div className="text-xs text-white/40 flex gap-2 mt-0.5">
                                                            <span>{it.item_codigo}</span>
                                                            <span className="text-amber-400/60">ítem completado</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="text-xs text-amber-400/60 font-mono">+ sobre-entrega</div>
                                                        {cantRestante > 0.001 && (
                                                            <div className="text-[10px] mt-0.5 text-amber-400/50">
                                                                asignaría {cantRestante.toFixed(2)} {materialSel?.unidad}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {parseFloat(it.cantidad_teorica_total) > 0 && (
                                                    <div className="mt-1.5 space-y-0.5">
                                                        <div className="flex justify-between text-[10px] text-amber-400/40">
                                                            <span>Entregado</span>
                                                            <span className="font-mono">{parseFloat(it.ya_entregado || 0).toFixed(2)} / {parseFloat(it.cantidad_teorica_total).toFixed(2)} {materialSel?.unidad}</span>
                                                        </div>
                                                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                            <div className="h-full rounded-full bg-emerald-500/60 transition-all" style={{ width: '100%' }} />
                                                        </div>
                                                    </div>
                                                )}
                                                {it.alerta_sin_reporte && (
                                                    <div className="mt-1 text-[10px] text-amber-400">
                                                        ⚠ Entrega previa sin reporte de avance
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            );

            // ── Paso 3: Evidencias ────────────────────────────────────────────────
            case 3: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-2 font-medium flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" /> Fotografía de evidencia
                        </label>
                        <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-white/20 cursor-pointer hover:bg-white/[0.07] transition-all">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                            {foto
                                ? <img src={foto} className="w-16 h-16 rounded-lg object-cover" alt="evidencia" />
                                : <div className="text-white/30 text-sm">Tomar foto del apilamiento / receptor…</div>
                            }
                        </label>
                        {foto && <button type="button" onClick={() => setFoto(null)} className="mt-1 text-xs text-red-400 hover:text-red-300">Eliminar foto</button>}
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={solicitarGps}
                            className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs hover:bg-sky-500/20 transition-all">
                            📍 Capturar GPS
                        </button>
                        {gps && <span className="text-white/40 text-xs">{gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</span>}
                    </div>
                    <p className="text-white/25 text-xs">Las firmas del beneficiario y almacenero se recogen en el reporte PDF impreso.</p>
                </div>
            );

            // ── Paso 4: Confirmar ─────────────────────────────────────────────────
            case 4: return (
                <div className="space-y-4">
                    <h3 className="text-white/80 font-semibold mb-2">Resumen de entrega</h3>
                    <div className="space-y-2 text-sm">
                        <Row label="Beneficiario" value={`${beneficiario?.nombre} ${beneficiario?.apellido_paterno}`} />
                        <Row label="Material" value={`${materialSel?.nombre} — ${cantNum.toFixed(2)} ${materialSel?.unidad}`} />
                        <Row label="Evidencia"   value={foto ? '✓ Foto adjunta' : 'Sin foto'} />
                    </div>

                    {modoAdicional ? (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 space-y-1">
                            <p className="font-medium">Entrega sin ítem vinculado</p>
                            <p className="text-amber-300/70">{justificacionAdicional}</p>
                        </div>
                    ) : (() => {
                        const normales = itemsSeleccionados.filter(it => parseFloat(it.restante) > 0.001);
                        const extras   = itemsSeleccionados.filter(it => parseFloat(it.restante) <= 0.001);
                        return (
                            <div className="space-y-3">
                                {normales.length > 0 && (
                                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                                        <h4 className="text-white/50 text-xs font-semibold mb-2">
                                            Distribución planificada ({normales.length} ítem{normales.length !== 1 ? 's' : ''})
                                        </h4>
                                        {normales.map((it, i) => (
                                            <div key={i} className="flex justify-between text-xs text-white/70 py-1.5 border-b border-white/5 last:border-0">
                                                <span className="truncate mr-2">{it.item_nombre}</span>
                                                <span className="font-mono shrink-0">{parseFloat(it.cantidadAsignada).toFixed(2)} {materialSel?.unidad}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {extras.length > 0 && (
                                    <div className="p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/20">
                                        <h4 className="text-amber-400/80 text-xs font-semibold mb-2">
                                            Excedente en ítems completados ({extras.length} ítem{extras.length !== 1 ? 's' : ''})
                                        </h4>
                                        {extras.map((it, i) => (
                                            <div key={i} className="py-1.5 border-b border-white/5 last:border-0">
                                                <div className="flex justify-between text-xs text-white/70">
                                                    <span className="truncate mr-2">{it.item_nombre}</span>
                                                    <span className="font-mono shrink-0 text-amber-400">{parseFloat(it.cantidadAsignada).toFixed(2)} {materialSel?.unidad}</span>
                                                </div>
                                                {it.justificacion && (
                                                    <p className="text-[10px] text-white/30 mt-0.5 truncate">Motivo: {it.justificacion}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-300">
                        El avance de los ítems debe registrarse manualmente. Esta entrega <strong>no modifica automáticamente el % de avance</strong>.
                    </div>
                </div>
            );

            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="animate-modal-in relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
                    shadow-2xl shadow-black/50 backdrop-blur-2xl
                    bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">

                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-violet-300" />
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-sm">Entrega Social</h2>
                                <p className="text-white/40 text-xs">{almacen.nombre}</p>
                            </div>
                        </div>
                        <button onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {/* Stepper */}
                    <div className="flex items-center gap-0.5">
                        {PASOS.map((p, i) => (
                            <React.Fragment key={i}>
                                <div className={`flex items-center gap-1 ${i <= paso ? 'text-violet-300' : 'text-white/25'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                        ${i < paso ? 'bg-violet-500 text-white' : i === paso ? 'bg-violet-500/30 border border-violet-500/60 text-violet-300' : 'bg-white/5 border border-white/15 text-white/30'}`}>
                                        {i < paso ? '✓' : i + 1}
                                    </div>
                                    <span className="text-[10px] hidden sm:block">{p}</span>
                                </div>
                                {i < PASOS.length - 1 && <div className={`flex-1 h-px mx-0.5 ${i < paso ? 'bg-violet-500/50' : 'bg-white/10'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={paso}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                            {renderPaso()}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex justify-between shrink-0">
                    <button type="button" onClick={() => paso > 0 ? setPaso(p => p - 1) : onClose()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                        <ChevronLeft className="w-4 h-4" />
                        {paso === 0 ? 'Cancelar' : 'Atrás'}
                    </button>

                    {paso < PASOS.length - 1 ? (
                        <button type="button" onClick={() => setPaso(p => p + 1)}
                            disabled={!puedeAvanzar}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-medium disabled:opacity-40 hover:from-violet-500 hover:to-purple-600 transition-all">
                            Siguiente <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-medium shadow-lg disabled:opacity-50 hover:from-emerald-500 hover:to-teal-500 transition-all">
                            {saving ? 'Registrando…' : <><CheckCircle className="w-4 h-4" /> Confirmar entrega</>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

const Row = ({ label, value }) => (
    <div className="flex justify-between border-b border-white/5 pb-1.5">
        <span className="text-white/40">{label}</span>
        <span className="text-white">{value ?? '—'}</span>
    </div>
);
