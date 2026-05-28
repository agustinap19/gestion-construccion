import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoading } from '../../../context/LoadingContext';
import { almacenService } from '../../../services/almacenService';
import proyectoService from '../../../services/proyectoService';
import {
    Search, Plus, Warehouse, ChevronRight, Building2, MapPin, User
} from '../../../components/icons/Icons';
import EmptyState from '../../../components/ui/EmptyState';
import AlmacenFormModal from './AlmacenFormModal';

const TIPO_LABELS = { central: 'Central', obra: 'De Obra', temporal: 'Temporal' };
const TIPO_COLORS = { central: 'from-violet-500 to-purple-700', obra: 'from-sky-500 to-blue-700', temporal: 'from-amber-400 to-orange-600' };

// Estado como botón clickeable que cicla: activo → inactivo → cerrado → activo
const ESTADO_CYCLE = { activo: 'inactivo', inactivo: 'cerrado', cerrado: 'activo' };
const ESTADO_STYLES = {
    activo:   'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30',
    inactivo: 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30',
    cerrado:  'bg-red-500/20 border-red-500/40 text-red-400 hover:bg-red-500/30',
};

export default function AlmacenesIndex() {
    const navigate   = useNavigate();
    const { startLoading, stopLoading } = useLoading();
    const [almacenes, setAlmacenes] = useState([]);
    const [stats, setStats]         = useState({ total: 0, activos: 0, central: null });
    const [page, setPage]           = useState(1);
    const [lastPage, setLastPage]   = useState(1);
    const [busqueda, setBusqueda]   = useState('');
    const [filtroTipo, setFiltroTipo]     = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [modalOpen, setModalOpen]       = useState(false);
    const [editando, setEditando]         = useState(null);
    const [togglingEstado, setTogglingEstado] = useState({});

    const handleCambiarEstado = async (alm, e) => {
        e.stopPropagation();
        const nuevoEstado = ESTADO_CYCLE[alm.estado] || 'activo';
        setTogglingEstado(t => ({ ...t, [alm.id]: true }));
        try {
            await almacenService.cambiarEstado(alm.id, nuevoEstado);
            setAlmacenes(prev => prev.map(a => a.id === alm.id ? { ...a, estado: nuevoEstado } : a));
        } catch { toast.error('Error al cambiar estado.'); }
        finally { setTogglingEstado(t => ({ ...t, [alm.id]: false })); }
    };

    const loadData = useCallback(async () => {
        try {
            startLoading();
            const [resAlm, resStats] = await Promise.all([
                almacenService.listar({ page, busqueda, tipo: filtroTipo, estado: filtroEstado, per_page: 16 }),
                almacenService.estadisticas(),
            ]);
            setAlmacenes(resAlm.data?.data || []);
            setLastPage(resAlm.data?.last_page || 1);
            setStats(resStats.data || { total: 0, activos: 0, central: null });
        } catch {
            toast.error('No se pudieron cargar los almacenes.');
        } finally {
            stopLoading();
        }
    }, [page, busqueda, filtroTipo, filtroEstado]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleGuardado = () => { setModalOpen(false); setEditando(null); loadData(); };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Warehouse className="w-8 h-8 text-violet-400" />
                            Almacenes
                        </h1>
                        <p className="text-slate-400 mt-1 text-sm">Gestión de inventario y stock de materiales</p>
                    </div>
                    <button
                        onClick={() => { setEditando(null); setModalOpen(true); }}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl
                                   bg-gradient-to-r from-violet-600 to-purple-700
                                   text-white font-medium shadow-lg shadow-violet-900/40
                                   hover:from-violet-500 hover:to-purple-600 transition-all"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Almacén
                    </button>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    {[
                        { label: 'Total almacenes', value: stats.total, color: 'from-violet-500/20 to-purple-600/20', border: 'border-violet-500/30' },
                        { label: 'Activos', value: stats.activos, color: 'from-emerald-500/20 to-teal-600/20', border: 'border-emerald-500/30' },
                        { label: 'Almacén central', value: stats.central ? stats.central.nombre : '—', color: 'from-sky-500/20 to-blue-600/20', border: 'border-sky-500/30', small: true },
                        { label: 'De obra / Temporal', value: stats.total - (stats.central ? 1 : 0), color: 'from-amber-500/20 to-orange-600/20', border: 'border-amber-500/30' },
                    ].map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                            className={`bg-gradient-to-br ${s.color} backdrop-blur-sm border ${s.border} rounded-2xl p-4`}>
                            <div className={`font-bold text-white ${s.small ? 'text-base truncate' : 'text-2xl'}`}>{s.value}</div>
                            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPage(1); }}
                        placeholder="Buscar por nombre, código, ubicación…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                                   text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/60
                                   focus:bg-white/8 transition-all"
                    />
                </div>
                <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                               focus:outline-none focus:border-violet-500/60 transition-all">
                    <option value="todos">Todos los tipos</option>
                    <option value="central">Central</option>
                    <option value="obra">De obra</option>
                    <option value="temporal">Temporal</option>
                </select>
                <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1); }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm
                               focus:outline-none focus:border-violet-500/60 transition-all">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="cerrado">Cerrado</option>
                </select>
            </div>

            {/* Grid */}
            {almacenes.length === 0 ? (
                <EmptyState icon={<Warehouse className="w-12 h-12" />} title="Sin almacenes" description="Crea el primer almacén para comenzar." />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    <AnimatePresence>
                        {almacenes.map((alm, idx) => (
                            <AlmacenCard
                                key={alm.id}
                                almacen={alm}
                                idx={idx}
                                onEdit={() => { setEditando(alm); setModalOpen(true); }}
                                onClick={() => navigate(`/dashboard/almacenes/${alm.id}`)}
                                onCambiarEstado={(e) => handleCambiarEstado(alm, e)}
                                toggling={!!togglingEstado[alm.id]}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all
                                ${p === page
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                                    : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                                }`}>
                            {p}
                        </button>
                    ))}
                </div>
            )}

            {modalOpen && (
                <AlmacenFormModal
                    almacen={editando}
                    onClose={() => { setModalOpen(false); setEditando(null); }}
                    onGuardado={handleGuardado}
                />
            )}
        </div>
    );
}

function AlmacenCard({ almacen, idx, onEdit, onClick, onCambiarEstado, toggling }) {
    const gradiente = TIPO_COLORS[almacen.tipo] || 'from-slate-500 to-slate-700';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: idx * 0.04 }}
            onClick={onClick}
            className="group relative cursor-pointer rounded-2xl overflow-hidden
                       border border-white/10 backdrop-blur-sm
                       bg-white/5 hover:bg-white/8 hover:border-white/20
                       shadow-xl shadow-black/30 hover:shadow-black/50
                       transition-all duration-300 hover:-translate-y-1"
        >
            {/* Top gradient bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${gradiente}`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradiente} flex items-center justify-center shadow-lg`}>
                        <Warehouse className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Estado como botón clickeable */}
                        <button
                            onClick={onCambiarEstado}
                            disabled={toggling}
                            title="Click para cambiar estado"
                            className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all
                                ${ESTADO_STYLES[almacen.estado] || 'bg-white/10 border-white/20 text-white/60'}
                                ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            {almacen.estado}
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); onEdit(); }}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg
                                       bg-white/10 hover:bg-white/20 flex items-center justify-center
                                       text-slate-400 hover:text-white transition-all"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <h3 className="text-white font-semibold text-sm leading-tight mb-1 truncate">{almacen.nombre}</h3>
                <p className="text-slate-500 text-xs mb-3">{almacen.codigo}</p>

                {/* Tipo */}
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full bg-gradient-to-r ${gradiente} text-white font-medium mb-3`}>
                    {TIPO_LABELS[almacen.tipo] || almacen.tipo}
                </span>

                {/* Meta */}
                <div className="space-y-1.5 border-t border-white/5 pt-3">
                    {almacen.proyecto && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <Building2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{almacen.proyecto.nombre}</span>
                        </div>
                    )}
                    {almacen.ubicacion && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{almacen.ubicacion}</span>
                        </div>
                    )}
                    {almacen.responsable && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs">
                            <User className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{almacen.responsable.nombre} {almacen.responsable.apellido_paterno}</span>
                        </div>
                    )}
                </div>

                {/* Arrow */}
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </motion.div>
    );
}
