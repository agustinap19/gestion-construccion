import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { almacenService } from '../../../services/almacenService';
import { materialService } from '../../../services/materialService';
import { X, ArrowDown, ArrowUp, SlidersHorizontal } from '../../../components/icons/Icons';

const TIPO_META = {
    entrada: { label: 'Registrar Entrada',  color: 'from-emerald-600 to-teal-700',  icon: <ArrowDown />, showPrecio: true },
    salida:  { label: 'Registrar Salida',   color: 'from-rose-600 to-red-700',      icon: <ArrowUp />,   showPrecio: false },
    ajuste:  { label: 'Ajuste de Inventario', color: 'from-amber-600 to-orange-700', icon: <SlidersHorizontal />, showPrecio: false },
};

export default function MovimientoModal({ almacenId, tipo, stockItem, onClose, onGuardado }) {
    const meta  = TIPO_META[tipo];
    const [form, setForm] = useState({
        material_id:     stockItem?.material?.id || '',
        cantidad:        '',
        precio_unitario: '',
        concepto:        '',
        cantidad_real:   stockItem ? Number(stockItem.cantidad).toFixed(2) : '',
        motivo:          '',
    });
    const [materiales, setMateriales] = useState([]);
    const [saving, setSaving]         = useState(false);
    const [errors, setErrors]         = useState({});

    useEffect(() => {
        if (!stockItem) {
            materialService.getAll({ per_page: 200, activo: true }).then(r => {
                setMateriales(r.data?.data || []);
            }).catch(() => {});
        }
    }, [stockItem]);

    const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => { const n = {...p}; delete n[f]; return n; }); };

    const validate = () => {
        const e = {};
        if (!form.material_id) e.material_id = 'Selecciona un material.';
        if (tipo !== 'ajuste') {
            if (!form.cantidad || Number(form.cantidad) <= 0) e.cantidad = 'Cantidad inválida.';
            if (!form.concepto.trim()) e.concepto = 'El concepto es obligatorio.';
        }
        if (tipo === 'entrada' && (!form.precio_unitario || Number(form.precio_unitario) < 0))
            e.precio_unitario = 'Precio inválido.';
        if (tipo === 'ajuste') {
            if (form.cantidad_real === '' || Number(form.cantidad_real) < 0) e.cantidad_real = 'Ingresa la cantidad real.';
            if (!form.motivo.trim()) e.motivo = 'El motivo es obligatorio.';
        }
        return e;
    };

    const handleSubmit = async e => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        try {
            setSaving(true);
            if (tipo === 'entrada') {
                await almacenService.registrarEntrada(almacenId, {
                    material_id:     Number(form.material_id),
                    cantidad:        Number(form.cantidad),
                    precio_unitario: Number(form.precio_unitario),
                    concepto:        form.concepto,
                });
            } else if (tipo === 'salida') {
                await almacenService.registrarSalida(almacenId, {
                    material_id: Number(form.material_id),
                    cantidad:    Number(form.cantidad),
                    concepto:    form.concepto,
                });
            } else {
                await almacenService.ajustar(almacenId, {
                    material_id:   Number(form.material_id),
                    cantidad_real: Number(form.cantidad_real),
                    motivo:        form.motivo,
                });
            }
            toast.success('Movimiento registrado correctamente.');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar movimiento.');
        } finally {
            setSaving(false);
        }
    };

    const inputCls = (field) =>
        `w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white text-sm focus:outline-none transition-all
         ${errors[field] ? 'border-red-500/70' : 'border-white/10 focus:border-violet-500/70'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
                 style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.97),rgba(30,27,75,0.97))',
                          border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-white`}>
                            {React.cloneElement(meta.icon, { className: 'w-4 h-4' })}
                        </div>
                        <h2 className="text-white font-semibold">{meta.label}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {!stockItem && (
                        <div>
                            <label className="block text-slate-300 text-sm mb-1.5">Material <span className="text-red-400">*</span></label>
                            <select value={form.material_id} onChange={e => set('material_id', e.target.value)} className={inputCls('material_id')}>
                                <option value="">— Seleccionar —</option>
                                {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>)}
                            </select>
                            {errors.material_id && <p className="text-red-400 text-xs mt-1">{errors.material_id}</p>}
                        </div>
                    )}
                    {stockItem && (
                        <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                            <div className="text-white font-medium text-sm">{stockItem.material?.nombre}</div>
                            <div className="text-slate-400 text-xs mt-0.5">
                                Disponible: <span className="text-emerald-400 font-medium">{stockItem.cantidad_disponible?.toFixed(2)} {stockItem.material?.unidadMedida?.simbolo}</span>
                            </div>
                        </div>
                    )}

                    {tipo !== 'ajuste' && (
                        <div>
                            <label className="block text-slate-300 text-sm mb-1.5">Cantidad <span className="text-red-400">*</span></label>
                            <input type="number" min="0" step="any" value={form.cantidad}
                                   onChange={e => set('cantidad', e.target.value)}
                                   onKeyDown={e => ['-','e','+'].includes(e.key) && e.preventDefault()}
                                   className={inputCls('cantidad')} />
                            {errors.cantidad && <p className="text-red-400 text-xs mt-1">{errors.cantidad}</p>}
                        </div>
                    )}

                    {tipo === 'entrada' && (
                        <div>
                            <label className="block text-slate-300 text-sm mb-1.5">Precio unitario (Bs) <span className="text-red-400">*</span></label>
                            <input type="number" min="0" step="any" value={form.precio_unitario}
                                   onChange={e => set('precio_unitario', e.target.value)}
                                   onKeyDown={e => ['-','e','+'].includes(e.key) && e.preventDefault()}
                                   className={inputCls('precio_unitario')} />
                            {errors.precio_unitario && <p className="text-red-400 text-xs mt-1">{errors.precio_unitario}</p>}
                        </div>
                    )}

                    {tipo === 'ajuste' && (
                        <>
                            <div>
                                <label className="block text-slate-300 text-sm mb-1.5">Cantidad real en almacén <span className="text-red-400">*</span></label>
                                <input type="number" min="0" step="any" value={form.cantidad_real}
                                       onChange={e => set('cantidad_real', e.target.value)}
                                       onKeyDown={e => ['-','e','+'].includes(e.key) && e.preventDefault()}
                                       className={inputCls('cantidad_real')} />
                                {errors.cantidad_real && <p className="text-red-400 text-xs mt-1">{errors.cantidad_real}</p>}
                            </div>
                            <div>
                                <label className="block text-slate-300 text-sm mb-1.5">Motivo del ajuste <span className="text-red-400">*</span></label>
                                <textarea rows={2} value={form.motivo} onChange={e => set('motivo', e.target.value)}
                                          className={`${inputCls('motivo')} resize-none`} />
                                {errors.motivo && <p className="text-red-400 text-xs mt-1">{errors.motivo}</p>}
                            </div>
                        </>
                    )}

                    {tipo !== 'ajuste' && (
                        <div>
                            <label className="block text-slate-300 text-sm mb-1.5">Concepto <span className="text-red-400">*</span></label>
                            <input value={form.concepto} onChange={e => set('concepto', e.target.value)}
                                   className={inputCls('concepto')} />
                            {errors.concepto && <p className="text-red-400 text-xs mt-1">{errors.concepto}</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose}
                                className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300
                                           hover:bg-white/10 text-sm font-medium transition-all">
                            Cancelar
                        </button>
                        <button type="submit" disabled={saving}
                                className={`px-5 py-2.5 rounded-xl bg-gradient-to-r ${meta.color}
                                            text-white font-medium text-sm disabled:opacity-50 transition-all`}>
                            {saving ? 'Registrando…' : 'Registrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
