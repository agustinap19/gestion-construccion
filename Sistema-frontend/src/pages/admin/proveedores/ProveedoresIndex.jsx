import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
    Truck, Plus, Search, Filter, RefreshCw, Edit, Eye,
    Building2, User, Phone, Mail, MapPin, AlertCircle,
    CheckCircle, Lock, Users, TrendingUp
} from '../../../components/icons/Icons';
import { proveedorService } from '../../../services/proveedorService';
import ProveedorFormModal from './ProveedorFormModal';

// ── helpers ───────────────────────────────────────────────────────────────────
const ESTADO_CFG = {
    activo:    { label: 'Activo',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    inactivo:  { label: 'Inactivo',  cls: 'bg-slate-500/15  text-slate-300  border-slate-500/30'  },
    bloqueado: { label: 'Bloqueado', cls: 'bg-red-500/15    text-red-300    border-red-500/30'    },
};

const TIPO_CFG = {
    empresa:        { label: 'Empresa',        icon: Building2 },
    persona_natural:{ label: 'Persona Natural', icon: User      },
};

function EstadoBadge({ estado }) {
    const cfg = ESTADO_CFG[estado] ?? ESTADO_CFG.inactivo;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
            {cfg.label}
        </span>
    );
}

function Stars({ value }) {
    const n = parseFloat(value) || 0;
    return (
        <span className="flex items-center gap-0.5">
            {[1,2,3,4,5].map(i => (
                <span key={i} className={`text-xs ${i <= Math.round(n) ? 'text-amber-400' : 'text-white/15'}`}>★</span>
            ))}
            <span className="text-white/40 text-xs ml-1">{n.toFixed(1)}</span>
        </span>
    );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color }) {
    return (
        <div className="rounded-2xl bg-white/[0.04] border border-white/8 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-white/40 text-xs">{label}</p>
                <p className="text-white text-xl font-bold">{value}</p>
            </div>
        </div>
    );
}

