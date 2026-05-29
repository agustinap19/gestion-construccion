import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Camera, CheckCircle, ChevronRight, ChevronLeft,
         XCircle, Trash2 } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import api from '../../../services/api';

// 4 pasos — sin "Modalidad"
const PASOS = ['Beneficiario', 'Ítem & Materiales', 'Evidencias', 'Confirmar'];

const glassInput = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const NivelConsumo = ({ pct }) => {
    if (pct === null || pct === undefined) return null;
    const nivel = pct >= 9999 ? 'completo' : pct <= 110 ? 'ok' : pct <= 150 ? 'alerta' : 'bloqueado';
    const cfg = {
        completo:  { color: 'text-sky-400',     bg: 'bg-sky-500/20',     icon: '✓', label: 'Ítem completo — sin restante' },
        ok:        { color: 'text-emerald-400',  bg: 'bg-emerald-500/20', icon: '✓', label: `${pct}%` },
        alerta:    { color: 'text-amber-400',    bg: 'bg-amber-500/20',   icon: '⚠', label: `${pct}% — requiere justificación` },
        bloqueado: { color: 'text-red-400',      bg: 'bg-red-500/20',     icon: '✗', label: `${pct}% — requiere aprobación admin` },
    }[nivel];
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
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

    // Paso 1 — Ítem & Materiales
    const [items, setItems]                      = useState([]);
    const [itemSel, setItemSel]                  = useState(null);
    const [lineas, setLineas]                    = useState([]);
    const [materialesDisponibles, setMatDisp]    = useState([]);
    const [loadingLineas, setLoadingLineas]      = useState(false);
    const [validacion, setValidacion]            = useState([]);
    const [loadingVal, setLoadingVal]            = useState(false);

    // Paso 2 — Evidencias
    const [foto, setFoto] = useState(null);
    const [gps, setGps]   = useState(null);

    // Detección automática de modalidad (sin estado — se computa)
    const modalidadDetectada = (() => {
        const validas = lineas.filter(l =>
            l.material_id && parseFloat(l.cantidad) > 0 && l.tiene_stock !== false
        );
        if (validas.length === 0) return 'parcial';
        const todasCubiertas = validas.every(l => {
            if (!l.teorico_restante || l.teorico_restante <= 0) return true;
            return parseFloat(l.cantidad) >= l.teorico_restante * 0.95;
        });
        return todasCubiertas ? 'total' : 'parcial';
    })();

    // ── Effects ──────────────────────────────────────────────────────────────────

    useEffect(() => {
        api.get(`/almacenes/${almacen.id}/materiales-con-stock`)
            .then(r => setMatDisp(r.data?.data || []))
            .catch(() => setMatDisp([]));
    }, [almacen.id]);

    useEffect(() => {
        if (busqBen.length < 2) { setBeneficiarios([]); return; }
        const timer = setTimeout(() => {
            api.get('/beneficiarios', {
                params: { busqueda: busqBen, proyecto_id: almacen.proyecto_id, per_page: 10 }
            }).then(r => setBeneficiarios(r.data?.data?.data || r.data?.data || r.data || []));
        }, 350);
        return () => clearTimeout(timer);
    }, [busqBen, almacen.proyecto_id]);

    useEffect(() => {
        if (!beneficiario) { setItems([]); return; }
        api.get('/presupuesto-items-proyecto', {
            params: { proyecto_id: almacen.proyecto_id, beneficiario_id: beneficiario.id, por_entregar: 1 }
        }).then(r => {
            const raw = r.data?.data?.data ?? r.data?.data ?? r.data ?? [];
            setItems(Array.isArray(raw) ? raw : []);
        }).catch(() => setItems([]));
    }, [beneficiario, almacen.proyecto_id]);

    const seleccionarItem = useCallback((it) => {
        setItemSel(it);
        setLineas([]);
        setValidacion([]);
        setLoadingLineas(true);
        api.get(`/presupuesto-items-proyecto/${it.id}/receta-con-stock/${almacen.id}`)
            .then(r => {
                const data = r.data?.data || [];
                if (data.length > 0) {
                    setLineas(data.map(m => ({
                        material_id:              String(m.material_id),
                        nombre:                   m.nombre || '',
                        unidad:                   m.unidad || '',
                        cantidad:                 '',
                        justificacion:            '',
                        tiene_stock:              m.tiene_stock,
                        item_completo:            m.item_completo,
                        cantidad_disponible_almacen: m.cantidad_disponible_almacen,
                        teorico_restante:         m.teorico_restante,
                    })));
                } else {
                    setLineas([{ material_id: '', cantidad: '', justificacion: '', observacion: '' }]);
                }
            })
            .catch(() => {
                const receta = it.item_constructivo?.receta || [];
                const cantPlan = parseFloat(it.cantidad_planificada || 1);
                setLineas(receta.length > 0
                    ? receta.map(r => ({
                        material_id: String(r.material_id),
                        nombre: r.material?.nombre || '',
                        unidad: r.material?.unidadMedida?.simbolo || r.unidad_material || '',
                        cantidad: '',
                        justificacion: '',
                        tiene_stock: true,
                        item_completo: false,
                        cantidad_disponible_almacen: null,
                        teorico_restante: parseFloat(r.cantidad_por_unidad_base) * cantPlan,
                    }))
                    : [{ material_id: '', cantidad: '', justificacion: '', observacion: '' }]
                );
            })
            .finally(() => setLoadingLineas(false));
    }, [almacen.id]);

    const validarConsumo = useCallback(async () => {
        if (!itemSel || lineas.length === 0 || loadingLineas) return;
        const conCantidad = lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0);
        if (!conCantidad.length) return;
        setLoadingVal(true);
        try {
            const res = await movimientoAlmacenService.validarConsumo({
                presupuesto_item_proyecto_id: itemSel.id,
                materiales: conCantidad.map(l => ({
                    material_id: parseInt(l.material_id),
                    cantidad:    parseFloat(l.cantidad),
                })),
            });
            setValidacion(res.data?.validacion || []);
        } catch { setValidacion([]); }
        finally { setLoadingVal(false); }
    }, [itemSel, lineas, loadingLineas]);

    useEffect(() => {
        const t = setTimeout(validarConsumo, 600);
        return () => clearTimeout(t);
    }, [validarConsumo]);

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

    // ── Validaciones de avance ────────────────────────────────────────────────────

    const hayBloqueado = validacion.some(v => v.nivel === 'bloqueado');
    const hayStockExcedido = lineas.some(l =>
        l.cantidad_disponible_almacen !== null &&
        l.cantidad_disponible_almacen !== undefined &&
        parseFloat(l.cantidad) > 0 &&
        parseFloat(l.cantidad) > l.cantidad_disponible_almacen + 0.001
    );
    const hayEntregaSinStock = lineas.some(l => l.tiene_stock === false && parseFloat(l.cantidad) > 0);
    const hayAlertaSinJustificar = validacion.some(v =>
        v.nivel === 'alerta' &&
        !lineas.find(l => String(l.material_id) === String(v.material_id))?.justificacion?.trim()
    );

    const puedeAvanzar = [
        !!beneficiario,
        !!itemSel &&
            !loadingLineas &&
            lineas.some(l => l.material_id && parseFloat(l.cantidad) > 0) &&
            !hayBloqueado &&
            !hayStockExcedido &&
            !hayEntregaSinStock &&
            !hayAlertaSinJustificar,
        true,  // Evidencias (foto opcional en el paso, se valida al confirmar)
        true,  // Confirmar
    ][paso];

    // ── Submit ────────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!foto) {
            toast.error('Se requiere una foto de evidencia del apilamiento/entrega.');
            return;
        }
        setSaving(true);
        try {
            const evidencias = [{ tipo: 'foto', base64: foto, latitud: gps?.lat, longitud: gps?.lon }];

            const justificacionGlobal = lineas
                .filter(l => l.justificacion?.trim())
                .map(l => `${l.nombre || `Mat#${l.material_id}`}: ${l.justificacion.trim()}`)
                .join(' | ') || null;

            await movimientoAlmacenService.registrarSalidaSocial({
                almacen_id:                   almacen.id,
                beneficiario_id:              beneficiario.id,
                presupuesto_item_proyecto_id: itemSel.id,
                justificacion_sobre_consumo:  justificacionGlobal,
                notas:                        null,
                materiales: lineas
                    .filter(l => l.material_id && parseFloat(l.cantidad) > 0 && l.tiene_stock !== false)
                    .map(l => ({
                        material_id: parseInt(l.material_id),
                        cantidad:    parseFloat(l.cantidad),
                        observacion: l.observacion || null,
                    })),
                evidencias,
            });
            toast.success('Entrega registrada correctamente.');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar entrega.');
        } finally {
            setSaving(false);
        }
    };

    // ── Render pasos ──────────────────────────────────────────────────────────────

    const renderPaso = () => {
        switch (paso) {
            // ── Paso 0: Beneficiario ──────────────────────────────────────────────
            case 0: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5 font-medium">Buscar beneficiario</label>
                        <input value={busqBen} onChange={e => setBusqBen(e.target.value)}
                            placeholder="Nombre, CI o apellido…"
                            className={glassInput(false)} />
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
                                <button type="button" onClick={() => setBeneficiario(null)}
                                    className="ml-auto text-white/40 hover:text-white">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );

            // ── Paso 1: Ítem & Materiales ─────────────────────────────────────────
            case 1: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5 font-medium">Ítem constructivo</label>
                        {items.length === 0 ? (
                            <p className="text-white/30 text-sm">No hay ítems pendientes para este beneficiario.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {items.map(it => (
                                    <button key={it.id} type="button" onClick={() => seleccionarItem(it)}
                                        className={`w-full text-left px-3 py-2 rounded-xl border transition-all
                                            ${itemSel?.id === it.id
                                                ? 'bg-violet-500/20 border-violet-500/40 text-white'
                                                : 'bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.08]'}`}>
                                        <div className="text-sm font-medium">{it.item_constructivo?.nombre}</div>
                                        <div className="text-xs text-white/40 flex gap-3">
                                            <span>{it.item_constructivo?.codigo}</span>
                                            <span>Avance: {it.porcentaje_avance ?? 0}%</span>
                                            <span className="capitalize">{it.estado_ejecucion}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {itemSel && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white/50 text-xs font-semibold">Materiales a entregar</h4>
                                {(loadingVal || loadingLineas) && <span className="text-white/30 text-xs">Cargando…</span>}
                            </div>

                            {materialesDisponibles.length === 0 && (
                                <p className="text-amber-400/70 text-xs mb-2">
                                    Sin stock disponible en este almacén — registra una entrada primero.
                                </p>
                            )}

                            {loadingLineas ? (
                                <div className="text-white/30 text-xs text-center py-4">Cargando materiales del ítem…</div>
                            ) : (
                                <div className="space-y-2">
                                    {lineas.map((l, idx) => {
                                        const val         = validacion.find(v => v.material_id === parseInt(l.material_id));
                                        const sinStock    = l.tiene_stock === false;
                                        const completo    = l.item_completo === true;
                                        const excede      = !sinStock && !completo &&
                                            l.cantidad_disponible_almacen !== null &&
                                            l.cantidad_disponible_almacen !== undefined &&
                                            parseFloat(l.cantidad) > l.cantidad_disponible_almacen + 0.001;
                                        const deshabilitada = sinStock || completo;

                                        return (
                                            <div key={idx} className={`p-2.5 rounded-xl border space-y-1.5
                                                ${sinStock ? 'bg-red-500/5 border-red-500/20' :
                                                  completo ? 'bg-sky-500/5 border-sky-500/20' :
                                                  'bg-white/[0.04] border-white/8'}`}>
                                                <div className="flex gap-2 items-start">
                                                    <div className="flex-1 min-w-0">
                                                        {l.nombre ? (
                                                            <div className="text-white text-sm py-0.5">
                                                                <span>{l.nombre}</span>
                                                                {sinStock && (
                                                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                                                        Sin stock
                                                                    </span>
                                                                )}
                                                                {completo && (
                                                                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                                                        Ítem completo
                                                                    </span>
                                                                )}
                                                                {!sinStock && !completo && l.cantidad_disponible_almacen !== null && (
                                                                    <span className="ml-2 text-white/30 text-xs">
                                                                        ({l.cantidad_disponible_almacen.toFixed(2)} {l.unidad} disp.)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <select value={l.material_id}
                                                                onChange={e => {
                                                                    const mat = materialesDisponibles.find(m => String(m.material_id) === e.target.value);
                                                                    setLineas(prev => prev.map((x, i) => i === idx
                                                                        ? { ...x, material_id: e.target.value, unidad: mat?.unidad || '',
                                                                            cantidad_disponible_almacen: mat?.cantidad_disponible ?? null,
                                                                            tiene_stock: mat ? mat.cantidad_disponible > 0 : false }
                                                                        : x));
                                                                }}
                                                                className={glassInput(false)}>
                                                                <option value="">— Material —</option>
                                                                {materialesDisponibles.map(m => (
                                                                    <option key={m.material_id} value={String(m.material_id)}>
                                                                        {m.nombre} · {m.cantidad_disponible.toFixed(2)} {m.unidad}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        )}
                                                    </div>
                                                    <div className="w-28 shrink-0">
                                                        <input type="number" min="0" step="any"
                                                            disabled={deshabilitada}
                                                            value={l.cantidad}
                                                            onChange={e => setLineas(prev => prev.map((x, i) => i === idx ? { ...x, cantidad: e.target.value } : x))}
                                                            placeholder={l.teorico_restante > 0 ? `Sug: ${parseFloat(l.teorico_restante).toFixed(2)}` : '0'}
                                                            className={`${glassInput(excede)} disabled:opacity-40 disabled:cursor-not-allowed`} />
                                                    </div>
                                                    <button type="button"
                                                        onClick={() => setLineas(prev => prev.filter((_, i) => i !== idx))}
                                                        className="text-white/30 hover:text-red-400 transition-colors pt-2.5 shrink-0">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                {excede && (
                                                    <p className="text-red-400 text-xs">
                                                        {l.nombre}: intentas entregar {parseFloat(l.cantidad).toFixed(2)} pero solo hay {l.cantidad_disponible_almacen.toFixed(2)} {l.unidad} disponibles
                                                    </p>
                                                )}

                                                {val && <NivelConsumo pct={val.porcentaje} />}

                                                {val?.nivel === 'alerta' && (
                                                    <textarea rows={2}
                                                        value={l.justificacion || ''}
                                                        onChange={e => setLineas(prev => prev.map((x, i) => i === idx ? { ...x, justificacion: e.target.value } : x))}
                                                        placeholder={`Justificación para ${l.nombre || 'este material'} (requerida)…`}
                                                        className={`${glassInput(!l.justificacion?.trim())} resize-none text-xs mt-1`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!loadingLineas && (
                                <button type="button"
                                    onClick={() => setLineas(prev => [...prev, { material_id: '', cantidad: '', justificacion: '', observacion: '' }])}
                                    className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                                    + Agregar material
                                </button>
                            )}

                            {hayBloqueado && (
                                <div className="flex items-start gap-2 p-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-red-400 text-xs">
                                        La entrega supera el 150% del restante. Requiere aprobación de un administrador antes de continuar.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );

            // ── Paso 2: Evidencias ────────────────────────────────────────────────
            case 2: return (
                <div className="space-y-4">
                    <div>
                        <label className="block text-white/50 text-xs mb-2 font-medium flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" /> Fotografía de evidencia
                        </label>
                        <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-white/20 cursor-pointer hover:bg-white/[0.07] transition-all">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                            {foto ? (
                                <img src={foto} className="w-16 h-16 rounded-lg object-cover" alt="evidencia" />
                            ) : (
                                <div className="text-white/30 text-sm">Tomar foto del apilamiento / receptor…</div>
                            )}
                        </label>
                        {foto && (
                            <button type="button" onClick={() => setFoto(null)}
                                className="mt-1 text-xs text-red-400 hover:text-red-300">Eliminar foto</button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button type="button" onClick={solicitarGps}
                            className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs hover:bg-sky-500/20 transition-all">
                            📍 Capturar GPS
                        </button>
                        {gps && <span className="text-white/40 text-xs">{gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</span>}
                    </div>

                    <p className="text-white/25 text-xs">
                        Las firmas del beneficiario y almacenero se recogen en el reporte PDF impreso.
                    </p>
                </div>
            );

            // ── Paso 3: Confirmar — con modalidad auto-detectada ──────────────────
            case 3: return (
                <div className="space-y-4">
                    <h3 className="text-white/80 font-semibold mb-2">Resumen de entrega</h3>
                    <div className="space-y-3 text-sm">
                        <Row label="Beneficiario" value={`${beneficiario?.nombre} ${beneficiario?.apellido_paterno}`} />
                        <Row label="Ítem" value={itemSel?.item_constructivo?.nombre} />
                        <Row label="Evidencias" value={foto ? 'Foto' : 'Sin foto'} />
                    </div>

                    {/* Modalidad auto-detectada */}
                    <div className={`p-3 rounded-xl border text-sm
                        ${modalidadDetectada === 'total'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-violet-500/10 border-violet-500/30 text-violet-300'}`}>
                        {modalidadDetectada === 'total' ? (
                            <>✓ <strong>Entrega total</strong> — el ítem se marcará como terminado (≥ 95% del teórico restante)</>
                        ) : (
                            <>~ <strong>Entrega parcial</strong> — el avance se actualizará proporcionalmente</>
                        )}
                    </div>

                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                        <h4 className="text-white/50 text-xs font-semibold mb-2">Materiales</h4>
                        {lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0 && l.tiene_stock !== false).map((l, i) => (
                            <div key={i} className="flex justify-between text-xs text-white/70 py-1 border-b border-white/5 last:border-0">
                                <span>{l.nombre || `Material #${l.material_id}`}</span>
                                <span className="font-mono">{l.cantidad} {l.unidad || ''}</span>
                            </div>
                        ))}
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
                    {/* Stepper — 4 pasos */}
                    <div className="flex items-center gap-1">
                        {PASOS.map((p, i) => (
                            <React.Fragment key={i}>
                                <div className={`flex items-center gap-1 ${i <= paso ? 'text-violet-300' : 'text-white/25'}`}>
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                        ${i < paso ? 'bg-violet-500 text-white' : i === paso ? 'bg-violet-500/30 border border-violet-500/60 text-violet-300' : 'bg-white/5 border border-white/15 text-white/30'}`}>
                                        {i < paso ? '✓' : i + 1}
                                    </div>
                                    <span className="text-xs hidden sm:block">{p}</span>
                                </div>
                                {i < PASOS.length - 1 && <div className={`flex-1 h-px ${i < paso ? 'bg-violet-500/50' : 'bg-white/10'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <AnimatePresence mode="wait">
                        <motion.div key={paso}
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
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
        <span className="text-white capitalize">{value ?? '—'}</span>
    </div>
);
