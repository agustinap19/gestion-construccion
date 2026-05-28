import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useLoading } from '../../../context/LoadingContext';
import { materialService } from '../../../services/materialService';
import { categoriaMaterialService } from '../../../services/categoriaMaterialService';
import { Plus, Search, Grid, List, Package, Tag, Edit, Eye, Check, X } from '../../../components/icons/Icons';
import BotonExportar from '../../../components/ui/BotonExportar';
import MaterialModal from './MaterialModal';
import CategoriasDrawer from './CategoriasDrawer';
import MaterialDrawer from './MaterialDrawer';
import EmptyState from '../../../components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';

// ── Estilo liquid glass lila-verde ─────────────────────────────────────────
const gradientBg = 'bg-gradient-to-br from-slate-950 via-[#1a1230] to-[#0d1f1a]';
const glassInput = 'bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm';

// Botón de estado clickeable (no solo readable)
const EstadoBtn = ({ activo, onChange, loading }) => (
    <button
        onClick={e => { e.stopPropagation(); onChange(!activo); }}
        disabled={loading}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all
            ${activo
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'}
            ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        {activo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        {activo ? 'Activo' : 'Inactivo'}
    </button>
);

const MaterialesIndex = () => {
    const { startLoading, stopLoading } = useLoading();
    const [materiales, setMateriales] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [stats, setStats]           = useState({ total: 0, activos: 0, especiales: 0 });
    const [page, setPage]             = useState(1);
    const [lastPage, setLastPage]     = useState(1);
    const [busqueda, setBusqueda]     = useState('');
    const [filtroTipo, setFiltroTipo]           = useState('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [viewMode, setViewMode]     = useState('grid');
    const [modalOpen, setModalOpen]   = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [drawerOpen, setDrawerOpen]             = useState(false);
    const [catDrawerOpen, setCatDrawerOpen]       = useState(false);
    const [toggling, setToggling]                 = useState({});

    const loadData = useCallback(async () => {
        try {
            startLoading();
            const [resMat, resCat] = await Promise.all([
                materialService.getAll({ page, busqueda, tipo: filtroTipo, categorias: filtroCategoria ? [filtroCategoria] : [], per_page: 20 }),
                categoriaMaterialService.getAll(),
            ]);
            const data = resMat.data?.data || [];
            setMateriales(data);
            setLastPage(resMat.data?.last_page || 1);
            setStats({
                total:     resMat.data?.total || 0,
                activos:   data.filter(m => m.activo).length,
                especiales: data.filter(m => m.tipo === 'especial').length,
            });
            if (resCat.status === 'success') setCategorias(resCat.data);
        } catch { toast.error('Error al cargar materiales.'); }
        finally { stopLoading(); }
    }, [page, busqueda, filtroTipo, filtroCategoria]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleToggle = async (id, activoActual) => {
        setToggling(t => ({ ...t, [id]: true }));
        try {
            await materialService.toggleEstado(id, !activoActual);
            setMateriales(prev => prev.map(m => m.id === id ? { ...m, activo: !activoActual } : m));
            setStats(s => ({
                ...s,
                activos: activoActual ? s.activos - 1 : s.activos + 1,
            }));
        } catch { toast.error('Error al cambiar estado.'); }
        finally { setToggling(t => ({ ...t, [id]: false })); }
    };

    const statCards = [
        { label: 'Total',      value: stats.total,     color: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-500/30' },
        { label: 'Activos',    value: stats.activos,   color: 'from-emerald-500/20 to-teal-600/20',  border: 'border-emerald-500/30' },
        { label: 'Especiales', value: stats.especiales, color: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-500/30' },
    ];

    return (
        <div className={`min-h-screen ${gradientBg} p-6`}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-white/10 flex items-center justify-center">
                            <Package className="w-6 h-6 text-emerald-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Catálogo de Materiales</h1>
                            <p className="text-white/40 text-sm">Gestión centralizada de recursos e insumos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setCatDrawerOpen(true)}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                            <Tag className="w-4 h-4" /> Categorías
                        </button>
                        <BotonExportar url="/exportar/materiales" formatos={[{ tipo: 'pdf', label: 'PDF' }]} label="Exportar"
                            className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20" />
                        <button onClick={() => { setSelectedMaterial(null); setModalOpen(true); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                            bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-medium
                            shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 transition-all">
                            <Plus className="w-5 h-5" /> Nuevo Material
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                    {statCards.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className={`bg-gradient-to-br ${s.color} backdrop-blur-sm border ${s.border} rounded-2xl p-4`}>
                            <div className="text-2xl font-bold text-white">{s.value}</div>
                            <div className="text-white/40 text-xs mt-1">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                        placeholder="Buscar por código, nombre o marca…"
                        className={`${glassInput} w-full pl-10`} />
                </div>
                <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
                    className={`${glassInput} cursor-pointer`}>
                    <option value="todos">Todos los tipos</option>
                    <option value="maestro">Maestros</option>
                    <option value="especial">Especiales</option>
                </select>
                <select value={filtroCategoria} onChange={e => { setFiltroCategoria(e.target.value); setPage(1); }}
                    className={`${glassInput} cursor-pointer`}>
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <div className="flex backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-xl p-1 shrink-0">
                    <button onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gradient-to-r from-violet-600/60 to-emerald-600/60 text-white' : 'text-white/40 hover:text-white/70'}`}>
                        <Grid className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-gradient-to-r from-violet-600/60 to-emerald-600/60 text-white' : 'text-white/40 hover:text-white/70'}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            {materiales.length === 0 ? (
                <EmptyState icon={<Package className="w-12 h-12" />} title="Sin materiales"
                    description="Crea el primer material del catálogo."
                    action={<button onClick={() => { setSelectedMaterial(null); setModalOpen(true); }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 text-white text-sm font-medium hover:from-violet-500 hover:to-emerald-500 transition-all">
                        Crear material
                    </button>} />
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence>
                        {materiales.map((mat, idx) => (
                            <MaterialCard key={mat.id} mat={mat} idx={idx}
                                onView={() => { setSelectedMaterial(mat); setDrawerOpen(true); }}
                                onEdit={e => { e.stopPropagation(); setSelectedMaterial(mat); setModalOpen(true); }}
                                onToggle={() => handleToggle(mat.id, mat.activo)}
                                toggling={!!toggling[mat.id]} />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10">
                            <tr>
                                {['Código', 'Material', 'Categoría', 'Precio / Unid.', 'Tipo', 'Estado', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-white/40 font-medium text-xs">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {materiales.map(mat => (
                                <tr key={mat.id} onClick={() => { setSelectedMaterial(mat); setDrawerOpen(true); }}
                                    className="hover:bg-white/[0.03] cursor-pointer transition-colors">
                                    <td className="px-4 py-3 font-mono text-white/40 text-xs">{mat.codigo}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                                {mat.imagen_url ? <img src={mat.imagen_url} className="w-full h-full object-cover rounded-lg" /> : <Package className="w-4 h-4 text-white/30" />}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{mat.nombre}</p>
                                                <p className="text-white/40 text-xs">{mat.marca || '—'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="flex items-center gap-1.5 text-xs">
                                            {mat.categoria?.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: mat.categoria.color }} />}
                                            <span className="text-white/60">{mat.categoria?.nombre || '—'}</span>
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-emerald-400 font-semibold text-sm">
                                        Bs {Number(mat.precio_referencial || 0).toFixed(2)} <span className="text-white/30 font-normal text-xs">/{mat.unidad_medida?.simbolo}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                                            ${mat.tipo === 'especial' ? 'bg-amber-500/20 text-amber-300' : 'bg-sky-500/20 text-sky-300'}`}>
                                            {mat.tipo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <EstadoBtn activo={mat.activo} onChange={() => handleToggle(mat.id, mat.activo)} loading={!!toggling[mat.id]} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={e => { e.stopPropagation(); setSelectedMaterial(mat); setModalOpen(true); }}
                                            className="text-violet-400 hover:text-violet-300 text-xs px-2.5 py-1 rounded-lg hover:bg-violet-500/20 transition-all font-medium">
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-xl text-sm font-medium transition-all
                                ${p === page
                                    ? 'bg-gradient-to-r from-violet-600 to-emerald-600 text-white shadow-lg'
                                    : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {/* Modales/Drawers */}
            <MaterialModal isOpen={modalOpen} onClose={() => setModalOpen(false)}
                material={selectedMaterial} onSaved={loadData} categorias={categorias} />

            <AnimatePresence>
                {drawerOpen && selectedMaterial && (
                    <MaterialDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} material={selectedMaterial} />
                )}
                {catDrawerOpen && (
                    <CategoriasDrawer isOpen={catDrawerOpen} onClose={() => setCatDrawerOpen(false)} onSaved={loadData} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default MaterialesIndex;

// ── MaterialCard ──────────────────────────────────────────────────────────────
function MaterialCard({ mat, idx, onView, onEdit, onToggle, toggling }) {
    const catColor = mat.categoria?.color || '#6b7280';
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
            onClick={onView}
            className="group relative rounded-2xl overflow-hidden cursor-pointer
                backdrop-blur-xl bg-white/[0.05] border border-white/10 hover:border-white/20
                shadow-xl shadow-black/30 hover:-translate-y-0.5 transition-all duration-300">
            {/* Image / placeholder */}
            <div className="h-28 relative flex items-center justify-center bg-white/[0.03]"
                style={{ background: `linear-gradient(135deg, ${catColor}15 0%, transparent 60%)` }}>
                {mat.imagen_url ? (
                    <img src={mat.imagen_url} alt={mat.nombre} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <Package className="w-10 h-10 text-white/10" />
                )}
                {/* Color bar */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: catColor }} />
                {/* Status button */}
                <div className="absolute top-2 right-2" onClick={e => e.stopPropagation()}>
                    <EstadoBtn activo={mat.activo} onChange={onToggle} loading={toggling} />
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-start justify-between mb-1.5">
                    <p className="text-white/30 text-[10px] font-mono">{mat.codigo}</p>
                    {mat.tipo === 'especial' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">Especial</span>
                    )}
                </div>
                <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 mb-1">{mat.nombre}</h3>
                <p className="text-white/30 text-xs mb-3 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catColor }} />
                    {mat.categoria?.nombre || 'Sin categoría'}
                </p>

                <div className="flex items-center justify-between">
                    <p className="text-emerald-400 text-sm font-semibold">
                        Bs {Number(mat.precio_referencial || 0).toFixed(2)}
                        <span className="text-white/30 font-normal text-xs"> /{mat.unidad_medida?.simbolo}</span>
                    </p>
                    <button onClick={onEdit}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-lg
                        bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 text-xs font-medium transition-all">
                        <Edit className="w-3 h-3" /> Editar
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