// ── Row ───────────────────────────────────────────────────────────────────────
function ProveedorRow({ p, onEdit, onVer, onEstado }) {
    const TipoIcon = TIPO_CFG[p.tipo]?.icon ?? Building2;
    return (
        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <TipoIcon className="w-4 h-4 text-violet-300" />
                    </div>
                    <div>
                        <p className="text-white text-sm font-medium leading-tight">{p.razon_social}</p>
                        {p.nombre_comercial && <p className="text-white/40 text-xs">{p.nombre_comercial}</p>}
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <span className="text-white/50 text-xs font-mono">{p.codigo}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-white/50 text-xs">{p.nit ?? '—'}</span>
            </td>
            <td className="px-4 py-3">
                <span className="text-white/60 text-xs">{p.categoria?.nombre ?? '—'}</span>
            </td>
            <td className="px-4 py-3">
                {p.telefono_principal
                    ? <span className="flex items-center gap-1 text-white/50 text-xs"><Phone className="w-3 h-3" />{p.telefono_principal}</span>
                    : <span className="text-white/25 text-xs">—</span>}
            </td>
            <td className="px-4 py-3">
                {p.calificacion ? <Stars value={p.calificacion} /> : <span className="text-white/25 text-xs">—</span>}
            </td>
            <td className="px-4 py-3">
                <EstadoBadge estado={p.estado} />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onVer(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-violet-500/20 text-white/50 hover:text-violet-300 transition-all" title="Ver detalle">
                        <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onEdit(p)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-blue-500/20 text-white/50 hover:text-blue-300 transition-all" title="Editar">
                        <Edit className="w-3.5 h-3.5" />
                    </button>
                    {p.estado === 'activo'
                        ? <button onClick={() => onEstado(p, 'inactivo')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/50 hover:text-amber-300 transition-all" title="Desactivar">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </button>
                        : <button onClick={() => onEstado(p, 'activo')}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-white/50 hover:text-emerald-300 transition-all" title="Activar">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                    }
                </div>
            </td>
        </motion.tr>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProveedoresIndex() {
    const navigate = useNavigate();

    const [proveedores, setProveedores] = useState([]);
    const [meta, setMeta]               = useState(null);
    const [stats, setStats]             = useState(null);
    const [loading, setLoading]         = useState(true);
    const [modal, setModal]             = useState(null); // null | { mode: 'crear'|'editar', proveedor? }

    const [filtros, setFiltros] = useState({
        busqueda: '', estado: 'todos', tipo: 'todos', categoria_id: '',
    });
    const [categorias, setCategorias] = useState([]);
    const [pagina, setPagina]         = useState(1);

    const cargar = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const [listRes, statsRes, catsRes] = await Promise.all([
                proveedorService.listar({ ...filtros, estado: filtros.estado === 'todos' ? undefined : filtros.estado, tipo: filtros.tipo === 'todos' ? undefined : filtros.tipo, page, per_page: 15 }),
                proveedorService.estadisticas(),
                proveedorService.categorias(),
            ]);
            setProveedores(listRes.data?.data ?? []);
            setMeta(listRes.data?.meta ?? null);
            setStats(statsRes.data ?? null);
            setCategorias(catsRes.data || []);
        } catch {
            toast.error('Error al cargar proveedores.');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        setPagina(1);
        cargar(1);
    }, [filtros]);

    const handleEstado = async (p, nuevoEstado) => {
        try {
            await proveedorService.cambiarEstado(p.id, nuevoEstado);
            toast.success(`Proveedor ${nuevoEstado === 'activo' ? 'activado' : 'desactivado'}.`);
            cargar(pagina);
        } catch {
            toast.error('Error al cambiar estado.');
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
                        <Truck className="w-5 h-5 text-violet-300" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">Proveedores</h1>
                        <p className="text-white/40 text-xs">Gestión de proveedores de materiales y servicios</p>
                    </div>
                </div>
                <button onClick={() => setModal({ mode: 'crear' })}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium hover:from-violet-500 hover:to-purple-500 shadow-lg shadow-violet-900/30 transition-all">
                    <Plus className="w-4 h-4" /> Nuevo Proveedor
                </button>
            </div>

            {/* KPIs */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <KpiCard label="Total" value={stats.total} icon={Users} color="bg-violet-500/20 text-violet-300" />
                    <KpiCard label="Activos" value={stats.activos} icon={CheckCircle} color="bg-emerald-500/20 text-emerald-300" />
                    <KpiCard label="Inactivos" value={stats.inactivos} icon={AlertCircle} color="bg-amber-500/20 text-amber-300" />
                    <KpiCard label="Bloqueados" value={stats.bloqueados} icon={Lock} color="bg-red-500/20 text-red-300" />
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                    <input
                        value={filtros.busqueda}
                        onChange={e => setFiltros(p => ({ ...p, busqueda: e.target.value }))}
                        placeholder="Buscar por nombre, código o NIT…"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all"
                    />
                </div>

                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="bloqueado">Bloqueado</option>
                </select>

                <select value={filtros.tipo} onChange={e => setFiltros(p => ({ ...p, tipo: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                    <option value="todos">Todos los tipos</option>
                    <option value="empresa">Empresa</option>
                    <option value="persona_natural">Persona Natural</option>
                </select>

                <select value={filtros.categoria_id} onChange={e => setFiltros(p => ({ ...p, categoria_id: e.target.value }))}
                    className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
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
                ) : proveedores.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3 text-white/30">
                        <Truck className="w-10 h-10" />
                        <p className="text-sm">No hay proveedores registrados</p>
                        <button onClick={() => setModal({ mode: 'crear' })}
                            className="text-violet-400 text-sm hover:text-violet-300 transition-colors">
                            + Crear el primero
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/8">
                                    {['Proveedor', 'Código', 'NIT/CI', 'Categoría', 'Teléfono', 'Calificación', 'Estado', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {proveedores.map(p => (
                                        <ProveedorRow key={p.id} p={p}
                                            onVer={pv => navigate(`/dashboard/proveedores/${pv.id}`)}
                                            onEdit={pv => setModal({ mode: 'editar', proveedor: pv })}
                                            onEstado={handleEstado}
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
                            {meta.from}–{meta.to} de {meta.total} proveedores
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
                    <ProveedorFormModal
                        proveedor={modal.mode === 'editar' ? modal.proveedor : null}
                        onClose={() => setModal(null)}
                        onGuardado={handleGuardado}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
