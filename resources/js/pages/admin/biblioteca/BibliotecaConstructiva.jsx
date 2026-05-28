import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../../context/LoadingContext';
import { bibliotecaConstructivaService } from '../../../services/bibliotecaConstructivaService';
import { plantillaConstructivaService } from '../../../services/plantillaConstructivaService';
import {
    BookOpen, Search, Plus, Filter, Layers, Tag, Edit, Trash2,
    ChevronDown, Upload, Download, Check, X, Copy, AlertTriangle,
    Hammer, Ruler, Boxes, GripVertical
} from '../../../components/icons/Icons';
import EmptyState from '../../../components/ui/EmptyState';
import ItemConstructivoModal from './ItemConstructivoModal';
import PlantillaConstructivaModal from './PlantillaConstructivaModal';
import CategoriasConstructivasDrawer from './CategoriasConstructivasDrawer';

// ── Constantes ────────────────────────────────────────────────────────────────
const UNIDAD_LABELS = { m3: 'm³', m2: 'm²', ml: 'ml', pza: 'pza', glb: 'glb', kg: 'kg' };
const TABS = [
    { id: 'items',      label: 'Ítems Constructivos', icon: Hammer },
    { id: 'plantillas', label: 'Plantillas',           icon: Layers },
    { id: 'categorias', label: 'Categorías',           icon: Tag    },
];
const TIPO_OBRA_LABELS = {
    social:        'Social',
    privado:       'Privado',
    multifamiliar: 'Multifamiliar',
    remodelacion:  'Remodelación',
};

// ── Utilidades visuales ───────────────────────────────────────────────────────
const glassPanel = 'backdrop-blur-xl bg-white/[0.06] border border-white/10 dark:bg-black/20';
const glassInput = 'bg-white/[0.06] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all rounded-xl px-4 py-2.5 text-sm';
const gradientBg = 'bg-gradient-to-br from-slate-950 via-[#1a1230] to-[#0d1f1a]';

