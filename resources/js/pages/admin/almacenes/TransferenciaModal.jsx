import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, ArrowRight, Plus, Trash2, Check, AlertTriangle } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import { almacenService } from '../../../services/almacenService';

const labelCls = 'block text-white/50 text-xs mb-1.5 font-medium';

// Select con fondo sólido para que el dropdown nativo sea legible
const selectCls = (err) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-all
     bg-slate-800 text-white
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-sky-400/60'}`;

const inputCls = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-sky-400/60 focus:bg-white/10'}`;

export default function TransferenciaModal({ almacen, stocks = [], onClose, onGuardado }) {
    const [almacenes, setAlmacenes]   = useState([]);
    const [destinoId, setDestinoId]   = useState('');
    const [lineas, setLineas]         = useState([{ material_id: '', cantidad: '' }]);
    const [notas, setNotas]           = useState('');
    const [saving, setSaving]         = useState(false);

    // Solo materiales con stock > 0 en este almacén
    const materialesDisponibles = stocks.filter(s => parseFloat(s.cantidad) > 0);

    useEffect(() => {
        almacenService.listar({ per_page: 100, estado: 'activo' })
            .then(r => {
                const lista = r.data?.data || r.data || [];
                setAlmacenes((Array.isArray(lista) ? lista : []).filter(a => a.id !== almacen.id));
            })
            .catch(() => {});
    }, [almacen.id]);

    const getStock = (materialId) =>
        materialesDisponibles.find(s => String(s.material?.id) === String(materialId));

    const cambiarLinea = (idx, campo, valor) =>
        setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));

    const quitarLinea = (idx) =>
        setLineas(prev => prev.filter((_, i) => i !== idx));

    const getError = (linea) => {
        if (!linea.material_id || !linea.cantidad) return null;
        const cant = parseFloat(linea.cantidad);
        if (isNaN(cant) || cant <= 0) return 'Cantidad inválida';
        const stock = getStock(linea.material_id);
        if (!stock) return null;
        const disponible = parseFloat(stock.cantidad);
        if (cant > disponible) return `Máx. disponible: ${disponible.toFixed(2)} ${stock.material?.unidadMedida?.simbolo || ''}`;
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destinoId) { toast.error('Seleccione el almacén destino.'); return; }

        const lineasValidas = lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0);
        if (!lineasValidas.length) { toast.error('Agregue al menos un material con cantidad.'); return; }

        for (const l of lineasValidas) {
            const err = getError(l);
            if (err) { toast.error(err); return; }
        }

        setSaving(true);
        try {
            await movimientoAlmacenService.registrarTransferencia({
                almacen_origen_id:  almacen.id,
                almacen_destino_id: parseInt(destinoId),
                proyecto_id:        almacen.proyecto_id || null,
                notas:              notas || null,
                materiales: lineasValidas.map(l => ({
                    material_id: parseInt(l.material_id),
                    cantidad:    parseFloat(l.cantidad),
                })),
            });
            toast.success('Transferencia iniciada (en tránsito).');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="animate-modal-in relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
                    shadow-2xl shadow-black/50 backdrop-blur-2xl
                    bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-sky-500/30 to-blue-500/20 border border-white/10 flex items-center justify-center">
                            <ArrowRight className="w-4 h-4 text-sky-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-sm">Transferencia de Stock</h2>
                            <p className="text-white/40 text-xs">Desde: {almacen.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Destino */}
                    <div>
                        <label className={labelCls}>Almacén destino</label>
                        <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
                            className={selectCls(!destinoId && destinoId !== undefined)}>
                            <option value="" className="bg-slate-800 text-white/50">— Seleccionar almacén —</option>
                            {almacenes.map(a => (
                                <option key={a.id} value={a.id} className="bg-slate-800 text-white">
                                    {a.nombre} ({a.codigo})
                                </option>
                            ))}
                        </select>
                        {almacenes.length === 0 && (
                            <p className="text-white/30 text-xs mt-1">No hay otros almacenes disponibles.</p>
                        )}
                    </div>

                    {/* Materiales */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wide">
                                Materiales a transferir
                            </h4>
                            {materialesDisponibles.length > 0 && (
                                <button type="button"
                                    onClick={() => setLineas(p => [...p, { material_id: '', cantidad: '' }])}
                                    className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200 transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                </button>
                            )}
                        </div>

                        {materialesDisponibles.length === 0 ? (
                            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                <p className="text-amber-300 text-sm">Este almacén no tiene materiales en stock.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lineas.map((l, idx) => {
                                    const stock = getStock(l.material_id);
                                    const disponible = stock ? parseFloat(stock.cantidad) : 0;
                                    const cant = parseFloat(l.cantidad);
                                    const error = getError(l);
                                    const pct = stock && l.cantidad ? Math.min((cant / disponible) * 100, 100) : 0;

                                    return (
                                        <div key={idx} className="p-3 rounded-2xl bg-white/[0.04] border border-white/8 space-y-2.5">
                                            <div className="flex gap-2 items-end">
                                                {/* Selector de material */}
                                                <div className="flex-1">
                                                    <label className={labelCls}>Material</label>
                                                    <select value={l.material_id}
                                                        onChange={e => cambiarLinea(idx, 'material_id', e.target.value)}
                                                        className={selectCls(!l.material_id)}>
                                                        <option value="" className="bg-slate-800 text-white/50">— Seleccionar —</option>
                                                        {materialesDisponibles.map(s => (
                                                            <option key={s.material?.id} value={s.material?.id}
                                                                className="bg-slate-800 text-white">
                                                                {s.material?.nombre}
                                                                {' '}({parseFloat(s.cantidad).toFixed(2)} {s.material?.unidadMedida?.simbolo || ''})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {/* Cantidad */}
                                                <div className="w-32">
                                                    <label className={labelCls}>Cantidad</label>
                                                    <input type="number" min="0.001" step="any"
                                                        value={l.cantidad}
                                                        max={disponible || undefined}
                                                        onChange={e => cambiarLinea(idx, 'cantidad', e.target.value)}
                                                        placeholder="0"
                                                        className={inputCls(!!error)} />
                                                </div>
                                                {/* Quitar */}
                                                <button type="button"
                                                    onClick={() => quitarLinea(idx)}
                                                    disabled={lineas.length <= 1}
                                                    className="mb-0.5 p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Info de stock + barra de progreso */}
                                            {stock && (
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-white/40">
                                                            Disponible: <span className="text-white/70 font-medium">
                                                                {disponible.toFixed(2)} {stock.material?.unidadMedida?.simbolo || ''}
                                                            </span>
                                                        </span>
                                                        {l.cantidad && !error && (
                                                            <span className="text-sky-400 font-medium">
                                                                −{cant.toFixed(2)} → quedan {(disponible - cant).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {l.cantidad && (
                                                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${error ? 'bg-red-500' : 'bg-sky-500'}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Error inline */}
                                            {error && (
                                                <p className="flex items-center gap-1 text-xs text-red-400">
                                                    <AlertTriangle className="w-3 h-3" /> {error}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Notas */}
                    <div>
                        <label className={labelCls}>Notas / Motivo</label>
                        <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                            className={`${inputCls(false)} resize-none`}
                            placeholder="Motivo de la transferencia" />
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving || materialesDisponibles.length === 0}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-medium shadow-lg disabled:opacity-50 hover:from-sky-500 hover:to-blue-600 transition-all">
                        {saving ? 'Registrando…' : <><Check className="w-4 h-4" /> Iniciar transferencia</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
