import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { X, Briefcase, Plus, Trash2, Check, Camera, AlertTriangle } from '../../../components/icons/Icons';
import movimientoAlmacenService from '../../../services/movimientoAlmacenService';
import api from '../../../services/api';

const labelCls = 'block text-white/50 text-xs mb-1.5 font-medium';

const selectCls = (err) =>
    `w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none transition-all
     bg-slate-800 text-white
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-amber-400/60'}`;

const inputCls = (err) =>
    `w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border text-white text-sm placeholder-white/30
     focus:outline-none transition-all
     ${err ? 'border-red-500/60' : 'border-white/10 focus:border-amber-400/60 focus:bg-white/10'}`;

export default function EntregaPrivadaModal({ almacen, stocks = [], onClose, onGuardado }) {
    const [form, setForm]         = useState({ receptor_nombre: '', receptor_ci: '', notas: '' });
    const [personal, setPersonal] = useState([]);
    const [personalSel, setPersonalSel] = useState(null);
    const [lineas, setLineas]     = useState([{ material_id: '', cantidad: '' }]);
    const [foto, setFoto]         = useState(null);
    const [saving, setSaving]     = useState(false);

    // Solo materiales con stock > 0
    const materialesDisponibles = stocks.filter(s => parseFloat(s.cantidad) > 0);

    useEffect(() => {
        api.get('/personal', { params: { activo: 1, per_page: 200, proyecto_id: almacen.proyecto_id } })
           .then(r => setPersonal(r.data?.data?.data || r.data?.data || r.data || []))
           .catch(() => {});
    }, [almacen.proyecto_id]);

    const getStock = (materialId) =>
        materialesDisponibles.find(s => String(s.material?.id) === String(materialId));

    const cambiarLinea = (idx, campo, valor) =>
        setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));

    const getError = (linea) => {
        if (!linea.material_id || !linea.cantidad) return null;
        const cant = parseFloat(linea.cantidad);
        if (isNaN(cant) || cant <= 0) return 'Cantidad inválida';
        const stock = getStock(linea.material_id);
        if (!stock) return null;
        const disponible = parseFloat(stock.cantidad);
        if (cant > disponible)
            return `Máx. disponible: ${disponible.toFixed(2)} ${stock.material?.unidadMedida?.simbolo || ''}`;
        return null;
    };

    const handleFoto = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setFoto(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!foto) { toast.error('La foto es requerida para entregas privadas.'); return; }
        const lineasValidas = lineas.filter(l => l.material_id && parseFloat(l.cantidad) > 0);
        if (!lineasValidas.length) { toast.error('Agregue al menos un material con cantidad.'); return; }
        for (const l of lineasValidas) {
            const err = getError(l);
            if (err) { toast.error(err); return; }
        }

        setSaving(true);
        try {
            await movimientoAlmacenService.registrarSalidaPrivada({
                almacen_id:           almacen.id,
                proyecto_id:          almacen.proyecto_id,
                receptor_personal_id: personalSel?.id || null,
                receptor_nombre:      form.receptor_nombre || personalSel?.nombre || null,
                receptor_ci:          form.receptor_ci || null,
                notas:                form.notas || null,
                materiales:           lineasValidas.map(l => ({
                    material_id: parseInt(l.material_id),
                    cantidad:    parseFloat(l.cantidad),
                })),
                evidencias: [{ tipo: 'foto', base64: foto }],
            });
            toast.success('Entrega privada registrada.');
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al registrar.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
                    shadow-2xl shadow-black/50 backdrop-blur-2xl
                    bg-gradient-to-br from-slate-900/95 to-slate-800/95 border border-white/10">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20 border border-white/10 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-amber-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-sm">Entrega Privada (Obrero)</h2>
                            <p className="text-white/40 text-xs">{almacen.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Receptor */}
                    <div>
                        <label className={labelCls}>Personal autorizado</label>
                        <select value={personalSel?.id || ''}
                            onChange={e => setPersonalSel(personal.find(p => p.id === parseInt(e.target.value)) || null)}
                            className={selectCls(false)}>
                            <option value="" className="bg-slate-800 text-white/50">— Seleccionar personal —</option>
                            {personal.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-800 text-white">
                                    {p.nombre} {p.apellido_paterno} · {p.cargo}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Nombre receptor</label>
                            <input value={form.receptor_nombre}
                                onChange={e => setForm(p => ({ ...p, receptor_nombre: e.target.value }))}
                                placeholder="Si no está en lista"
                                className={inputCls(false)} />
                        </div>
                        <div>
                            <label className={labelCls}>CI</label>
                            <input value={form.receptor_ci}
                                onChange={e => setForm(p => ({ ...p, receptor_ci: e.target.value }))}
                                placeholder="Número de CI"
                                className={inputCls(false)} />
                        </div>
                    </div>

                    {/* Materiales */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wide">Materiales</h4>
                            {materialesDisponibles.length > 0 && (
                                <button type="button"
                                    onClick={() => setLineas(p => [...p, { material_id: '', cantidad: '' }])}
                                    className="flex items-center gap-1 text-xs text-amber-300 hover:text-amber-200 transition-colors">
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
                                    const pct = stock && l.cantidad && !isNaN(cant) ? Math.min((cant / disponible) * 100, 100) : 0;

                                    return (
                                        <div key={idx} className="p-3 rounded-2xl bg-white/[0.04] border border-white/8 space-y-2">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <select value={l.material_id}
                                                        onChange={e => cambiarLinea(idx, 'material_id', e.target.value)}
                                                        className={selectCls(!l.material_id)}>
                                                        <option value="" className="bg-slate-800 text-white/50">— Material —</option>
                                                        {materialesDisponibles.map(s => (
                                                            <option key={s.material?.id} value={s.material?.id}
                                                                className="bg-slate-800 text-white">
                                                                {s.material?.nombre}
                                                                {' '}({parseFloat(s.cantidad).toFixed(2)} {s.material?.unidadMedida?.simbolo || ''})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="w-28">
                                                    <input type="number" min="0.001" step="any"
                                                        value={l.cantidad}
                                                        max={disponible || undefined}
                                                        onChange={e => cambiarLinea(idx, 'cantidad', e.target.value)}
                                                        placeholder="Cant."
                                                        className={inputCls(!!error)} />
                                                </div>
                                                <button type="button"
                                                    onClick={() => setLineas(p => p.filter((_, i) => i !== idx))}
                                                    disabled={lineas.length <= 1}
                                                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-30 transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {stock && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-white/40">
                                                            Stock: <span className="text-white/60">{disponible.toFixed(2)} {stock.material?.unidadMedida?.simbolo || ''}</span>
                                                        </span>
                                                        {l.cantidad && !error && (
                                                            <span className="text-amber-400">
                                                                Quedan {(disponible - cant).toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {l.cantidad && (
                                                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all ${error ? 'bg-red-500' : 'bg-amber-400'}`}
                                                                style={{ width: `${pct}%` }} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

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

                    {/* Foto requerida */}
                    <div>
                        <label className={`${labelCls} flex items-center gap-1`}>
                            <Camera className="w-3.5 h-3.5" /> Foto de evidencia <span className="text-red-400">*</span>
                        </label>
                        <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-dashed border-white/20 cursor-pointer hover:bg-white/[0.07] transition-all">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} />
                            {foto
                                ? <img src={foto} className="w-14 h-14 rounded-lg object-cover" alt="evidencia" />
                                : <span className="text-white/30 text-sm">Tomar foto o seleccionar imagen…</span>}
                        </label>
                    </div>

                    <div>
                        <label className={labelCls}>Notas</label>
                        <textarea rows={2} value={form.notas}
                            onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                            className={`${inputCls(false)} resize-none`}
                            placeholder="Observaciones" />
                    </div>
                </form>

                <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 shrink-0">
                    <button type="button" onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={saving || materialesDisponibles.length === 0}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-medium shadow-lg disabled:opacity-50 hover:from-amber-500 hover:to-orange-500 transition-all">
                        {saving ? 'Registrando…' : <><Check className="w-4 h-4" /> Registrar entrega</>}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