const EstadoToggle = ({ activo, onChange, disabled = false }) => (
    <button
        onClick={() => !disabled && onChange(!activo)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
            ${activo ? 'bg-gradient-to-r from-violet-500 to-emerald-500' : 'bg-white/15'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200
            ${activo ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

// ── Componente principal ──────────────────────────────────────────────────────
export default function BibliotecaConstructiva() {
    const { startLoading, stopLoading } = useLoading();
    const [tab, setTab]               = useState('items');
    const [categorias, setCategorias] = useState([]);

    // Items state
    const [items, setItems]           = useState([]);
    const [itemsMeta, setItemsMeta]   = useState({ total: 0, last_page: 1 });
    const [itemsPage, setItemsPage]   = useState(1);
    const [itemsBusqueda, setItemsBusqueda] = useState('');
    const [itemsCatFiltro, setItemsCatFiltro] = useState('');
    const [itemModal, setItemModal]   = useState(null); // null | 'nuevo' | item
    const [catDrawer, setCatDrawer]   = useState(false);

    // Plantillas state
    const [plantillas, setPlantillas]     = useState([]);
    const [plantillasPage, setPlantillasPage] = useState(1);
    const [plantillasMeta, setPlantillasMeta] = useState({ last_page: 1 });
    const [plantillasBusqueda, setPlantillasBusqueda] = useState('');
    const [plantillaModal, setPlantillaModal] = useState(null);

    // Import
    const [importFile, setImportFile]   = useState(null);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult]   = useState(null);

    // ── Loaders ────────────────────────────────────────────────────────────────
    const loadCategorias = useCallback(async () => {
        try {
            const r = await bibliotecaConstructivaService.getCategorias();
            setCategorias(r.data || []);
        } catch { /* silent */ }
    }, []);

    const loadItems = useCallback(async () => {
        try {
            startLoading();
            const r = await bibliotecaConstructivaService.getItems({
                page: itemsPage, busqueda: itemsBusqueda,
                categoria_id: itemsCatFiltro, per_page: 24,
            });
            setItems(r.data?.data || r.data || []);
            setItemsMeta({ total: r.data?.total || 0, last_page: r.data?.last_page || 1 });
        } catch { toast.error('Error al cargar ítems.'); }
        finally { stopLoading(); }
    }, [itemsPage, itemsBusqueda, itemsCatFiltro]);

    const loadPlantillas = useCallback(async () => {
        try {
            startLoading();
            const r = await plantillaConstructivaService.getAll({
                page: plantillasPage, busqueda: plantillasBusqueda, per_page: 12,
            });
            setPlantillas(r.data?.data || r.data || []);
            setPlantillasMeta({ last_page: r.data?.last_page || 1 });
        } catch { toast.error('Error al cargar plantillas.'); }
        finally { stopLoading(); }
    }, [plantillasPage, plantillasBusqueda]);

    useEffect(() => { loadCategorias(); }, [loadCategorias]);
    useEffect(() => { if (tab === 'items') loadItems(); }, [tab, loadItems]);
    useEffect(() => { if (tab === 'plantillas') loadPlantillas(); }, [tab, loadPlantillas]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleToggleItem = async (item) => {
        try {
            await bibliotecaConstructivaService.cambiarEstado(item.id, !item.estado);
            loadItems();
        } catch { toast.error('No se pudo cambiar el estado.'); }
    };

    const handleEliminarItem = async (id) => {
        if (!confirm('¿Eliminar este ítem? Esta acción no se puede deshacer.')) return;
        try {
            await bibliotecaConstructivaService.eliminarItem(id);
            toast.success('Ítem eliminado.');
            loadItems();
        } catch (e) { toast.error(e?.response?.data?.message || 'Error al eliminar.'); }
    };

    const handleTogglePlantilla = async (p) => {
        try {
            await plantillaConstructivaService.cambiarEstado(p.id, !p.estado);
            loadPlantillas();
        } catch { toast.error('No se pudo cambiar el estado.'); }
    };

    const handleDuplicarPlantilla = async (id) => {
        try {
            await plantillaConstructivaService.duplicar(id);
            toast.success('Plantilla duplicada.');
            loadPlantillas();
        } catch (e) { toast.error(e?.response?.data?.message || 'Error al duplicar.'); }
    };

    const handleImportar = async () => {
        if (!importFile) return;
        setImportLoading(true);
        setImportResult(null);
        try {
            const r = await bibliotecaConstructivaService.importarExcel(importFile);
            setImportResult(r.data || r);
            toast.success(`Importación completa: ${r.data?.creados ?? 0} creados, ${r.data?.actualizados ?? 0} actualizados.`);
            loadItems();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error en la importación.');
        } finally {
            setImportLoading(false);
            setImportFile(null);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className={`min-h-screen ${gradientBg} p-6`}>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-white/10 flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-violet-300" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Biblioteca Constructiva</h1>
                            <p className="text-white/40 text-sm">Ítems, recetas, plantillas y categorías para proyectos</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {tab === 'items' && (
                            <>
                                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                    bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border border-emerald-500/30
                                    text-emerald-300 text-sm font-medium cursor-pointer hover:bg-emerald-600/40 transition-all">
                                    <Upload className="w-4 h-4" />
                                    Importar Excel
                                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
                                        onChange={e => setImportFile(e.target.files[0])} />
                                </label>
                                <button onClick={bibliotecaConstructivaService.descargarPlantillaExcel}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                    bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                                    <Download className="w-4 h-4" /> Plantilla
                                </button>
                                <button onClick={() => setCatDrawer(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                    bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 hover:text-white transition-all">
                                    <Tag className="w-4 h-4" /> Categorías
                                </button>
                                <button onClick={() => setItemModal('nuevo')}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                    bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-medium
                                    shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 transition-all">
                                    <Plus className="w-5 h-5" /> Nuevo Ítem
                                </button>
                            </>
                        )}
                        {tab === 'plantillas' && (
                            <button onClick={() => setPlantillaModal('nuevo')}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                bg-gradient-to-r from-violet-600 to-emerald-600 text-white font-medium
                                shadow-lg shadow-violet-900/30 hover:from-violet-500 hover:to-emerald-500 transition-all">
                                <Plus className="w-5 h-5" /> Nueva Plantilla
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Import banner */}
            <AnimatePresence>
                {importFile && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`${glassPanel} rounded-2xl p-4 mb-6 flex items-center justify-between gap-4`}>
                        <div className="flex items-center gap-3 text-white/70 text-sm">
                            <Upload className="w-5 h-5 text-emerald-400" />
                            <span><span className="text-white font-medium">{importFile.name}</span> seleccionado</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setImportFile(null)}
                                className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleImportar} disabled={importLoading}
                                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-emerald-600
                                text-white text-sm font-medium hover:from-violet-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                                {importLoading ? 'Importando…' : 'Confirmar importación'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Import result */}
            <AnimatePresence>
                {importResult && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="rounded-2xl p-4 mb-6 border bg-emerald-500/10 border-emerald-500/20 flex items-start justify-between gap-4">
                        <div className="text-sm text-emerald-300">
                            <p className="font-semibold mb-1">Importación finalizada</p>
                            <p>Creados: <span className="text-white">{importResult.creados}</span> · Actualizados: <span className="text-white">{importResult.actualizados}</span></p>
                            {importResult.errores?.length > 0 && (
                                <ul className="mt-2 space-y-0.5 text-amber-300 text-xs">
                                    {importResult.errores.map((e, i) => <li key={i}>⚠ {e}</li>)}
                                </ul>
                            )}
                        </div>
                        <button onClick={() => setImportResult(null)} className="text-white/40 hover:text-white/80 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tabs */}
            <div className={`${glassPanel} rounded-2xl p-1 mb-6 inline-flex gap-1`}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                            ${tab === t.id
                                ? 'bg-gradient-to-r from-violet-600/80 to-emerald-600/80 text-white shadow-lg shadow-violet-900/30'
                                : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                        <t.icon className="w-4 h-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── TAB: ÍTEMS ─────────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {tab === 'items' && (
                    <motion.div key="items" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        {/* Filters */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="relative flex-1 min-w-[220px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input value={itemsBusqueda}
                                    onChange={e => { setItemsBusqueda(e.target.value); setItemsPage(1); }}
                                    placeholder="Buscar por nombre o código…"
                                    className={`${glassInput} w-full pl-10`} />
                            </div>
                            <select value={itemsCatFiltro}
                                onChange={e => { setItemsCatFiltro(e.target.value); setItemsPage(1); }}
                                className={`${glassInput} min-w-[180px] cursor-pointer`}>
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                        </div>

                        {/* Items grid */}
                        {items.length === 0 ? (
                            <EmptyState icon={<Hammer className="w-12 h-12" />}
                                title="Sin ítems constructivos"
                                description="Crea el primer ítem o importa desde Excel." />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                <AnimatePresence>
                                    {items.map((item, idx) => (
                                        <ItemCard key={item.id} item={item} idx={idx}
                                            onEdit={() => setItemModal(item)}
                                            onToggle={() => handleToggleItem(item)}
                                            onEliminar={() => handleEliminarItem(item.id)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Pagination */}
                        {itemsMeta.last_page > 1 && (
                            <Pagination page={itemsPage} lastPage={itemsMeta.last_page} onChange={setItemsPage} />
                        )}
                    </motion.div>
                )}

                {/* ── TAB: PLANTILLAS ──────────────────────────────────────── */}
                {tab === 'plantillas' && (
                    <motion.div key="plantillas" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <div className="flex flex-wrap gap-3 mb-6">
                            <div className="relative flex-1 min-w-[220px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                <input value={plantillasBusqueda}
                                    onChange={e => { setPlantillasBusqueda(e.target.value); setPlantillasPage(1); }}
                                    placeholder="Buscar plantilla…"
                                    className={`${glassInput} w-full pl-10`} />
                            </div>
                        </div>

                        {plantillas.length === 0 ? (
                            <EmptyState icon={<Layers className="w-12 h-12" />}
                                title="Sin plantillas"
                                description="Crea la primera plantilla constructiva." />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                <AnimatePresence>
                                    {plantillas.map((p, idx) => (
                                        <PlantillaCard key={p.id} plantilla={p} idx={idx}
                                            onEdit={() => setPlantillaModal(p)}
                                            onToggle={() => handleTogglePlantilla(p)}
                                            onDuplicar={() => handleDuplicarPlantilla(p.id)} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {plantillasMeta.last_page > 1 && (
                            <Pagination page={plantillasPage} lastPage={plantillasMeta.last_page} onChange={setPlantillasPage} />
                        )}
                    </motion.div>
                )}

                {/* ── TAB: CATEGORÍAS ─────────────────────────────────────── */}
                {tab === 'categorias' && (
                    <motion.div key="categorias" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                        <CategoriasInlinePanel categorias={categorias} onRefresh={loadCategorias} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modales */}
            <AnimatePresence>
                {itemModal && (
                    <ItemConstructivoModal
                        item={itemModal === 'nuevo' ? null : itemModal}
                        categorias={categorias}
                        onClose={() => setItemModal(null)}
                        onGuardado={() => { setItemModal(null); loadItems(); }}
                    />
                )}
                {plantillaModal && (
                    <PlantillaConstructivaModal
                        plantilla={plantillaModal === 'nuevo' ? null : plantillaModal}
                        onClose={() => setPlantillaModal(null)}
                        onGuardado={() => { setPlantillaModal(null); loadPlantillas(); }}
                    />
                )}
                {catDrawer && (
                    <CategoriasConstructivasDrawer
                        onClose={() => setCatDrawer(false)}
                        onRefresh={loadCategorias}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// ── ItemCard ──────────────────────────────────────────────────────────────────
function ItemCard({ item, idx, onEdit, onToggle, onEliminar }) {
    const catColor = item.categoria?.color || '#6b7280';
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.03 }}
            className="group relative rounded-2xl overflow-hidden backdrop-blur-xl
                bg-white/[0.05] border border-white/10 hover:border-white/20
                shadow-xl shadow-black/30 hover:-translate-y-0.5 transition-all duration-300">
            {/* Color bar */}
            <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${catColor}99, ${catColor}33)` }} />

            <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-[10px] font-mono mb-0.5">{item.codigo}</p>
                        <h3 className="text-white font-semibold text-sm leading-snug truncate">{item.nombre}</h3>
                        <p className="text-white/40 text-xs truncate mt-0.5">{item.categoria?.nombre || '—'}</p>
                    </div>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono shrink-0">
                        {UNIDAD_LABELS[item.unidad_base] || item.unidad_base}
                    </span>
                </div>

                {item.precio_unitario_referencial > 0 && (
                    <p className="text-emerald-400 text-xs font-semibold mb-3">
                        Bs {parseFloat(item.precio_unitario_referencial).toFixed(2)} / {UNIDAD_LABELS[item.unidad_base] || item.unidad_base}
                    </p>
                )}

                {item.receta?.length > 0 && (
                    <p className="text-white/30 text-xs mb-3">
                        {item.receta.length} ingrediente{item.receta.length !== 1 ? 's' : ''} en receta
                    </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <EstadoToggle activo={!!item.estado} onChange={onToggle} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={onEdit}
                            className="w-7 h-7 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 flex items-center justify-center transition-colors">
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onEliminar}
                            className="w-7 h-7 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-400 flex items-center justify-center transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}


// ── PlantillaCard ─────────────────────────────────────────────────────────────
function PlantillaCard({ plantilla, idx, onEdit, onToggle, onDuplicar }) {
    const tipoLabel = TIPO_OBRA_LABELS[plantilla.tipo_obra] || plantilla.tipo_obra;
    const gradTipo = {
        social:        'from-violet-500/20 to-purple-600/20',
        privado:       'from-emerald-500/20 to-teal-600/20',
        multifamiliar: 'from-sky-500/20 to-blue-600/20',
        remodelacion:  'from-amber-500/20 to-orange-600/20',
    }[plantilla.tipo_obra] || 'from-slate-500/20 to-slate-600/20';

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: idx * 0.04 }}
            className={`group relative rounded-2xl overflow-hidden backdrop-blur-xl
                bg-gradient-to-br ${gradTipo} border border-white/10 hover:border-white/20
                shadow-xl shadow-black/30 hover:-translate-y-0.5 transition-all duration-300 p-5`}>

            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">
                            {tipoLabel}
                        </span>
                        {plantilla.es_sistema && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">Sistema</span>
                        )}
                    </div>
                    <h3 className="text-white font-semibold text-sm leading-snug">{plantilla.nombre}</h3>
                    {plantilla.tipologia && (
                        <p className="text-white/40 text-xs mt-0.5">{plantilla.tipologia}</p>
                    )}
                </div>
                <span className="text-white/30 text-xs ml-2">v{plantilla.version}</span>
            </div>

            {plantilla.descripcion && (
                <p className="text-white/40 text-xs leading-relaxed mb-3 line-clamp-2">{plantilla.descripcion}</p>
            )}

            <div className="flex items-center gap-3 text-white/40 text-xs mb-4">
                <span>{plantilla.total_items || 0} ítems</span>
                <span>·</span>
                <span>Pond. {plantilla.ponderacion_total || 0}%</span>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <EstadoToggle activo={!!plantilla.estado} onChange={onToggle} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={onDuplicar}
                        className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 flex items-center justify-center transition-colors"
                        title="Duplicar">
                        <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onEdit}
                        className="w-7 h-7 rounded-lg bg-violet-500/20 hover:bg-violet-500/40 text-violet-300 flex items-center justify-center transition-colors">
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ── CategoriasInlinePanel ─────────────────────────────────────────────────────
function CategoriasInlinePanel({ categorias, onRefresh }) {
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm]   = useState({ nombre: '', color: '#6b7280', descripcion: '' });
    const [loading, setLoading] = useState(false);

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
            onRefresh();
            setCreando(false); setEditando(null);
            setForm({ nombre: '', color: '#6b7280', descripcion: '' });
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Error al guardar.');
        } finally { setLoading(false); }
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Eliminar categoría? Solo es posible si no tiene ítems asociados.')) return;
        try {
            await bibliotecaConstructivaService.eliminarCategoria(id);
            toast.success('Categoría eliminada.');
            onRefresh();
        } catch (e) { toast.error(e?.response?.data?.message || 'No se puede eliminar.'); }
    };

    const abrirEditar = (cat) => {
        setEditando(cat);
        setForm({ nombre: cat.nombre, color: cat.color || '#6b7280', descripcion: cat.descripcion || '' });
        setCreando(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <p className="text-white/50 text-sm">{categorias.length} categorías definidas</p>
                <button onClick={() => { setEditando(null); setForm({ nombre: '', color: '#6b7280', descripcion: '' }); setCreando(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600
                    text-white text-sm font-medium hover:from-violet-500 hover:to-emerald-500 transition-all">
                    <Plus className="w-4 h-4" /> Nueva categoría
                </button>
            </div>

            <AnimatePresence>
                {creando && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="backdrop-blur-xl bg-white/[0.06] border border-white/10 rounded-2xl p-5 mb-5">
                        <h4 className="text-white font-medium text-sm mb-4">{editando ? 'Editar' : 'Nueva'} categoría</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-white/50 text-xs mb-1 block">Nombre *</label>
                                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                    className={`${glassInput} w-full`} placeholder="Ej: Cimientos" />
                            </div>
                            <div>
                                <label className="text-white/50 text-xs mb-1 block">Color</label>
                                <div className="flex items-center gap-2">
                                    <input type="color" value={form.color}
                                        onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-transparent" />
                                    <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                                        className={`${glassInput} flex-1 font-mono text-xs`} placeholder="#6b7280" />
                                </div>
                            </div>
                            <div>
                                <label className="text-white/50 text-xs mb-1 block">Descripción</label>
                                <input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                    className={`${glassInput} w-full`} placeholder="Descripción breve" />
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 mt-4">
                            <button onClick={() => { setCreando(false); setEditando(null); }}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm hover:bg-white/10 transition-all">
                                Cancelar
                            </button>
                            <button onClick={handleGuardar} disabled={loading}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 text-white text-sm font-medium
                                hover:from-violet-500 hover:to-emerald-500 transition-all disabled:opacity-50">
                                {loading ? 'Guardando…' : (editando ? 'Actualizar' : 'Crear')}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {categorias.map((cat, idx) => (
                    <motion.div key={cat.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                        className="group flex items-center gap-3 p-4 rounded-2xl backdrop-blur-xl bg-white/[0.05] border border-white/10
                        hover:border-white/20 transition-all">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${cat.color}33`, border: `1px solid ${cat.color}55` }}>
                            <Tag className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{cat.nombre}</p>
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
        </div>
    );
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({ page, lastPage, onChange }) {
    return (
        <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => onChange(p)}
                    className={`w-9 h-9 rounded-xl text-sm font-medium transition-all
                        ${p === page
                            ? 'bg-gradient-to-r from-violet-600 to-emerald-600 text-white shadow-lg'
                            : 'bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                    {p}
                </button>
            ))}
        </div>
    );
}
