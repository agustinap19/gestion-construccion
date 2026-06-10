import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import beneficiarioService from '../../../services/beneficiarioService';
import { X, AlertTriangle, CheckCircle, Download } from '../../../components/icons/Icons';
import api from '../../../services/api';

/* ─── Badge de estado ────────────────────────────────────────────── */
const EstadoBadge = ({ estado }) => {
    const cfg = {
        completado: { label: 'Completado',  color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
        parcial:    { label: 'Parcial',     color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    }[estado] ?? { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
    return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}>
            {cfg.label}
        </span>
    );
};

/* ─── Fila de ítem en la tabla de preview ────────────────────────── */
const FilaPreview = ({ tipo, item, unidad = '' }) => {
    const cfg = {
        agregar:    { icon: '＋', color: '#34d399', bg: 'rgba(52,211,153,0.07)',  borde: 'rgba(52,211,153,0.2)'  },
        actualizar: { icon: '↑',  color: '#60a5fa', bg: 'rgba(96,165,250,0.07)',  borde: 'rgba(96,165,250,0.2)'  },
        conflicto:  { icon: '⚠',  color: '#fbbf24', bg: 'rgba(251,191,36,0.07)',  borde: 'rgba(251,191,36,0.25)' },
        eliminar:   { icon: '✕',  color: '#f87171', bg: 'rgba(248,113,113,0.07)', borde: 'rgba(248,113,113,0.2)' },
        retener:    { icon: '⊘',  color: '#94a3b8', bg: 'rgba(148,163,184,0.04)', borde: 'rgba(148,163,184,0.15)'},
    }[tipo] ?? { icon: '·', color: '#94a3b8', bg: 'transparent', borde: 'transparent' };

    return (
        <div className="flex items-start gap-3 px-3 py-2 rounded-xl mb-1"
            style={{ background: cfg.bg, border: `1px solid ${cfg.borde}` }}>
            <span className="text-sm font-bold w-5 text-center shrink-0" style={{ color: cfg.color }}>
                {cfg.icon}
            </span>
            <div className="flex-1 min-w-0">
                <span className="text-sm text-white font-medium truncate block">{item.nombre}</span>
                <span className="text-xs text-slate-500 font-mono">{item.codigo}</span>
            </div>
            <div className="text-right shrink-0">
                {tipo === 'agregar' && (
                    <span className="text-xs font-mono text-emerald-400">+ {item.cantidad_nueva}</span>
                )}
                {tipo === 'actualizar' && (
                    <span className="text-xs font-mono text-blue-400">
                        {item.cantidad_actual} → {item.cantidad_final}
                    </span>
                )}
                {tipo === 'conflicto' && (
                    <div className="text-right">
                        <span className="text-xs font-mono text-amber-400 block">mantiene {item.cantidad_final}</span>
                        <span className="text-[10px] text-amber-500/70">nuevo tipo: {item.cantidad_nueva}</span>
                    </div>
                )}
                {tipo === 'eliminar' && (
                    <span className="text-xs font-mono text-red-400">{item.cantidad_actual}</span>
                )}
                {tipo === 'retener' && (
                    <div className="text-right">
                        <span className="text-xs font-mono text-slate-500 block">{item.cantidad_actual}</span>
                        <span className="text-[10px] text-slate-600">con entregas</span>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─── Tab Historial ──────────────────────────────────────────────── */
function TabHistorial({ beneficiarioId, onExportarPdf }) {
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading]     = useState(true);
    const [expandido, setExpandido] = useState(null);

    useEffect(() => {
        beneficiarioService.syncTipologiaHistorial(beneficiarioId)
            .then(setHistorial)
            .catch(() => setHistorial([]))
            .finally(() => setLoading(false));
    }, [beneficiarioId]);

    if (loading) return <div className="py-10 text-center text-slate-500 text-sm">Cargando historial…</div>;

    if (historial.length === 0) return (
        <div className="py-10 text-center text-slate-500 text-sm">
            No hay cambios de tipología registrados para este beneficiario.
        </div>
    );

    return (
        <div className="space-y-2">
            <div className="flex justify-end mb-1">
                <button onClick={onExportarPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    style={{ border: '1px solid rgba(96,165,250,0.3)' }}>
                    <Download size={13} /> Exportar reporte PDF
                </button>
            </div>
            {historial.map(h => (
                <div key={h.id} className="rounded-xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {/* Fila resumen */}
                    <button type="button" onClick={() => setExpandido(expandido === h.id ? null : h.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors">
                        <EstadoBadge estado={h.estado} />
                        <div className="flex-1 min-w-0">
                            <span className="text-white text-sm font-medium">
                                {h.tipo_anterior_nombre || '(sin tipo)'} → {h.tipo_nuevo_nombre}
                            </span>
                            <div className="text-xs text-slate-500 mt-0.5">
                                {new Date(h.fecha).toLocaleString('es-BO')} · {h.actor_nombre}
                                {' · '}<span className={h.modo === 'auto' ? 'text-emerald-500' : 'text-blue-400'}>
                                    {h.modo === 'auto' ? 'automático' : 'manual'}
                                </span>
                            </div>
                        </div>
                        <span className="text-slate-500 text-xs">
                            {expandido === h.id ? '▲' : '▼'}
                        </span>
                    </button>

                    {/* Detalle expandible */}
                    {expandido === h.id && h.resumen && (
                        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05]">
                            {(h.resumen.agregados?.length > 0) && (
                                <div className="mt-3">
                                    <p className="text-emerald-400 text-xs font-semibold mb-1">+ Agregados ({h.resumen.agregados.length})</p>
                                    {h.resumen.agregados.map((it, i) => <FilaPreview key={i} tipo="agregar" item={it} />)}
                                </div>
                            )}
                            {(h.resumen.actualizados?.length > 0) && (
                                <div>
                                    <p className="text-blue-400 text-xs font-semibold mb-1">↑ Actualizados ({h.resumen.actualizados.length})</p>
                                    {h.resumen.actualizados.map((it, i) => <FilaPreview key={i} tipo="actualizar" item={it} />)}
                                </div>
                            )}
                            {(h.resumen.conflictos?.length > 0) && (
                                <div>
                                    <p className="text-amber-400 text-xs font-semibold mb-1">⚠ Sin reducir — tenían entregas ({h.resumen.conflictos.length})</p>
                                    {h.resumen.conflictos.map((it, i) => <FilaPreview key={i} tipo="conflicto" item={it} />)}
                                </div>
                            )}
                            {(h.resumen.eliminados?.length > 0) && (
                                <div>
                                    <p className="text-red-400 text-xs font-semibold mb-1">✕ Eliminados ({h.resumen.eliminados.length})</p>
                                    {h.resumen.eliminados.map((it, i) => <FilaPreview key={i} tipo="eliminar" item={it} />)}
                                </div>
                            )}
                            {(h.resumen.retenidos?.length > 0) && (
                                <div>
                                    <p className="text-slate-400 text-xs font-semibold mb-1">⊘ Retenidos con entregas ({h.resumen.retenidos.length})</p>
                                    {h.resumen.retenidos.map((it, i) => <FilaPreview key={i} tipo="retener" item={it} />)}
                                </div>
                            )}
                            {(h.resumen.sin_cambio > 0) && (
                                <p className="text-slate-500 text-xs px-3">· {h.resumen.sin_cambio} ítem(s) sin cambio</p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ─── Modal principal ────────────────────────────────────────────── */
export default function SyncTipologiaModal({
    beneficiario,
    nuevoTipoId,        // null = solo ver historial
    onClose,
    onSincronizado,
}) {
    const [tab, setTab]         = useState(nuevoTipoId ? 'preview' : 'historial');
    const [preview, setPreview] = useState(null);
    const [loadingPrev, setLoadingPrev] = useState(!!nuevoTipoId);
    const [applying, setApplying]       = useState(false);

    useEffect(() => {
        if (!nuevoTipoId) return;
        setLoadingPrev(true);
        beneficiarioService.syncTipologiaPreview(beneficiario.id, nuevoTipoId)
            .then(setPreview)
            .catch(e => toast.error(e?.response?.data?.message || 'Error al cargar preview'))
            .finally(() => setLoadingPrev(false));
    }, [beneficiario.id, nuevoTipoId]);

    const handleAplicar = async () => {
        if (!nuevoTipoId) return;
        setApplying(true);
        try {
            await beneficiarioService.syncTipologiaAplicar(beneficiario.id, nuevoTipoId);
            toast.success('Tipología sincronizada correctamente.');
            onSincronizado?.();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al aplicar sincronización.');
        } finally { setApplying(false); }
    };

    const handleExportarPdf = async () => {
        try {
            const res = await api.get(
                `/beneficiarios/${beneficiario.id}/historial-tipologia/pdf`,
                { responseType: 'blob' }
            );
            const url  = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href     = url;
            link.download = `historial_tipologia_${beneficiario.codigo_beneficiario ?? beneficiario.id}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('No se pudo generar el PDF.');
        }
    };

    const sinCambios = preview &&
        preview.agregar.length === 0 &&
        preview.actualizar.length === 0 &&
        preview.conflictos.length === 0 &&
        preview.eliminar.length === 0;

    const tabs = [
        ...(nuevoTipoId ? [{ id: 'preview', label: 'Cambios a aplicar' }] : []),
        { id: 'historial', label: 'Historial de cambios' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl shadow-black/50"
                style={{ background: 'rgba(13,17,23,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
                    <div>
                        <h2 className="text-white font-bold text-base">Sincronización de tipología</h2>
                        <p className="text-slate-400 text-xs mt-0.5">
                            {beneficiario.nombre} {beneficiario.apellido_paterno}
                            {preview && ` · ${preview.tipo_anterior_nombre} → ${preview.tipo_nuevo_nombre}`}
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                {tabs.length > 1 && (
                    <div className="flex px-6 pt-3 gap-1 border-b border-white/[0.06]">
                        {tabs.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={`px-4 py-2 text-sm rounded-t-lg font-medium transition-colors ${
                                    tab === t.id ? 'text-white border-b-2 border-violet-400' : 'text-slate-400 hover:text-white'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* ── Tab Preview ── */}
                    {tab === 'preview' && (
                        loadingPrev ? (
                            <div className="py-12 text-center text-slate-500 text-sm">Analizando cambios…</div>
                        ) : !preview ? null : sinCambios ? (
                            <div className="flex flex-col items-center gap-3 py-10">
                                <CheckCircle size={36} className="text-emerald-400" />
                                <p className="text-white font-medium">No hay cambios que aplicar</p>
                                <p className="text-slate-500 text-sm text-center">
                                    La plantilla del nuevo tipo tiene los mismos ítems y cantidades.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Advertencia de conflictos */}
                                {preview.conflictos.length > 0 && (
                                    <div className="flex gap-3 p-3 rounded-xl"
                                        style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)' }}>
                                        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                        <p className="text-amber-300 text-sm">
                                            {preview.conflictos.length} ítem(s) no se pueden reducir porque ya tienen entregas registradas.
                                            Sus cantidades se mantendrán en el valor actual.
                                        </p>
                                    </div>
                                )}

                                {/* Agregar */}
                                {preview.agregar.length > 0 && (
                                    <div>
                                        <p className="text-emerald-400 text-xs font-semibold mb-2">
                                            ＋ Ítems a agregar ({preview.agregar.length})
                                        </p>
                                        {preview.agregar.map((it, i) => <FilaPreview key={i} tipo="agregar" item={it} />)}
                                    </div>
                                )}
                                {/* Actualizar */}
                                {preview.actualizar.length > 0 && (
                                    <div>
                                        <p className="text-blue-400 text-xs font-semibold mb-2">
                                            ↑ Cantidades a actualizar ({preview.actualizar.length})
                                        </p>
                                        {preview.actualizar.map((it, i) => <FilaPreview key={i} tipo="actualizar" item={it} />)}
                                    </div>
                                )}
                                {/* Conflictos */}
                                {preview.conflictos.length > 0 && (
                                    <div>
                                        <p className="text-amber-400 text-xs font-semibold mb-2">
                                            ⚠ Cantidades sin reducir — tienen entregas ({preview.conflictos.length})
                                        </p>
                                        {preview.conflictos.map((it, i) => <FilaPreview key={i} tipo="conflicto" item={it} />)}
                                    </div>
                                )}
                                {/* Eliminar */}
                                {preview.eliminar.filter(e => e.puede_eliminar).length > 0 && (
                                    <div>
                                        <p className="text-red-400 text-xs font-semibold mb-2">
                                            ✕ Ítems a eliminar — sin entregas ({preview.eliminar.filter(e => e.puede_eliminar).length})
                                        </p>
                                        {preview.eliminar.filter(e => e.puede_eliminar).map((it, i) => (
                                            <FilaPreview key={i} tipo="eliminar" item={it} />
                                        ))}
                                    </div>
                                )}
                                {/* Retener (con entregas, no se puede eliminar) */}
                                {preview.eliminar.filter(e => !e.puede_eliminar).length > 0 && (
                                    <div>
                                        <p className="text-slate-400 text-xs font-semibold mb-2">
                                            ⊘ Ítems retenidos — tienen entregas, no se eliminan ({preview.eliminar.filter(e => !e.puede_eliminar).length})
                                        </p>
                                        {preview.eliminar.filter(e => !e.puede_eliminar).map((it, i) => (
                                            <FilaPreview key={i} tipo="retener" item={it} />
                                        ))}
                                    </div>
                                )}
                                {preview.sin_cambio > 0 && (
                                    <p className="text-slate-500 text-xs px-1">· {preview.sin_cambio} ítem(s) sin cambio</p>
                                )}
                            </div>
                        )
                    )}

                    {/* ── Tab Historial ── */}
                    {tab === 'historial' && (
                        <TabHistorial beneficiarioId={beneficiario.id} onExportarPdf={handleExportarPdf} />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
                    <button onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {tab === 'preview' && !applying ? 'Cancelar' : 'Cerrar'}
                    </button>
                    {tab === 'preview' && nuevoTipoId && !sinCambios && (
                        <button onClick={handleAplicar} disabled={applying || loadingPrev}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                            style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)' }}>
                            {applying ? 'Aplicando…' : <>
                                <CheckCircle size={15} /> Confirmar sincronización
                            </>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
