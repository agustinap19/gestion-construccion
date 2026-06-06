import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import proyectoService from '../../../services/proyectoService';
import Skeleton from '../../../components/ui/Skeleton';
import BotonExportar from '../../../components/ui/BotonExportar';
import {
    Briefcase, Plus, Search, Eye, Edit, Trash, TrendingUp,
    Users, Building, MapPin, Activity, ChevronLeft, ChevronRight, X
} from '../../../components/icons/Icons';
import { Archive } from 'lucide-react';

/* ── Design tokens ── */
const ESTADO_META = {
    formulacion:  { label: 'Formulación',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
    licitacion:   { label: 'Licitación',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
    adjudicado:   { label: 'Adjudicado',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
    en_ejecucion: { label: 'En Ejecución', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    pausado:      { label: 'Pausado',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
    finalizado:   { label: 'Finalizado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    cancelado:    { label: 'Cancelado',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
};
const PRIORIDAD_META = {
    baja:    { label: 'Baja',    color: '#64748b' },
    media:   { label: 'Media',   color: '#60a5fa' },
    alta:    { label: 'Alta',    color: '#fbbf24' },
    critica: { label: 'Crítica', color: '#f87171' },
};

const EstadoPill = ({ estado }) => {
    const m = ESTADO_META[estado] || ESTADO_META.formulacion;
    return (
        <span style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap">
            {m.label}
        </span>
    );
};

const PrioridadDot = ({ prioridad }) => {
    const m = PRIORIDAD_META[prioridad] || PRIORIDAD_META.media;
    return <span style={{ background: m.color }} className="w-2 h-2 rounded-full inline-block" title={m.label} />;
};

const ProgBar = ({ pct }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const color = p >= 80 ? '#34d399' : p >= 40 ? '#60a5fa' : '#fbbf24';
    return (
        <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ width: `${p}%`, background: color }} className="h-full rounded-full transition-all" />
            </div>
            <span className="text-[11px] text-slate-400 w-7 text-right">{p.toFixed(0)}%</span>
        </div>
    );
};

const glassSelect = 'bg-white/[0.05] border border-white/[0.09] text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all';

/* ── Component ── */
const ListaProyectos = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [proyectos, setProyectos] = useState([]);
    const [stats, setStats] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [cargandoStats, setCargandoStats] = useState(true);

    const [filtros, setFiltros] = useState({ busqueda: '', categoria: 'todos', estado: 'todos', prioridad: 'todos', archivados: false });
    const [pagina, setPagina] = useState({ actual: 1, total: 1, totalReg: 0, porPagina: 20 });

    const [archivar, setArchivar] = useState(null);
    const [razonArchivar, setRazonArchivar] = useState('');
    const [archivando, setArchivando] = useState(false);

    useEffect(() => {
        proyectoService.obtenerEstadisticas()
            .then(s => setStats(s))
            .catch(() => {})
            .finally(() => setCargandoStats(false));
    }, []);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            const filtrosApi = {};
            if (filtros.busqueda) filtrosApi.busqueda = filtros.busqueda;
            if (filtros.categoria !== 'todos') filtrosApi.categoria = filtros.categoria;
            if (filtros.estado !== 'todos') filtrosApi.estado = filtros.estado;
            if (filtros.prioridad !== 'todos') filtrosApi.prioridad = filtros.prioridad;
            if (filtros.archivados) filtrosApi.archivados = true;

            const res = await proyectoService.listar(filtrosApi, pagina.actual, pagina.porPagina);
            setProyectos(res?.data ?? []);
            setPagina(p => ({ ...p, actual: res?.current_page ?? 1, total: res?.last_page ?? 1, totalReg: res?.total ?? 0 }));
        } catch { toast.error('Error al cargar proyectos'); }
        finally { setCargando(false); }
    }, [filtros, pagina.actual, pagina.porPagina]);

    useEffect(() => { cargar(); }, [cargar]);

    const setFiltro = (k, v) => { setFiltros(p => ({ ...p, [k]: v })); setPagina(p => ({ ...p, actual: 1 })); };

    const handleArchivar = async () => {
        if (!razonArchivar.trim()) { toast.error('La razón es obligatoria'); return; }
        try {
            setArchivando(true);
            await proyectoService.eliminar(archivar.id, razonArchivar);
            toast.success('Proyecto archivado');
            setArchivar(null); setRazonArchivar('');
            cargar();
            proyectoService.obtenerEstadisticas().then(s => setStats(s)).catch(() => {});
        } catch (e) { toast.error(e.message || 'Error al archivar'); }
        finally { setArchivando(false); }
    };

    /* ── Stats bar ── */
    const statItems = cargandoStats ? [] : [
        { label: 'En Ejecución', val: stats?.por_estado?.en_ejecucion ?? 0, color: '#34d399', icon: Activity },
        { label: 'Sociales',     val: stats?.por_categoria?.social   ?? 0, color: '#22d3ee', icon: Users },
        { label: 'Privados',     val: stats?.por_categoria?.privado  ?? 0, color: '#a78bfa', icon: Building },
        { label: 'Avance Prom.', val: (stats?.avance_promedio ?? 0) + '%',  color: '#fbbf24', icon: TrendingUp },
    ];

    return (
        <div className="animate-fade-in space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        <Briefcase size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Proyectos</h1>
                        <p className="text-xs text-slate-500">Gestión de proyectos de construcción</p>
                    </div>
                </div>
                {hasPermission('proyectos.crear') && !filtros.archivados && (
                    <button onClick={() => navigate('/dashboard/proyectos/crear')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                        <Plus size={16} /> Nuevo Proyecto
                    </button>
                )}
            </div>

            {/* Stats */}
            {cargandoStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} height="72px" className="rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {statItems.map((s, i) => (
                        <div key={i} className="rounded-2xl px-4 py-3 flex items-center gap-3"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: s.color + '1a', border: `1px solid ${s.color}33` }}>
                                <s.icon size={17} style={{ color: s.color }} />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase tracking-wide">{s.label}</p>
                                <p className="text-lg font-bold text-white leading-tight">{s.val}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        value={filtros.busqueda}
                        onChange={e => setFiltro('busqueda', e.target.value)}
                        placeholder="Buscar por código o nombre..."
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none text-slate-200 placeholder-slate-600 bg-white/[0.05] border border-white/[0.09] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
                    />
                </div>
                <select className={glassSelect} value={filtros.categoria} onChange={e => setFiltro('categoria', e.target.value)}>
                    <option value="todos">Todas las categorías</option>
                    <option value="social">Social</option>
                    <option value="privado">Privado</option>
                </select>
                <select className={glassSelect} value={filtros.estado} onChange={e => setFiltro('estado', e.target.value)}>
                    <option value="todos">Todos los estados</option>
                    <option value="formulacion">Formulación</option>
                    <option value="licitacion">Licitación</option>
                    <option value="adjudicado">Adjudicado</option>
                    <option value="en_ejecucion">En Ejecución</option>
                    <option value="pausado">Pausado</option>
                    <option value="finalizado">Finalizado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
                <select className={glassSelect} value={filtros.prioridad} onChange={e => setFiltro('prioridad', e.target.value)}>
                    <option value="todos">Todas las prioridades</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                </select>
                {(filtros.busqueda || filtros.categoria !== 'todos' || filtros.estado !== 'todos' || filtros.prioridad !== 'todos') && (
                    <button onClick={() => setFiltros({ busqueda: '', categoria: 'todos', estado: 'todos', prioridad: 'todos', archivados: false })}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all flex items-center gap-1.5">
                        <X size={12} /> Limpiar
                    </button>
                )}
                
                <div className="flex-1"></div>

                <button 
                    onClick={() => setFiltro('archivados', !filtros.archivados)}
                    className={`px-3 py-2 text-sm rounded-xl outline-none font-medium flex items-center gap-2 transition-all ${
                        filtros.archivados 
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                            : 'bg-white/[0.05] text-slate-200 border border-white/[0.09] hover:bg-white/[0.1]'
                    }`}
                >
                    <Archive size={16} />
                    {filtros.archivados ? 'Ver Activos' : 'Archivados'}
                </button>

                <BotonExportar
                    url="/exportar/proyectos"
                    filtros={{
                        ...(filtros.estado !== 'todos' && { estado: filtros.estado }),
                        ...(filtros.categoria !== 'todos' && { categoria: filtros.categoria }),
                    }}
                    formatos={[
                        { tipo: 'pdf',   label: 'Lista PDF'   },
                        { tipo: 'excel', label: 'Lista Excel' },
                    ]}
                />
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {cargando ? (
                    <div className="p-8 space-y-3">
                        {[1,2,3,4,5].map(i => <Skeleton key={i} height="44px" className="rounded-xl" />)}
                    </div>
                ) : proyectos.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3">
                        <Briefcase size={32} className="text-slate-600" />
                        <p className="text-slate-500 text-sm">No se encontraron proyectos</p>
                        {hasPermission('proyectos.crear') && !filtros.archivados && (
                            <button onClick={() => navigate('/dashboard/proyectos/crear')}
                                className="mt-1 px-4 py-2 rounded-xl text-sm font-medium text-white"
                                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                Crear primer proyecto
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                        {['Proyecto', 'Categoría', 'Estado', 'Avance', 'Presupuesto', 'Prioridad', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {proyectos.map(p => (
                                        <tr key={p.id} className="group transition-colors hover:bg-white/[0.03]"
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            <td className="px-4 py-3">
                                                <button className="text-left" onClick={() => navigate(`/dashboard/proyectos/${p.id}`)}>
                                                    <p className="text-slate-100 font-medium hover:text-emerald-400 transition-colors truncate max-w-[240px]">{p.nombre}</p>
                                                    <p className="text-[11px] text-slate-500 font-mono">{p.codigo}</p>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span style={{
                                                    background: p.categoria === 'social' ? 'rgba(34,211,238,0.1)' : 'rgba(167,139,250,0.1)',
                                                    border: `1px solid ${p.categoria === 'social' ? 'rgba(34,211,238,0.25)' : 'rgba(167,139,250,0.25)'}`,
                                                    color: p.categoria === 'social' ? '#22d3ee' : '#a78bfa',
                                                }} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize">
                                                    {p.categoria === 'social' ? 'Social' : 'Privado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3"><EstadoPill estado={p.estado} /></td>
                                            <td className="px-4 py-3"><ProgBar pct={p.avance_fisico ?? p.porcentaje_avance ?? 0} /></td>
                                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                                                Bs. {parseFloat(p.presupuesto_referencial || 0).toLocaleString('es-BO')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <PrioridadDot prioridad={p.prioridad} />
                                                    <span className="text-xs text-slate-500 capitalize">{PRIORIDAD_META[p.prioridad]?.label || 'Media'}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => navigate(`/dashboard/proyectos/${p.id}`)}
                                                        title="Ver detalle" className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-white/[0.06] transition-all">
                                                        <Eye size={15} />
                                                    </button>
                                                    {hasPermission('proyectos.editar') && !filtros.archivados && !['finalizado', 'cancelado', 'pausado'].includes(p.estado) && (
                                                        <button onClick={() => navigate(`/dashboard/proyectos/${p.id}/editar`)}
                                                            title="Editar" className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/[0.06] transition-all">
                                                            <Edit size={15} />
                                                        </button>
                                                    )}
                                                    {hasPermission('proyectos.eliminar') && !filtros.archivados && ['finalizado', 'cancelado', 'pausado'].includes(p.estado) && (
                                                        <button onClick={() => { setArchivar(p); setRazonArchivar(''); }}
                                                            title="Archivar" className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/[0.06] transition-all">
                                                            <Trash size={15} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagina.total > 1 && (
                            <div className="px-4 py-3 flex items-center justify-between"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <span className="text-xs text-slate-500">
                                    Página {pagina.actual} de {pagina.total} · {pagina.totalReg} proyectos
                                </span>
                                <div className="flex gap-2">
                                    <button disabled={pagina.actual === 1}
                                        onClick={() => setPagina(p => ({ ...p, actual: p.actual - 1 }))}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button disabled={pagina.actual === pagina.total}
                                        onClick={() => setPagina(p => ({ ...p, actual: p.actual + 1 }))}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Archivar modal */}
            {archivar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
                        style={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white">Archivar Proyecto</h3>
                            <button onClick={() => setArchivar(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                        </div>
                        <p className="text-sm text-slate-400">
                            Se archivará <span className="text-white font-medium">"{archivar.nombre}"</span>.
                            Esta es una eliminación lógica, el registro no se borra.
                        </p>
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                Razón <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={razonArchivar}
                                onChange={e => setRazonArchivar(e.target.value)}
                                rows={3}
                                placeholder="Ej: Proyecto cancelado por el cliente..."
                                className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 resize-none outline-none bg-white/[0.05] border border-white/[0.09] focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-1">
                            <button onClick={() => setArchivar(null)}
                                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Cancelar
                            </button>
                            <button onClick={handleArchivar} disabled={archivando}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                                style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.8),rgba(217,119,6,0.8))', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                                {archivando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                Archivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListaProyectos;
