import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { bibliotecaConstructivaService } from '../../../services/bibliotecaConstructivaService';
import { X, Plus, Edit, Trash2, Tag, Check } from '../../../components/icons/Icons';

const glassInput = 'bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm w-full';

export default function CategoriasConstructivasDrawer({ onClose, onRefresh }) {
    const [categorias, setCategorias] = useState([]);
    const [editando, setEditando]     = useState(null);
    const [creando, setCreando]       = useState(false);
    const [form, setForm]             = useState({ nombre: '', color: '#6b7280', descripcion: '' });
    const [loading, setLoading]       = useState(false);

    const loadCategorias = async () => {
        try {
            const r = await bibliotecaConstructivaService.getCategorias();
            setCategorias(r.data || []);
        } catch { toast.error('Error al cargar categorías.'); }
    };

    useEffect(() => { loadCategorias(); }, []);

    const handleGuardar = async () => {
        if (!form.nombre.trim()) { toast.error('El nombre es requerido.'); return; }
        setLoading(true);
        try {
            if (editando) {
                await bibliotecaConstructivaService.actualizarCategoria(editando.id, form);
                toast.success('Categoría actualizada.');
            } else {
                await bibliotecaConstructivaService.crearCategoria(form);
                toast.success('Categoría creada.');
            }
            await loadCategorias();
            onRefresh();
            resetForm();
        } catch (e) { toast.error(e?.response?.data?.message || 'Error al guardar.'); }
        finally { setLoading(false); }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar categoría?')) return;
        try {
            await bibliotecaConstructivaService.eliminarCategoria(id);
            toast.success('Categoría eliminada.');
            await loadCategorias();
            onRefresh();
        } catch (e) { toast.error(e?.response?.data?.message || 'No se puede eliminar.'); }
    };

    const abrirEditar = (cat) => {
        setEditando(cat);
        setForm({ nombre: cat.nombre, color: cat.color || '#6b7280', descripcion: cat.descripcion || '' });
        setCreando(true);
    };

    const resetForm = () => {
        setCreando(false);
        setEditando(null);
        setForm({ nombre: '', color: '#6b7280', descripcion: '' });
    };

    return (
        <>
            {/* Backdrop */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={onClose} />

            {/* Drawer */}
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md
                    backdrop-blur-2xl bg-gradient-to-b from-[#1a1230]/95 to-[#0d1f1a]/95
                    border-l border-white/10 shadow-2xl shadow-black/50 flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                            <Tag className="w-4 h-4 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-sm">Categorías Constructivas</h2>
                            <p className="text-white/40 text-xs">{categorias.length} definidas</p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                {creando && (
                    <div className="px-6 py-5 border-b border-white/10 space-y-3">
                        <h3 className="text-white text-sm font-medium">{editando ? 'Editar' : 'Nueva'} categoría</h3>
                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Nombre *</label>
                            <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                placeholder="Ej: Cimientos" className={glassInput} />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <label className="text-white/50 text-xs mb-1 block">Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.color}
                                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent shrink-0" />
                                    <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="flex-1 bg-white/[0.06] border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:border-violet-400/60" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Descripción</label>
                            <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                placeholder="Descripción breve" className={glassInput} />
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            <button onClick={resetForm}
                                className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleGuardar} disabled={loading}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl
                                bg-gradient-to-r from-violet-600 to-emerald-600 text-white text-sm font-medium
                                hover:from-violet-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                                {loading ? 'Guardando…' : <><Check className="w-4 h-4" />{editando ? 'Actualizar' : 'Crear'}</>}
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-2">
                    {categorias.map((cat, idx) => (
                        <motion.div key={cat.id}
                            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                            className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:border-white/20 transition-all">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${cat.color}25`, border: `1px solid ${cat.color}50` }}>
                                <div className="w-4 h-4 rounded-full" style={{ background: cat.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium">{cat.nombre}</p>
                                {cat.descripcion && <p className="text-white/40 text-xs truncate">{cat.descripcion}</p>}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => abrirEditar(cat)}
                                    className="w-7 h-7 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 flex items-center justify-center transition-colors">
                                    <Edit className="w-3 h-3" />
                                </button>
                                <button onClick={() => handleEliminar(cat.id)}
                                    className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Footer */}
                {!creando && (
                    <div className="px-6 py-4 border-t border-white/10">
                        <button onClick={() => { resetForm(); setCreando(true); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                            bg-gradient-to-r from-violet-600 to-emerald-600 text-white text-sm font-medium
                            hover:from-violet-500 hover:to-emerald-500 transition-all">
                            <Plus className="w-4 h-4" /> Nueva categoría
                        </button>
                    </div>
                )}
            </motion.div>
        </>
    );
}
