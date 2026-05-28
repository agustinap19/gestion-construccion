import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { X, Plus, Trash2, ShoppingCart, Check, Package } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import { almacenService } from '../../../services/almacenService';
import api from '../../../services/api';

const glassInput = (hasError) =>
    `w-full px-3 py-2 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${hasError ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-400/60 focus:bg-white/10'}`;

const labelCls = 'block text-white/50 text-xs mb-1 font-medium';

const LineaMaterial = ({ linea, idx, onChange, onRemove, materiales, canRemove }) => (
    <div className="flex items-end gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/8">
        <div className="flex-1 min-w-0">
            <label className={labelCls}>Material</label>
            <select value={linea.material_id} onChange={e => onChange(idx, 'material_id', e.target.value)}
                className={glassInput(!linea.material_id)}>
                <option value="">— Seleccionar —</option>
                {materiales.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>
                ))}
            </select>
        </div>
        <div className="w-28">
            <label className={labelCls}>Cantidad</label>
            <input type="number" min="0.0001" step="any" value={linea.cantidad}
                onChange={e => onChange(idx, 'cantidad', e.target.value)}
                placeholder="0"
                className={glassInput(!linea.cantidad || linea.cantidad <= 0)} />
        </div>
        <div className="w-32">
            <label className={labelCls}>Precio unit.</label>
            <input type="number" min="0" step="any" value={linea.precio_unitario}
                onChange={e => onChange(idx, 'precio_unitario', e.target.value)}
                placeholder="0.00"
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

export default function EntradaCompraModal({ almacen, onClose, onGuardado }) {
    const [form, setForm] = useState({
        proveedor_nombre: '',
        numero_factura:   '',
        fecha_factura:    '',
        notas:            '',
    });
    const [lineas, setLineas] = useState([
        { material_id: '', cantidad: '', precio_unitario: '' },
    ]);
    const [materiales, setMateriales] = useState([]);
    const [saving, setSaving]         = useState(false);

    useEffect(() => {
        api.get('/materiales', { params: { per_page: 500, activo: 1 } })
           .then(r => setMateriales(r.data?.data || r.data || []))
           .catch(() => {});
    }, [almacen.id]);

    const agregarLinea = () => setLineas(prev => [
        ...prev, { material_id: '', cantidad: '', precio_unitario: '' }
    ]);

    const cambiarLinea = (idx, campo, valor) => {
        setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));
    };

    const quitarLinea = (idx) => {
        setLineas(prev => prev.filter((_, i) => i !== idx));
    };

    const total = lineas.reduce((s, l) => s + (parseFloat(l.cantidad) || 0) * (parseFloat(l.precio_unitario) || 0), 0);

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
                proveedor_nombre: form.proveedor_nombre || null,
                numero_factura:   form.numero_factura || null,
                fecha_factura:    form.fecha_factura || null,
                notas:            form.notas || null,
                materiales: lineas.map(l => ({
                    material_id:    parseInt(l.material_id),
                    cantidad:       parseFloat(l.cantidad),
                    precio_unitario: parseFloat(l.precio_unitario) || 0,
                })),
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <div className="animate-modal-in relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
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
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body scrollable */}
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">

                        {/* Datos proveedor / factura */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-3 sm:col-span-1">
                                <label className={labelCls}>Proveedor</label>
                                <input value={form.proveedor_nombre}
                                    onChange={e => setForm(p => ({ ...p, proveedor_nombre: e.target.value }))}
                                    placeholder="Nombre del proveedor"
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>N° Factura</label>
                                <input value={form.numero_factura}
                                    onChange={e => setForm(p => ({ ...p, numero_factura: e.target.value }))}
                                    placeholder="001-001-00000001"
                                    className={glassInput(false)} />
                            </div>
                            <div>
                                <label className={labelCls}>Fecha factura</label>
                                <input type="date" value={form.fecha_factura}
                                    onChange={e => setForm(p => ({ ...p, fecha_factura: e.target.value }))}
                                    className={glassInput(false)} />
                            </div>
                        </div>

                        {/* Líneas de materiales */}
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
                                        <motion.div key={idx}
                                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                            <LineaMaterial
                                                linea={linea} idx={idx}
                                                onChange={cambiarLinea} onRemove={quitarLinea}
                                                materiales={materiales}
                                                canRemove={lineas.length > 1}
                                            />
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Notas */}
                        <div>
                            <label className={labelCls}>Notas</label>
                            <textarea rows={2} value={form.notas}
                                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                                placeholder="Observaciones adicionales"
                                className={`${glassInput(false)} resize-none`} />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
                        <div className="text-white/60 text-sm">
                            Total: <span className="text-emerald-400 font-bold font-mono text-base ml-1">
                                Bs. {total.toFixed(2)}
                            </span>
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
