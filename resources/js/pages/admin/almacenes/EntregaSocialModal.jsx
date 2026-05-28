import React, { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import SignaturePad from 'signature_pad';
import { X, User, Package, Camera, CheckCircle, ChevronRight, ChevronLeft,
         AlertTriangle, XCircle, Trash2 } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import api from '../../../services/api';

const PASOS = ['Beneficiario', 'Ítem & Materiales', 'Modalidad', 'Evidencias', 'Confirmar'];

const glassInput = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

// Indicador de nivel de consumo
const NivelConsumo = ({ pct }) => {
    if (!pct) return null;
    const nivel = pct <= 110 ? 'ok' : pct <= 150 ? 'alerta' : 'bloqueado';
    const cfg = {
        ok:       { color: 'text-emerald-400', bg: 'bg-emerald-500/20', icon: '✓', label: `${pct}%` },
        alerta:   { color: 'text-amber-400',   bg: 'bg-amber-500/20',   icon: '⚠', label: `${pct}% — requiere justificación` },
        bloqueado:{ color: 'text-red-400',      bg: 'bg-red-500/20',     icon: '✗', label: `${pct}% — requiere aprobación admin` },
    }[nivel];
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
};

// Componente de firma digital con canvas
const FirmaCanvas = ({ onChange }) => {
    const canvasRef = useRef(null);
    const padRef    = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        padRef.current = new SignaturePad(canvasRef.current, {
            backgroundColor: 'rgba(255,255,255,0.02)',
            penColor: '#a78bfa',
        });
        padRef.current.addEventListener('endStroke', () => {
            onChange(padRef.current.toDataURL('image/png'));
        });
        return () => padRef.current?.off();
    }, []);

    const limpiar = () => { padRef.current?.clear(); onChange(null); };

    return (
        <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-white/50 text-xs">Firma digital del receptor</span>
                <button type="button" onClick={limpiar}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                    <Trash2 className="w-3 h-3" /> Limpiar
                </button>
            </div>
            <canvas ref={canvasRef} width={520} height={160}
                className="w-full touch-none cursor-crosshair" />
        </div>
    );
};

