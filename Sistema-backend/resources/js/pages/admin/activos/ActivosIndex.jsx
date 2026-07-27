import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Wrench, Plus, Search, RefreshCw, Edit, Trash2,
    Settings, Truck, Boxes, Warehouse as WarehouseIcon,
} from '../../../components/icons/Icons';
import { activoService } from '../../../services/activoService';
import { useAuth } from '../../../context/AuthContext';
import ActivoFormModal from './ActivoFormModal';

// ── helpers ───────────────────────────────────────────────────────────────────
const ESTADO_CFG = {
    disponible:    { label: 'Disponible',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    asignado:      { label: 'Asignado',      cls: 'bg-blue-500/15    text-blue-300    border-blue-500/30'    },
    mantenimiento: { label: 'Mantenimiento', cls: 'bg-amber-500/15   text-amber-300   border-amber-500/30'   },
    baja:          { label: 'De baja',       cls: 'bg-slate-500/15   text-slate-300   border-slate-500/30'   },
};

const TIPO_CFG = {
    maquinaria:  { label: 'Maquinaria',  icon: Wrench },
    equipo:      { label: 'Equipo',      icon: Settings },
    herramienta: { label: 'Herramienta', icon: Boxes },
    vehiculo:    { label: 'Vehículo',    icon: Truck },
};

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.disponible;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function MantenimientoBar({ porcentaje, necesita }) {
    const pct = Math.min(100, Math.max(0, Number(porcentaje) || 0));
    const color = necesita ? 'bg-red-400' : pct >= 80 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
        <div className="flex items-center gap-2 w-28">
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-white/40 text-[10px] tabular-nums">{pct.toFixed(0)}%</span>
        </div>
    );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function ActivoRow({ a, onEdit, onEliminar, canEditar, canEliminar }) {
    const TipoIcon = TIPO_CFG[a.tipo]?.icon ?? Wrench;
    return (
        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <TipoIcon className="w-4 h-4 text-violet-300" />
                    </div>
                    <div>
                        <p className="text-white text-sm font-medium leading-tight">{a.nombre}</p>
                        {(a.marca || a.modelo) && (
                            <p className="text-white/40 text-xs">{[a.marca, a.modelo].filter(Boolean).join(' · ')}</p>
                        )}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className="text-white/50 text-xs font-mono">{a.codigo}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-white/60 text-xs">{TIPO_CFG[a.tipo]?.label ?? a.tipo}</span>
            </td>
            <td className="px-4 py-3">
                {a.almacen?.nombre
                    ? <span className="flex items-center gap-1 text-white/50 text-xs"><WarehouseIcon className="w-3 h-3" />{a.almacen.nombre}</span>
                    : <span className="text-white/25 text-xs">—</span>}
            </td>
            <td className="px-4 py-3">
                <span className="text-white/60 text-xs">Bs. {Number(a.costo_dia_uso ?? 0).toFixed(2)}</span>
            </td>
            <td className="px-4 py-3">
                <MantenimientoBar porcentaje={a.porcentaje_hasta_mantenimiento} necesita={a.necesita_mantenimiento} />
            </td>
            <td className="px-4 py-3">
                <EstadoBadge estado={a.estado} />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canEditar && (
                        <button onClick={() => onEdit(a)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/50 hover:text-blue-300 transition-all" title="Editar">
                            <Edit className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {canEliminar && (
                        <button onClick={() => onEliminar(a)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 transition-all" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </td>
        </motion.tr>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ActivosIndex() {
    const { hasPermission } = useAuth();
    const canCrear    = hasPermission('activos.crear');
    const canEditar   = hasPermission('activos.editar');
    const canEliminar = hasPermission('activos.eliminar');

    const [activos, setActivos] = useState([]);
    const [meta, setMeta]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [modal, setModal]     = useState(null); // null | { mode: 'crear'|'editar', activo? }

    const [filtros, setFiltros] = useState({ buscar: '', tipo: 'todos', estado: 'todos' });
    const [pagina, setPagina]   = useState(1);

    const cargar = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await activoService.listar({
                buscar: filtros.buscar || undefined,
                tipo: filtros.tipo === 'todos' ? undefined : filtros.tipo,
                estado: filtros.estado === 'todos' ? undefined : filtros.estado,
                page,
                per_page: 15,
            });
            const paginador = res.data ?? {};
            setActivos(paginador.data ?? []);
            setMeta({
                current_page: paginador.current_page ?? 1,
                last_page: paginador.last_page ?? 1,
                total: paginador.total ?? 0,
                from: paginador.from ?? 0,
                to: paginador.to ?? 0,
            });
        } catch {
            toast.error('Error al cargar activos.');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        setPagina(1);
        cargar(1);
    }, [filtros]);

    const handleEliminar = async (a) => {
        if (!window.confirm(`¿Eliminar el activo "${a.nombre}"?`)) return;
        try {
            await activoService.eliminar(a.id);
            toast.success('Activo eliminado.');
            cargar(pagina);
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al eliminar.');
        }
    };

    const handleGuardado = () => {
        setModal(null);
        cargar(pagina);
    };

    return (
        <div className="min-h-screen p-6 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/30 to-purple-500/20 border border-white/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-violet-300" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">Maquinaria y Herramientas</h1>
                        <p className="text-white/40 text-xs">Gestión de activos: maquinaria, equipos, herramientas y vehículos</p>
                    </div>
                </div>
                {canCrear && (
                    <button onClick={() => setModal({ mode: 'crear' })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-900/30 transition-all">
                        <Plus className="w-4 h-4" /> Nuevo Activo
                    </button>
                )}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    <input
                        value={filtros.buscar}
                        onChange={e => setFiltros(p => ({ ...p, buscar: e.target.value }))}
                        placeholder="Buscar por nombre o código…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all"
                    />
                </div>

                <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                    <option value="todos">Todos los tipos</option>
                    {Object.entries(TIPO_CFG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                    ))}
                </select>

                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                    <option value="todos">Todos los estados</option>
                    {Object.entries(ESTADO_CFG).map(([val, cfg]) => (
                        <option key={val} value={val}>{cfg.label}</option>
                    ))}
                </select>

                <button onClick={() => cargar(pagina)}
                    className="p-2 rounded-xl bg-white/[0.06] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Tabla */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden">
                {loading ? (
                    <div className="py-16 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    </div>
                ) : activos.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3 text-white/30">
                        <Wrench className="w-10 h-10" />
                        <p className="text-sm">No hay activos registrados</p>
                        {canCrear && (
                            <button onClick={() => setModal({ mode: 'crear' })}
                                className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
                                + Crear el primero
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/8">
                                    {['Activo', 'Código', 'Tipo', 'Ubicación', 'Costo/día', 'Mantenimiento', 'Estado', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {activos.map(a => (
                                        <ActivoRow key={a.id} a={a}
                                            onEdit={av => setModal({ mode: 'editar', activo: av })}
                                            onEliminar={handleEliminar}
                                            canEditar={canEditar}
                                            canEliminar={canEliminar}
                                        />
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {meta && meta.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
                        <span className="text-white/40 text-xs">
                            {meta.from}–{meta.to} de {meta.total} activos
                        </span>
                        <div className="flex gap-2">
                            <button disabled={pagina <= 1}
                                onClick={() => { setPagina(p => p - 1); cargar(pagina - 1); }}
                                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-white/40 text-xs">{pagina} / {meta.last_page}</span>
                            <button disabled={pagina >= meta.last_page}
                                onClick={() => { setPagina(p => p + 1); cargar(pagina + 1); }}
                                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {modal && (
                    <ActivoFormModal
                        activo={modal.mode === 'editar' ? modal.activo : null}
                        onClose={() => setModal(null)}
                        onGuardado={handleGuardado}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
