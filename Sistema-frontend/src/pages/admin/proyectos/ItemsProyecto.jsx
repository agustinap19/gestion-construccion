import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import itemsProyectoService from '../../../services/itemsProyectoService';
import api from '../../../services/api';
import {
    ArrowLeft, Plus, Trash2, Edit, ChevronDown, ChevronRight,
    RefreshCw, AlertTriangle, CheckCircle, X, Save, Eye,
    Package, Layers
} from '../../../components/icons/Icons';

// ── Helpers de estilo ────────────────────────────────────────────────────────

const glass = 'rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm';
const glassInput = (err) =>
    `w-full px-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-violet-400/60'}`;

const BadgeFuente = ({ fuente }) => {
    if (!fuente || fuente === 'global') return null;
    const cfg = fuente === 'vivienda'
        ? { color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30', label: 'Personalizado vivienda' }
        : { color: 'text-violet-400', bg: 'bg-violet-500/15 border-violet-500/30', label: 'Personalizado tipología' };
    return (
        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
            ✦ {cfg.label}
        </span>
    );
};

// ── Modal de Override de Receta ──────────────────────────────────────────────

const OverrideRecetaModal = ({ item, proyectoId, viviendaId, onClose, onGuardado }) => {
    const [materiales, setMateriales] = useState(
        (item.receta || []).map(r => ({
            material_id: r.material_id,
            nombre:      r.nombre || `Material #${r.material_id}`,
            cantidad:    String(r.cantidad_por_unidad_base),
        }))
    );
    const [justificacion, setJustificacion] = useState('');
    const [saving, setSaving] = useState(false);

    const handleGuardar = async () => {
        if (!justificacion.trim() || justificacion.length < 10) {
            toast.error('La justificación debe tener al menos 10 caracteres.');
            return;
        }
        const invalidos = materiales.filter(m => !m.material_id || parseFloat(m.cantidad) < 0);
        if (invalidos.length) { toast.error('Cantidades inválidas.'); return; }

        setSaving(true);
        try {
            const payload = {
                item_constructivo_id: item.item_constructivo?.id ?? item.item_constructivo_id,
                justificacion,
                materiales: materiales.map(m => ({
                    material_id:              parseInt(m.material_id),
                    cantidad_por_unidad_base: parseFloat(m.cantidad),
                })),
            };
            if (viviendaId) {
                await itemsProyectoService.overrideVivienda(proyectoId, { ...payload, vivienda_id: viviendaId });
                toast.success('Receta de vivienda actualizada.');
            } else {
                await itemsProyectoService.overrideTipologia(proyectoId, payload);
                toast.success('Receta de tipología actualizada.');
            }
            onGuardado();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al guardar override.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className={`relative z-10 w-full max-w-lg ${glass} shadow-2xl shadow-black/60`}>
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-semibold text-sm">Editar receta del ítem</h3>
                        <p className="text-white/40 text-xs mt-0.5">
                            {item.item_constructivo?.nombre} ·&nbsp;
                            {viviendaId ? <span className="text-amber-400">Solo esta vivienda</span> : <span className="text-violet-400">Toda la tipología</span>}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4"/></button>
                </div>

                <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                    {materiales.map((m, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <div className="flex-1 text-white/70 text-sm truncate">{m.nombre}</div>
                            <input type="number" min="0" step="any"
                                value={m.cantidad}
                                onChange={e => setMateriales(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))}
                                className={glassInput(false) + ' w-28 text-right'} />
                            <span className="text-white/30 text-xs w-12 truncate">/ u.base</span>
                        </div>
                    ))}
                    <div className="pt-3 border-t border-white/10">
                        <label className="block text-white/50 text-xs mb-1.5">Justificación <span className="text-red-400">*</span></label>
                        <textarea rows={3} value={justificacion}
                            onChange={e => setJustificacion(e.target.value)}
                            placeholder="Motivo del cambio (mín. 10 caracteres)…"
                            className={`${glassInput(!justificacion?.trim())} resize-none text-xs`} />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-medium disabled:opacity-40 transition-all">
                        {saving ? 'Guardando…' : <><Save className="w-3.5 h-3.5"/> Guardar</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Fila de ítem ─────────────────────────────────────────────────────────────

const FilaItem = ({ item, proyectoId, viviendaId, puedeEditarReceta, onRefresh }) => {
    const [expandida, setExpandida]       = useState(false);
    const [editandoCant, setEditandoCant] = useState(false);
    const [nuevaCant, setNuevaCant]       = useState(String(item.cantidad_planificada));
    const [showOverride, setShowOverride] = useState(false);
    const [loadingDelete, setLoadingDelete] = useState(false);

    const hayPersonalizado = item.fuentes_receta?.some(f => f !== 'global');

    const guardarCantidad = async () => {
        if (parseFloat(nuevaCant) <= 0) { toast.error('La cantidad debe ser mayor a 0.'); return; }
        try {
            await itemsProyectoService.actualizarCantidad(proyectoId, item.id, { cantidad_planificada: parseFloat(nuevaCant) });
            toast.success('Cantidad actualizada.');
            setEditandoCant(false);
            onRefresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al actualizar.');
        }
    };

    const handleEliminar = async () => {
        if (!confirm(`¿Eliminar "${item.item_constructivo?.nombre}"? Esta acción no se puede deshacer.`)) return;
        setLoadingDelete(true);
        try {
            await itemsProyectoService.quitarItem(proyectoId, item.id);
            toast.success('Ítem eliminado.');
            onRefresh();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al eliminar.');
        } finally {
            setLoadingDelete(false);
        }
    };

    return (
        <>
            <div className="p-3 rounded-xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.05] transition-all">
                <div className="flex items-center gap-3">
                    {/* Expand receta */}
                    <button onClick={() => setExpandida(e => !e)}
                        className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                        {expandida ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
                    </button>

                    {/* Nombre + badges */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-sm font-medium truncate">
                                {item.item_constructivo?.nombre}
                            </span>
                            {item.es_especial && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                                    Especial
                                </span>
                            )}
                            {hayPersonalizado && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                    ✦ Receta personalizada
                                </span>
                            )}
                        </div>
                        <div className="text-white/35 text-xs mt-0.5 flex gap-2">
                            <span>{item.item_constructivo?.codigo}</span>
                            <span>·</span>
                            <span>{item.item_constructivo?.unidad_base}</span>
                            <span>·</span>
                            <span className="capitalize">{item.estado_ejecucion}</span>
                            <span>·</span>
                            <span>{item.porcentaje_avance ?? 0}% avance</span>
                        </div>
                    </div>

                    {/* Cantidad planificada */}
                    <div className="shrink-0 flex items-center gap-1.5">
                        {editandoCant ? (
                            <>
                                <input type="number" min="0.0001" step="any"
                                    value={nuevaCant}
                                    onChange={e => setNuevaCant(e.target.value)}
                                    autoFocus
                                    className="w-24 px-2 py-1 rounded-lg bg-white/10 border border-violet-400/60 text-white text-sm text-right focus:outline-none" />
                                <button onClick={guardarCantidad} className="text-emerald-400 hover:text-emerald-300">
                                    <CheckCircle className="w-4 h-4"/>
                                </button>
                                <button onClick={() => { setEditandoCant(false); setNuevaCant(String(item.cantidad_planificada)); }}
                                    className="text-red-400 hover:text-red-300">
                                    <X className="w-4 h-4"/>
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setEditandoCant(true)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/70 text-sm hover:border-violet-400/40 hover:text-white transition-all">
                                {item.cantidad_planificada} {item.item_constructivo?.unidad_base}
                                <Edit className="w-3 h-3 ml-1 text-white/30"/>
                            </button>
                        )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-1 shrink-0">
                        {puedeEditarReceta && (
                            <button onClick={() => setShowOverride(true)}
                                title="Editar receta"
                                className="p-1.5 rounded-lg text-white/30 hover:text-violet-400 hover:bg-violet-500/10 transition-all">
                                <Layers className="w-4 h-4"/>
                            </button>
                        )}
                        <button onClick={handleEliminar} disabled={loadingDelete}
                            title="Quitar ítem"
                            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40">
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                </div>

                {/* Receta expandida */}
                <AnimatePresence>
                    {expandida && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-white/8 overflow-hidden">
                            <div className="text-white/40 text-xs font-semibold mb-2">Receta efectiva:</div>
                            {(item.receta || []).length === 0 ? (
                                <p className="text-white/25 text-xs">Sin receta definida.</p>
                            ) : (
                                <div className="space-y-1">
                                    {item.receta.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <span className="text-white/60 flex-1 truncate">{r.nombre}</span>
                                            <span className="text-white/40 font-mono">{r.cantidad_por_unidad_base} {r.unidad} / u.base</span>
                                            <BadgeFuente fuente={r.fuente}/>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showOverride && (
                <OverrideRecetaModal
                    item={item}
                    proyectoId={proyectoId}
                    viviendaId={viviendaId}
                    onClose={() => setShowOverride(false)}
                    onGuardado={() => { setShowOverride(false); onRefresh(); }}
                />
            )}
        </>
    );
};

// ── Página principal ─────────────────────────────────────────────────────────

export default function ItemsProyecto() {
    const { id: proyectoId } = useParams();
    const navigate            = useNavigate();
    const { user }            = useAuth();

    const [proyecto, setProyecto]     = useState(null);
    const [items, setItems]           = useState([]);
    const [viviendas, setViviendas]   = useState([]);
    const [viviendaSel, setViviendaSel] = useState('');
    const [tab, setTab]               = useState('tipologia'); // tipologia | vivienda
    const [loading, setLoading]       = useState(true);
    const [showAgregar, setShowAgregar] = useState(false);
    const [showActualizar, setShowActualizar] = useState(false);
    const [actualizando, setActualizando] = useState(false);

    const esGerente        = user?.permisos?.includes('presupuesto_materiales.bloquear');
    const puedeEditarReceta = user?.permisos?.includes('overrides_receta.aprobar');

    const cargarProyecto = useCallback(async () => {
        try {
            const r = await api.get(`/proyectos/${proyectoId}`);
            setProyecto(r.data?.data ?? r.data);
        } catch { /* silencioso */ }
    }, [proyectoId]);

    const cargarViviendas = useCallback(async () => {
        try {
            const r = await api.get(`/proyectos/${proyectoId}/viviendas`, { params: { per_page: 200 } });
            const raw = r.data?.data?.data ?? r.data?.data ?? r.data ?? [];
            setViviendas(Array.isArray(raw) ? raw : []);
        } catch { setViviendas([]); }
    }, [proyectoId]);

    const cargarItems = useCallback(async () => {
        setLoading(true);
        try {
            const params = tab === 'vivienda' && viviendaSel
                ? { vivienda_id: viviendaSel }
                : tab === 'tipologia'
                    ? {} // todos
                    : {};
            const r = await itemsProyectoService.listar(proyectoId, params);
            setItems(r.data?.data ?? []);
        } catch { setItems([]); }
        finally { setLoading(false); }
    }, [proyectoId, tab, viviendaSel]);

    useEffect(() => { cargarProyecto(); cargarViviendas(); }, [cargarProyecto, cargarViviendas]);
    useEffect(() => { cargarItems(); }, [cargarItems]);

    const handleActualizarRecetas = async () => {
        setActualizando(true);
        try {
            await itemsProyectoService.actualizarRecetas(proyectoId);
            toast.success('Recetas actualizadas. Overrides de vivienda conservados.');
            setShowActualizar(false);
            cargarItems();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al actualizar recetas.');
        } finally {
            setActualizando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 space-y-5">

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(`/dashboard/proyectos/${proyectoId}`)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft className="w-4 h-4"/>
                    </button>
                    <div>
                        <h1 className="text-white font-bold text-lg">Configuración de ítems</h1>
                        <p className="text-white/40 text-xs mt-0.5">
                            {proyecto?.nombre ?? '…'} · {proyecto?.categoria}
                        </p>
                    </div>
                </div>
                {esGerente && (
                    <button onClick={() => setShowActualizar(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm hover:bg-amber-500/25 transition-all">
                        <RefreshCw className="w-4 h-4"/>
                        Actualizar recetas
                    </button>
                )}
            </div>

            {/* Advertencia */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0"/>
                <p className="text-amber-300/70 text-xs">
                    Los cambios en cantidades y recetas afectan el presupuesto consolidado y las sugerencias del modal de entrega.
                    El historial completo queda registrado.
                </p>
            </div>

            {/* ── Desfase sin reporte (Sub-fase E adaptado) ──────────────────── */}
            {(() => {
                const sinReporte = items.filter(it => it.alerta_sin_reporte);
                if (sinReporte.length === 0) return null;
                return (
                    <div className="p-4 rounded-2xl border border-orange-500/30 bg-orange-500/[0.06]">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            <h3 className="text-orange-300 font-semibold text-sm">
                                {sinReporte.length} ítem{sinReporte.length > 1 ? 's' : ''} con materiales entregados y sin reporte de avance (+3 días)
                            </h3>
                        </div>
                        <div className="space-y-1.5">
                            {sinReporte.map(it => {
                                const dias = it.fecha_primera_entrega_material
                                    ? Math.floor((Date.now() - new Date(it.fecha_primera_entrega_material)) / 86400000)
                                    : null;
                                return (
                                    <div key={it.id} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-2">
                                        <div>
                                            <span className="text-white/80 font-medium">{it.item_constructivo?.nombre || it.nombre}</span>
                                            <span className="text-white/30 ml-2">{it.item_constructivo?.codigo}</span>
                                            {it.vivienda?.codigo && <span className="text-white/25 ml-2">· {it.vivienda.codigo}</span>}
                                        </div>
                                        <div className="flex items-center gap-3 text-white/40 shrink-0">
                                            <span>Avance: {parseFloat(it.porcentaje_avance ?? 0).toFixed(0)}%</span>
                                            {dias !== null && (
                                                <span className="text-orange-400">{dias}d sin reporte</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-orange-300/40 text-xs mt-2">
                            Registra el avance en el seguimiento de obra para resolver estas alertas.
                        </p>
                    </div>
                );
            })()}

            {/* Tabs */}
            <div className={`${glass} overflow-hidden`}>
                <div className="flex border-b border-white/10">
                    {[
                        { id: 'tipologia', label: 'Por tipología' },
                        { id: 'vivienda',  label: 'Por vivienda individual' },
                    ].map(t => (
                        <button key={t.id} onClick={() => { setTab(t.id); setViviendaSel(''); }}
                            className={`px-5 py-3 text-sm font-medium transition-all border-b-2
                                ${tab === t.id
                                    ? 'text-violet-300 border-violet-400 bg-violet-500/5'
                                    : 'text-white/50 border-transparent hover:text-white/70'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {/* Selector de vivienda (solo tab vivienda) */}
                    {tab === 'vivienda' && (
                        <div className="mb-5">
                            <label className="block text-white/50 text-xs mb-1.5 font-medium">Seleccionar vivienda</label>
                            <select value={viviendaSel}
                                onChange={e => setViviendaSel(e.target.value)}
                                className={glassInput(false)}>
                                <option value="">— Selecciona una vivienda —</option>
                                {viviendas.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.codigo} {v.beneficiario ? `· ${v.beneficiario?.nombre} ${v.beneficiario?.apellido_paterno}` : '(sin beneficiario)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Lista de ítems */}
                    {loading ? (
                        <div className="text-white/30 text-sm text-center py-8">Cargando ítems…</div>
                    ) : items.length === 0 ? (
                        <div className="text-white/30 text-sm text-center py-8">
                            {tab === 'vivienda' && !viviendaSel
                                ? 'Selecciona una vivienda para ver sus ítems.'
                                : 'No hay ítems en este proyecto todavía.'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => (
                                <FilaItem
                                    key={item.id}
                                    item={item}
                                    proyectoId={proyectoId}
                                    viviendaId={tab === 'vivienda' ? parseInt(viviendaSel) || null : null}
                                    puedeEditarReceta={puedeEditarReceta}
                                    onRefresh={cargarItems}
                                />
                            ))}
                        </div>
                    )}

                    {/* Agregar ítem */}
                    {!loading && (tab === 'tipologia' || (tab === 'vivienda' && viviendaSel)) && (
                        <button onClick={() => setShowAgregar(true)}
                            className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-dashed border-white/20 text-white/50 text-sm hover:border-violet-400/40 hover:text-violet-300 hover:bg-violet-500/5 transition-all w-full justify-center">
                            <Plus className="w-4 h-4"/>
                            Agregar ítem
                        </button>
                    )}
                </div>
            </div>

            {/* Modal confirmar "Actualizar recetas" */}
            {showActualizar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowActualizar(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
                    <div className={`relative z-10 w-full max-w-md ${glass} shadow-2xl shadow-black/60 p-6`}>
                        <h3 className="text-white font-semibold mb-2">Actualizar recetas desde biblioteca</h3>
                        <p className="text-white/50 text-sm mb-4">
                            Se eliminarán los overrides de tipología y se recalculará el presupuesto con la receta global actual.
                            <strong className="text-amber-400"> Los overrides de vivienda individual NO se modificarán.</strong>
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowActualizar(false)}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleActualizarRecetas} disabled={actualizando}
                                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-700 text-white text-sm font-medium disabled:opacity-40 transition-all">
                                {actualizando ? 'Actualizando…' : <><RefreshCw className="w-3.5 h-3.5"/>Confirmar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal agregar ítem */}
            {showAgregar && (
                <AgregarItemModal
                    proyectoId={proyectoId}
                    viviendaId={tab === 'vivienda' ? parseInt(viviendaSel) || null : null}
                    onClose={() => setShowAgregar(false)}
                    onGuardado={() => { setShowAgregar(false); cargarItems(); }}
                />
            )}
        </div>
    );
}

// ── Modal agregar ítem ────────────────────────────────────────────────────────

function AgregarItemModal({ proyectoId, viviendaId, onClose, onGuardado }) {
    const [modo, setModo]           = useState('biblioteca'); // biblioteca | especial
    const [itemId, setItemId]       = useState('');
    const [cantidad, setCantidad]   = useState('1');
    const [itemsLib, setItemsLib]   = useState([]);
    const [busq, setBusq]           = useState('');
    const [saving, setSaving]       = useState(false);

    // Campos para item especial
    const [nombre, setNombre]       = useState('');
    const [unidad, setUnidad]       = useState('');
    const [catId, setCatId]         = useState('');
    const [categorias, setCategorias] = useState([]);

    useEffect(() => {
        api.get('/biblioteca-constructiva', { params: { busqueda: busq, per_page: 50 } })
            .then(r => setItemsLib(r.data?.data?.data ?? r.data?.data ?? r.data ?? []))
            .catch(() => setItemsLib([]));
    }, [busq]);

    useEffect(() => {
        api.get('/biblioteca-constructiva/categorias')
            .then(r => setCategorias(r.data?.data ?? []))
            .catch(() => setCategorias([]));
    }, []);

    const handleGuardar = async () => {
        setSaving(true);
        try {
            const base = { cantidad_planificada: parseFloat(cantidad), vivienda_id: viviendaId };
            if (modo === 'biblioteca') {
                if (!itemId) { toast.error('Selecciona un ítem.'); setSaving(false); return; }
                await itemsProyectoService.agregarItem(proyectoId, { ...base, item_constructivo_id: parseInt(itemId) });
            } else {
                if (!nombre || !unidad || !catId) { toast.error('Completa todos los campos del ítem especial.'); setSaving(false); return; }
                await itemsProyectoService.agregarItem(proyectoId, {
                    ...base,
                    item_especial: { nombre, unidad_base: unidad, categoria_constructiva_id: parseInt(catId) },
                });
            }
            toast.success('Ítem agregado.');
            onGuardado();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al agregar ítem.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"/>
            <div className={`relative z-10 w-full max-w-lg ${glass} shadow-2xl`}>
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-white font-semibold text-sm">Agregar ítem</h3>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-4 h-4"/></button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Modo */}
                    <div className="flex gap-2">
                        {[['biblioteca','De la biblioteca'],['especial','Ítem especial']].map(([m, label]) => (
                            <button key={m} onClick={() => setModo(m)}
                                className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                                    ${modo === m ? 'bg-violet-500/20 border-violet-500/40 text-white' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {modo === 'biblioteca' ? (
                        <>
                            <input value={busq} onChange={e => setBusq(e.target.value)}
                                placeholder="Buscar ítem…" className={glassInput(false)}/>
                            <div className="max-h-48 overflow-y-auto space-y-1">
                                {itemsLib.map(it => (
                                    <button key={it.id} onClick={() => setItemId(String(it.id))}
                                        className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all
                                            ${String(itemId) === String(it.id)
                                                ? 'bg-violet-500/20 border-violet-500/40 text-white'
                                                : 'bg-white/[0.03] border-white/8 text-white/60 hover:bg-white/[0.06]'}`}>
                                        <span className="font-medium">{it.nombre}</span>
                                        <span className="text-white/30 ml-2 text-xs">{it.codigo} · {it.unidad_base}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del ítem especial" className={glassInput(!nombre)}/>
                            <div className="flex gap-2">
                                <input value={unidad} onChange={e => setUnidad(e.target.value)} placeholder="Unidad (m², m³…)" className={`${glassInput(!unidad)} flex-1`}/>
                                <select value={catId} onChange={e => setCatId(e.target.value)} className={`${glassInput(!catId)} flex-1`}>
                                    <option value="">Categoría</option>
                                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-3">
                        <label className="text-white/50 text-xs whitespace-nowrap">Cantidad planificada:</label>
                        <input type="number" min="0.0001" step="any" value={cantidad} onChange={e => setCantidad(e.target.value)} className={`${glassInput(false)} w-32`}/>
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-white/10 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">Cancelar</button>
                    <button onClick={handleGuardar} disabled={saving}
                        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm font-medium disabled:opacity-40 transition-all">
                        {saving ? 'Agregando…' : <><Plus className="w-3.5 h-3.5"/>Agregar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
