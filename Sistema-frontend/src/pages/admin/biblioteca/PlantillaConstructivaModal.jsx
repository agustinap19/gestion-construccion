import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { plantillaConstructivaService } from '../../../services/plantillaConstructivaService';
import { bibliotecaConstructivaService } from '../../../services/bibliotecaConstructivaService';
import { X, Plus, Trash2, Layers, Check, GripVertical, Percent } from '../../../components/icons/Icons';

const TIPOS_OBRA = ['social', 'privado', 'multifamiliar', 'remodelacion'];
const TIPOS_LABELS = { social: 'Social', privado: 'Privado', multifamiliar: 'Multifamiliar', remodelacion: 'Remodelación' };

const glassInput = 'bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm w-full';
const labelCls = 'text-white/50 text-xs mb-1.5 block font-medium';

export default function PlantillaConstructivaModal({ plantilla, onClose, onGuardado }) {
    const esEdicion = !!plantilla;

    const [form, setForm] = useState({
        nombre:      plantilla?.nombre || '',
        descripcion: plantilla?.descripcion || '',
        tipo_obra:   plantilla?.tipo_obra || 'social',
        tipologia:   plantilla?.tipologia || '',
        version:     plantilla?.version || '1.0',
    });
    const [items, setItems]                 = useState([]);
    const [itemsDisponibles, setItemsDisponibles] = useState([]);
    const [loading, setLoading]             = useState(false);
    const [activeTab, setActiveTab]         = useState('general');
    const [busqueda, setBusqueda]           = useState('');

    const ponderacionTotal = items.reduce((s, it) => s + (parseFloat(it.ponderacion_avance) || 0), 0);

    useEffect(() => {
        bibliotecaConstructivaService.getItems({ per_page: 9999 }).then(r => {
            setItemsDisponibles(r.data?.data || r.data || []);
        }).catch(() => {});

        if (esEdicion && plantilla.items?.length > 0) {
            setItems(plantilla.items.map(it => ({
                item_constructivo_id: String(it.item_constructivo_id),
                nombre:               it.item_constructivo?.nombre || '—',
                unidad_base:          it.item_constructivo?.unidad_base || '',
                ponderacion_avance:   it.ponderacion_avance,
                cantidad_sugerida:    it.cantidad_sugerida,
                orden:                it.orden,
            })));
        }
    }, []);

    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const itemsFiltrados = itemsDisponibles.filter(it =>
        !items.find(i => String(i.item_constructivo_id) === String(it.id)) &&
        (it.nombre.toLowerCase().includes(busqueda.toLowerCase()) || it.codigo?.toLowerCase().includes(busqueda.toLowerCase()))
    );

    const agregarItem = (it) => {
        setItems(prev => [...prev, {
            item_constructivo_id: String(it.id),
            nombre:               it.nombre,
            unidad_base:          it.unidad_base,
            ponderacion_avance:   '0',
            cantidad_sugerida:    '1',
            orden:                prev.length + 1,
        }]);
        setBusqueda('');
    };

    const quitarItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
    const setItemField = (i, k, v) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

    const distribuirPonderacion = () => {
        if (items.length === 0) return;
        const val = (100 / items.length).toFixed(4);
        setItems(prev => prev.map(it => ({ ...it, ponderacion_avance: val })));
    };

    const validate = () => {
        if (!form.nombre.trim()) { toast.error('El nombre es requerido.'); return false; }
        if (items.length > 0 && Math.abs(ponderacionTotal - 100) > 0.1) {
            toast.error(`La ponderación total debe ser 100%. Actual: ${ponderacionTotal.toFixed(2)}%`);
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const payload = {
                ...form,
                items: items.map((it, idx) => ({
                    item_constructivo_id: it.item_constructivo_id,
                    ponderacion_avance:   parseFloat(it.ponderacion_avance) || 0,
                    cantidad_sugerida:    parseFloat(it.cantidad_sugerida) || 1,
                    orden:                idx + 1,
                })),
            };

            if (esEdicion) {
                await plantillaConstructivaService.actualizar(plantilla.id, payload);
                toast.success('Plantilla actualizada.');
            } else {
                await plantillaConstructivaService.crear(payload);
                toast.success('Plantilla creada.');
            }
            onGuardado();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al guardar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 20 }}
                className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col
                    rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03]
                    border border-white/10 shadow-2xl shadow-black/50 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-violet-300" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">
                                {esEdicion ? 'Editar plantilla' : 'Nueva plantilla constructiva'}
                            </h2>
                            {esEdicion && <p className="text-white/40 text-xs">{plantilla.nombre}</p>}
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-6 pt-4">
                    {[
                        { id: 'general', label: 'Datos generales' },
                        { id: 'items',   label: `Ítems (${items.length})` },
                    ].map(t => (
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
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <AnimatePresence mode="wait">
                        {activeTab === 'general' && (
                            <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="space-y-4">
                                <div>
                                    <label className={labelCls}>Nombre *</label>
                                    <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
                                        placeholder="Ej: Vivienda Social TIPO 1" className={glassInput} />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Tipo de obra</label>
                                        <select value={form.tipo_obra} onChange={e => setField('tipo_obra', e.target.value)}
                                            className={`${glassInput} cursor-pointer`}>
                                            {TIPOS_OBRA.map(t => <option key={t} value={t}>{TIPOS_LABELS[t]}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelCls}>Tipología</label>
                                        <input value={form.tipologia} onChange={e => setField('tipologia', e.target.value)}
                                            placeholder="Ej: 1 dormitorio / 45m²" className={glassInput} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Versión</label>
                                        <input value={form.version} onChange={e => setField('version', e.target.value)}
                                            placeholder="1.0" className={glassInput} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Descripción</label>
                                    <textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)}
                                        rows={3} placeholder="Descripción de la plantilla…"
                                        className={`${glassInput} resize-none`} />
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'items' && (
                            <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                {/* Buscador para agregar */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                                            placeholder="Buscar ítem para agregar…"
                                            className="flex-1 bg-white/[0.06] border border-white/10 text-white text-xs placeholder-white/30 rounded-xl px-4 py-2 focus:outline-none focus:border-violet-400/60" />
                                        <button onClick={distribuirPonderacion}
                                            title="Distribuir ponderación en partes iguales"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white transition-all whitespace-nowrap">
                                            <Percent className="w-3.5 h-3.5" /> Distribuir
                                        </button>
                                    </div>
                                    {busqueda && (
                                        <div className="max-h-40 overflow-y-auto rounded-xl bg-black/40 border border-white/10 divide-y divide-white/5">
                                            {itemsFiltrados.slice(0, 20).map(it => (
                                                <button key={it.id} onClick={() => agregarItem(it)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white flex items-center gap-3 transition-colors">
                                                    <Plus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="font-mono text-xs text-white/40 shrink-0">{it.codigo}</span>
                                                    <span className="truncate">{it.nombre}</span>
                                                    <span className="ml-auto text-xs text-white/30 shrink-0">{it.unidad_base}</span>
                                                </button>
                                            ))}
                                            {itemsFiltrados.length === 0 && (
                                                <p className="px-4 py-3 text-white/30 text-xs">Sin resultados</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Ponderación total */}
                                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm
                                    ${Math.abs(ponderacionTotal - 100) <= 0.1
                                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                                        : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}>
                                    <Percent className="w-4 h-4" />
                                    <span>Ponderación total: <strong>{ponderacionTotal.toFixed(2)}%</strong></span>
                                    {Math.abs(ponderacionTotal - 100) <= 0.1
                                        ? <Check className="w-4 h-4 ml-auto text-emerald-400" />
                                        : <span className="ml-auto text-xs">Debe sumar 100%</span>}
                                </div>

                                {/* Lista de ítems */}
                                <div className="space-y-2">
                                    {items.length === 0 && (
                                        <p className="text-white/30 text-sm text-center py-6">Busca y agrega ítems a la plantilla</p>
                                    )}
                                    {items.map((it, i) => (
                                        <motion.div key={it.item_constructivo_id}
                                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                            className="flex items-center gap-3 bg-white/[0.04] rounded-xl p-3 border border-white/8">
                                            <GripVertical className="w-4 h-4 text-white/20 shrink-0 cursor-grab" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm truncate">{it.nombre}</p>
                                                <p className="text-white/30 text-xs">{it.unidad_base}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="text-right">
                                                    <label className="text-white/30 text-[10px] block mb-0.5">Cant. sugerida</label>
                                                    <input type="number" min="0" step="0.01" value={it.cantidad_sugerida}
                                                        onChange={e => setItemField(i, 'cantidad_sugerida', e.target.value)}
                                                        className="w-20 bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-violet-400/60" />
                                                </div>
                                                <div className="text-right">
                                                    <label className="text-white/30 text-[10px] block mb-0.5">Ponderación %</label>
                                                    <input type="number" min="0" max="100" step="0.01" value={it.ponderacion_avance}
                                                        onChange={e => setItemField(i, 'ponderacion_avance', e.target.value)}
                                                        className="w-20 bg-white/[0.06] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 text-right focus:outline-none focus:border-violet-400/60" />
                                                </div>
                                            </div>
                                            <button onClick={() => quitarItem(i)}
                                                className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors shrink-0">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
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
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600
                        text-white text-sm font-medium shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                        {loading ? 'Guardando…' : (esEdicion ? <><Check className="w-4 h-4" /> Actualizar</> : <><Plus className="w-4 h-4" /> Crear plantilla</>)}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
