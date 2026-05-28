import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, ArrowRight, Plus, Trash2, Check } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import { almacenService } from '../../../services/almacenService';
import api from '../../../services/api';

const glassInput = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-sky-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1.5 font-medium';

export default function TransferenciaModal({ almacen, onClose, onGuardado }) {
    const [almacenes, setAlmacenes] = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [destinoId, setDestinoId] = useState('');
    const [lineas, setLineas]       = useState([{ material_id: '', cantidad: '' }]);
    const [notas, setNotas]         = useState('');
    const [saving, setSaving]       = useState(false);

    useEffect(() => {
        almacenService.listar({ per_page: 100, estado: 'activo' })
            .then(r => setAlmacenes((r.data?.data || []).filter(a => a.id !== almacen.id)));
        api.get('/materiales', { params: { activo: 1, per_page: 500 } })
            .then(r => setMateriales(r.data?.data || r.data || []));
    }, [almacen.id]);

    const cambiarLinea = (idx, campo, valor) =>
        setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!destinoId) { toast.error('Seleccione el almacén destino.'); return; }
        const lineasValidas = lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0);
        if (!lineasValidas.length) { toast.error('Agregue al menos un material con cantidad.'); return; }

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
                    bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10">

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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Destino */}
                    <div>
                        <label className={labelCls}>Almacén destino</label>
                        <select value={destinoId} onChange={e => setDestinoId(e.target.value)}
                            className={glassInput(!destinoId)}>
                            <option value="">— Seleccionar almacén —</option>
                            {almacenes.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre} ({a.codigo})</option>
                            ))}
                        </select>
                    </div>

                    {/* Materiales */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white/50 text-xs font-semibold">Materiales a transferir</h4>
                            <button type="button"
                                onClick={() => setLineas(p => [...p, { material_id: '', cantidad: '' }])}
                                className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
                                <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                        </div>
                        <div className="space-y-2">
                            {lineas.map((l, idx) => (
                                <div key={idx} className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <select value={l.material_id}
                                            onChange={e => cambiarLinea(idx, 'material_id', e.target.value)}
                                            className={glassInput(!l.material_id)}>
                                            <option value="">— Material —</option>
                                            {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-28">
                                        <input type="number" min="0" step="any" value={l.cantidad}
                                            onChange={e => cambiarLinea(idx, 'cantidad', e.target.value)}
                                            placeholder="Cantidad"
                                            className={glassInput(!l.cantidad)} />
                                    </div>
                                    <button type="button"
                                        onClick={() => setLineas(p => p.filter((_, i) => i !== idx))}
                                        disabled={lineas.length <= 1}
                                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className={labelCls}>Notas / Motivo</label>
                        <textarea rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                            className={`${glassInput(false)} resize-none`}
                            placeholder="Motivo de la transferencia" />
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 text-white text-sm font-medium shadow-lg disabled:opacity-50 hover:from-sky-500 hover:to-blue-600 transition-all">
                        {saving ? 'Registrando…' : <><Check className="w-4 h-4" /> Iniciar transferencia</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