export default function EntregaSocialModal({ almacen, onClose, onGuardado }) {
    const [paso, setPaso]                 = useState(0);
    const [saving, setSaving]             = useState(false);

    // Paso 1
    const [beneficiarios, setBeneficiarios] = useState([]);
    const [busqBen, setBusqBen]             = useState('');
    const [beneficiario, setBeneficiario]   = useState(null);
    const [avance, setAvance]               = useState(null);

    // Paso 2
    const [items, setItems]             = useState([]);
    const [itemSel, setItemSel]         = useState(null);
    const [lineas, setLineas]           = useState([]);
    const [validacion, setValidacion]   = useState([]);
    const [loadingVal, setLoadingVal]   = useState(false);
    const [justificacion, setJustificacion] = useState('');

    // Paso 3
    const [modalidad, setModalidad] = useState('parcial');

    // Paso 4
    const [foto, setFoto]       = useState(null);     // base64
    const [firma, setFirma]     = useState(null);     // base64
    const [gps, setGps]         = useState(null);

    // Cargar beneficiarios por búsqueda
    useEffect(() => {
        if (busqBen.length < 2) { setBeneficiarios([]); return; }
        const timer = setTimeout(() => {
            api.get('/beneficiarios', {
                params: { busqueda: busqBen, proyecto_id: almacen.proyecto_id, per_page: 10 }
            }).then(r => setBeneficiarios(r.data?.data || r.data || []));
        }, 350);
        return () => clearTimeout(timer);
    }, [busqBen, almacen.proyecto_id]);

    // Cargar avance e ítems al seleccionar beneficiario
    useEffect(() => {
        if (!beneficiario) { setAvance(null); setItems([]); return; }
        api.get(`/presupuesto-items-proyecto`, {
            params: { proyecto_id: almacen.proyecto_id, beneficiario_id: beneficiario.id, por_entregar: 1 }
        }).then(r => {
            const data = r.data?.data || r.data || [];
            setItems(Array.isArray(data) ? data : []);
        }).catch(() => setItems([]));
    }, [beneficiario, almacen.proyecto_id]);

    // Validar consumo cuando cambian las líneas
    const validarConsumo = useCallback(async () => {
        if (!itemSel || lineas.length === 0) return;
        const conCantidad = lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0);
        if (!conCantidad.length) return;
        setLoadingVal(true);
        try {
            const res = await movimientoAlmacenService.validarConsumo({
                presupuesto_item_proyecto_id: itemSel.id,
                materiales: conCantidad.map(l => ({ material_id: parseInt(l.material_id), cantidad: parseFloat(l.cantidad) })),
            });
            setValidacion(res.data?.validacion || []);
        } catch { setValidacion([]); }
        finally { setLoadingVal(false); }
    }, [itemSel, lineas]);

    useEffect(() => {
        const t = setTimeout(validarConsumo, 600);
        return () => clearTimeout(t);
    }, [validarConsumo]);

    // Solicitar GPS
    const solicitarGps = () => {
        navigator.geolocation?.getCurrentPosition(
            pos => setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            () => toast.error('No se pudo obtener la ubicación GPS.')
        );
    };

    // Foto desde input file
    const handleFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setFoto(ev.target.result);
        reader.readAsDataURL(file);
    };

    const hayBloqueado = validacion.some(v => v.nivel === 'bloqueado');
    const hayAlerta    = validacion.some(v => v.nivel === 'alerta');

    const puedeAvanzar = [
        !!beneficiario,
        !!itemSel && lineas.some(l => l.material_id && parseFloat(l.cantidad) > 0) && !hayBloqueado,
        true,
        true,
        true,
    ][paso];

    const handleSubmit = async () => {
        if (!foto && !firma) {
            toast.error('Se requiere al menos una foto o firma como evidencia.');
            return;
        }
        setSaving(true);
        try {
            const evidencias = [];
            if (foto) evidencias.push({ tipo: 'foto', base64: foto,
                latitud: gps?.lat, longitud: gps?.lon });
            if (firma) evidencias.push({ tipo: 'firma', base64: firma });

            await movimientoAlmacenService.registrarSalidaSocial({
                almacen_id:                   almacen.id,
                beneficiario_id:              beneficiario.id,
                presupuesto_item_proyecto_id: itemSel.id,
                modalidad_entrega:            modalidad,
                justificacion_sobre_consumo:  justificacion || null,
                notas:                        null,
                materiales: lineas
                    .filter(l => l.material_id && parseFloat(l.cantidad) > 0)
                    .map(l => ({
                        material_id:  parseInt(l.material_id),
                        cantidad:     parseFloat(l.cantidad),
                        observacion:  l.observacion || null,
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

    const renderPaso = () => {
        switch (paso) {
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

            case 1: return (
                <div className="space-y-4">
                    {/* Seleccionar ítem */}
                    <div>
                        <label className="block text-white/50 text-xs mb-1.5 font-medium">Ítem constructivo</label>
                        {items.length === 0 ? (
                            <p className="text-white/30 text-sm">No hay ítems pendientes para este beneficiario.</p>
                        ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                {items.map(it => (
                                    <button key={it.id} type="button" onClick={() => {
                                        setItemSel(it);
                                        setLineas(it.receta_materiales?.map(r => ({
                                            material_id: String(r.material_id),
                                            cantidad: '',
                                            observacion: '',
                                            nombre: r.material?.nombre || '',
                                            sugerido: r.cantidad_sugerida,
                                        })) || [{ material_id: '', cantidad: '', observacion: '' }]);
                                    }}
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

                    {/* Líneas de materiales */}
                    {itemSel && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-white/50 text-xs font-semibold">Materiales a entregar</h4>
                                {loadingVal && <span className="text-white/30 text-xs">Validando…</span>}
                            </div>
                            <div className="space-y-2">
                                {lineas.map((l, idx) => {
                                    const val = validacion.find(v => v.material_id === parseInt(l.material_id));
                                    return (
                                        <div key={idx} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/8 space-y-1.5">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    {l.nombre ? (
                                                        <div className="text-white text-sm py-1">{l.nombre}</div>
                                                    ) : (
                                                        <select value={l.material_id}
                                                            onChange={e => setLineas(prev => prev.map((x, i) => i === idx ? { ...x, material_id: e.target.value } : x))}
                                                            className={glassInput(false)}>
                                                            <option value="">— Material —</option>
                                                        </select>
                                                    )}
                                                </div>
                                                <div className="w-32">
                                                    <input type="number" min="0" step="any"
                                                        value={l.cantidad}
                                                        onChange={e => setLineas(prev => prev.map((x, i) => i === idx ? { ...x, cantidad: e.target.value } : x))}
                                                        placeholder={l.sugerido ? `Sug: ${l.sugerido}` : '0'}
                                                        className={glassInput(false)} />
                                                </div>
                                            </div>
                                            {val && <div className="flex items-center gap-2">
                                                <NivelConsumo pct={val.porcentaje} />
                                            </div>}
                                        </div>
                                    );
                                })}
                            </div>
                            {hayAlerta && (
                                <div>
                                    <label className="block text-amber-400/70 text-xs mt-3 mb-1 font-medium">
                                        Justificación de sobre-consumo (requerida)
                                    </label>
                                    <textarea rows={2} value={justificacion}
                                        onChange={e => setJustificacion(e.target.value)}
                                        placeholder="Explique el motivo del sobre-consumo…"
                                        className={`${glassInput(!justificacion)} resize-none`} />
                                </div>
                            )}
                            {hayBloqueado && (
                                <div className="flex items-start gap-2 p-3 mt-3 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-red-400 text-xs">
                                        La entrega supera el 150% del presupuesto. Requiere aprobación de un administrador antes de continuar.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );

            case 2: return (
                <div className="space-y-4">
                    <h3 className="text-white/60 text-sm">Modalidad de entrega</h3>
                    {['total', 'parcial'].map(m => (
                        <button key={m} type="button" onClick={() => setModalidad(m)}
                            className={`w-full p-4 rounded-2xl border text-left transition-all
                                ${modalidad === m
                                    ? 'bg-violet-500/20 border-violet-500/40'
                                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'}`}>
                            <div className="text-white font-medium capitalize">{m}</div>
                            <div className="text-white/40 text-xs mt-0.5">
                                {m === 'total'
                                    ? 'Se entrega el 100% de los materiales del ítem. El ítem se marcará como terminado.'
                                    : 'Entrega parcial. El avance se actualizará proporcionalmente.'}
                            </div>
                        </button>
                    ))}
                </div>
            );

            case 3: return (
                <div className="space-y-4">
                    {/* Foto */}
                    <div>
                        <label className="block text-white/50 text-xs mb-2 font-medium flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5" /> Fotografía de evidencia
                        </label>
                        <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-white/20 cursor-pointer hover:bg-white/[0.07] transition-all">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                            {foto ? (
                                <img src={foto} className="w-16 h-16 rounded-lg object-cover" alt="evidencia" />
                            ) : (
                                <div className="text-white/30 text-sm">Tomar foto o seleccionar imagen…</div>
                            )}
                        </label>
                        {foto && (
                            <button type="button" onClick={() => setFoto(null)}
                                className="mt-1 text-xs text-red-400 hover:text-red-300">Eliminar foto</button>
                        )}
                    </div>

                    {/* GPS */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={solicitarGps}
                            className="px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs hover:bg-sky-500/20 transition-all">
                            📍 Capturar GPS
                        </button>
                        {gps && <span className="text-white/40 text-xs">{gps.lat.toFixed(5)}, {gps.lon.toFixed(5)}</span>}
                    </div>

                    {/* Firma */}
                    <div>
                        <label className="block text-white/50 text-xs mb-2 font-medium">
                            Firma digital del receptor
                        </label>
                        <FirmaCanvas onChange={setFirma} />
                        {firma && <p className="text-emerald-400 text-xs mt-1">✓ Firma capturada</p>}
                    </div>
                </div>
            );

            case 4: return (
                <div className="space-y-4">
                    <h3 className="text-white/80 font-semibold mb-2">Resumen de entrega</h3>
                    <div className="space-y-3 text-sm">
                        <Row label="Beneficiario" value={`${beneficiario?.nombre} ${beneficiario?.apellido_paterno}`} />
                        <Row label="Ítem" value={itemSel?.item_constructivo?.nombre} />
                        <Row label="Modalidad" value={modalidad} />
                        <Row label="Evidencias"
                            value={[foto && 'Foto', firma && 'Firma'].filter(Boolean).join(' + ') || 'Sin evidencias'} />
                    </div>
                    <div className="mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                        <h4 className="text-white/50 text-xs font-semibold mb-2">Materiales</h4>
                        {lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0).map((l, i) => (
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
                    {/* Stepper */}
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
