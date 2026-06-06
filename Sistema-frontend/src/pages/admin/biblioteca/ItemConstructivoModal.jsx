import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { bibliotecaConstructivaService } from '../../../services/bibliotecaConstructivaService';
import { materialService } from '../../../services/materialService';
import { X, Plus, Trash2, FlaskConical, Ruler, Tag, Check } from '../../../components/icons/Icons';

const UNIDADES = ['m3', 'm2', 'ml', 'pza', 'glb', 'kg'];
const UNIDAD_LABELS = { m3: 'm³', m2: 'm²', ml: 'ml', pza: 'pza', glb: 'glb', kg: 'kg' };

const glassInput = 'bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm w-full';
const labelCls = 'text-white/50 text-xs mb-1.5 block font-medium';

const emptyIngrediente = () => ({ material_id: '', cantidad_por_unidad_base: '', unidad_material: '', notas: '' });

export default function ItemConstructivoModal({ item, categorias, onClose, onGuardado }) {
    const esEdicion = !!item;

    const [form, setForm] = useState({
        codigo:                    item?.codigo || '',
        nombre:                    item?.nombre || '',
        descripcion:               item?.descripcion || '',
        categoria_constructiva_id: item?.categoria_constructiva_id || '',
        unidad_base:               item?.unidad_base || 'm3',
        precio_unitario_referencial: item?.precio_unitario_referencial || '',
    });
    const [ingredientes, setIngredientes]   = useState([]);
    const [materiales, setMateriales]       = useState([]);
    const [loading, setLoading]             = useState(false);
    const [activeTab, setActiveTab]         = useState('general');
    const [errors, setErrors]               = useState({});

    useEffect(() => {
        materialService.getAll({ per_page: 9999 }).then(r => {
            setMateriales(r.data?.data || r.data || []);
        }).catch(() => {});

        if (esEdicion && item.receta?.length > 0) {
            setIngredientes(item.receta.map(r => ({
                material_id:              String(r.material_id),
                cantidad_por_unidad_base: r.cantidad_por_unidad_base,
                unidad_material:          r.unidad_material || '',
                notas:                    r.notas || '',
            })));
        } else {
            setIngredientes([emptyIngrediente()]);
        }
    }, []);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const agregarIngrediente = () => setIngredientes(prev => [...prev, emptyIngrediente()]);
    const quitarIngrediente = (i) => setIngredientes(prev => prev.filter((_, idx) => idx !== i));
    const setIngrediente = (i, k, v) => setIngredientes(prev => prev.map((ing, idx) => idx === i ? { ...ing, [k]: v } : ing));

    const validate = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Requerido';
        if (!form.unidad_base) e.unidad_base = 'Requerido';
        return e;
    };

    const handleSubmit = async () => {
        const e = validate();
        if (Object.keys(e).length) { setErrors(e); return; }

        setLoading(true);
        try {
            const payload = {
                ...form,
                precio_unitario_referencial: form.precio_unitario_referencial || 0,
                receta: ingredientes.filter(i => i.material_id && i.cantidad_por_unidad_base),
            };

            if (esEdicion) {
                await bibliotecaConstructivaService.actualizarItem(item.id, payload);
                toast.success('Ítem actualizado.');
            } else {
                await bibliotecaConstructivaService.crearItem(payload);
                toast.success('Ítem creado.');
            }
            onGuardado();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Error al guardar.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col
                    rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03]
                    border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                            <FlaskConical className="w-5 h-5 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">
                                {esEdicion ? 'Editar ítem' : 'Nuevo ítem constructivo'}
                            </h2>
                            {esEdicion && <p className="text-white/40 text-xs font-mono">{item.codigo}</p>}
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4">
                    {[{ id: 'general', label: 'General' }, { id: 'receta', label: `Receta (${ingredientes.filter(i => i.material_id).length})` }].map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                                ${activeTab === t.id
                                    ? 'bg-gradient-to-r from-violet-600/60 to-emerald-600/60 text-white'
                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    <AnimatePresence mode="wait">
                        {activeTab === 'general' && (
                            <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Código (auto)</label>
                                        <input value={form.codigo} onChange={e => setField('codigo', e.target.value)}
                                            placeholder="ITM-XXX (auto si vacío)"
                                            className={glassInput} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Unidad base *</label>
                                        <select value={form.unidad_base} onChange={e => setField('unidad_base', e.target.value)}
                                            className={`${glassInput} cursor-pointer ${errors.unidad_base ? 'border-red-500/60' : ''}`}>
                                            {UNIDADES.map(u => <option key={u} value={u}>{UNIDAD_LABELS[u]}</option>)}
                                        </select>
                                        {errors.unidad_base && <p className="text-red-400 text-xs mt-1">{errors.unidad_base}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Nombre *</label>
                                    <input value={form.nombre} onChange={e => { setField('nombre', e.target.value); setErrors(er => ({ ...er, nombre: null })); }}
                                        placeholder="Ej: Columna H°A° 20×20"
                                        className={`${glassInput} ${errors.nombre ? 'border-red-500/60' : ''}`} />
                                    {errors.nombre && <p className="text-red-400 text-xs mt-1">{errors.nombre}</p>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Categoría</label>
                                        <select value={form.categoria_constructiva_id} onChange={e => setField('categoria_constructiva_id', e.target.value)}
                                            className={`${glassInput} cursor-pointer`}>
                                            <option value="">Sin categoría</option>
                                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Precio referencial (Bs)</label>
                                        <input type="number" min="0" step="0.01" value={form.precio_unitario_referencial}
                                            onChange={e => setField('precio_unitario_referencial', e.target.value)}
                                            placeholder="0.00" className={glassInput} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)}
                                        rows={3} placeholder="Descripción técnica del ítem…"
                                        className={`${glassInput} resize-none`} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'receta' && (
                            <motion.div key="receta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                <p className="text-white/40 text-xs mb-4">
                                    Define la cantidad de cada material necesaria por 1 {UNIDAD_LABELS[form.unidad_base] || form.unidad_base} de este ítem.
                                </p>
                                <div className="space-y-3">
                                    {ingredientes.map((ing, i) => (
                                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            className="grid grid-cols-12 gap-2 items-start bg-white/[0.04] rounded-xl p-3 border border-white/8">
                                            <div className="col-span-5">
                                                <label className="text-white/30 text-[10px] block mb-1">Material</label>
                                                <select value={ing.material_id} onChange={e => setIngrediente(i, 'material_id', e.target.value)}
                                                    className="w-full bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-violet-400/60 cursor-pointer">
                                                    <option value="">— Seleccionar —</option>
                                                    {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-white/30 text-[10px] block mb-1">Cantidad / unidad</label>
                                                <input type="number" min="0" step="0.0001" value={ing.cantidad_por_unidad_base}
                                                    onChange={e => setIngrediente(i, 'cantidad_por_unidad_base', e.target.value)}
                                                    placeholder="0.0000" className="w-full bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-violet-400/60" />
                                            </div>
                                            <div className="col-span-3">
                                                <label className="text-white/30 text-[10px] block mb-1">Unidad material</label>
                                                <input value={ing.unidad_material} onChange={e => setIngrediente(i, 'unidad_material', e.target.value)}
                                                    placeholder="m3, kg…" className="w-full bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-violet-400/60" />
                                            </div>
                                            <div className="col-span-1 flex justify-end pt-5">
                                                <button onClick={() => quitarIngrediente(i)}
                                                    className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <button onClick={agregarIngrediente}
                                    className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20
                                    text-white/40 text-sm hover:border-violet-400/40 hover:text-violet-300 transition-all w-full justify-center">
                                    <Plus className="w-4 h-4" /> Agregar material a la receta
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
                    <button onClick={onClose}
                        className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={loading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl
                        bg-gradient-to-r from-violet-600 to-emerald-600 text-white text-sm font-medium
                        shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                        {loading ? 'Guardando…' : (esEdicion ? <><Check className="w-4 h-4" /> Actualizar</> : <><Plus className="w-4 h-4" /> Crear ítem</>)}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
