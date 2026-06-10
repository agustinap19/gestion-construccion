import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import proyectoService from '../../../services/proyectoService';
import Skeleton from '../../../components/ui/Skeleton';
import BotonExportar from '../../../components/ui/BotonExportar';
import {
    Briefcase, Plus, Search, Eye, Edit, Trash, TrendingUp,
    Users, Building, Activity, ChevronLeft, ChevronRight, X,
    Archive, BarChart3
} from '../../../components/icons/Icons';

/* ── Helpers ── */
const presupuestoEfectivo = (p) =>
    parseFloat(p.monto_contractual || p.monto_contrato || p.presupuesto_referencial || 0);

const fmtMonto = (val) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000)     return `${(val / 1_000).toFixed(1)}K`;
    return val.toLocaleString('es-BO', { maximumFractionDigits: 0 });
};

/* ── Design tokens ── */
const ESTADO_META = {
    formulacion:  { label: 'Formulación',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
    licitacion:   { label: 'Licitación',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)'  },
    adjudicado:   { label: 'Adjudicado',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
    en_ejecucion: { label: 'En Ejecución', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)'  },
    pausado:      { label: 'Pausado',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)'  },
    finalizado:   { label: 'Finalizado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)'  },
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
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap">
            {m.label}
        </span>
    );
};

const PrioridadBadge = ({ prioridad }) => {
    const m = PRIORIDAD_META[prioridad] || PRIORIDAD_META.media;
    return (
        <div className="flex items-center gap-1.5">
            <span style={{ background: m.color }} className="w-2 h-2 rounded-full shrink-0" />
            <span className="text-xs text-slate-400">{m.label}</span>
        </div>
    );
};

const ProgBar = ({ pct }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const color = p >= 80 ? '#34d399' : p >= 40 ? '#60a5fa' : '#fbbf24';
    return (
        <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.07]">
                <div style={{ width: `${p}%`, background: color }} className="h-full rounded-full transition-all" />
            </div>
            <span className="text-[11px] text-slate-400 w-8 text-right tabular-nums">{p.toFixed(0)}%</span>
        </div>
    );
};

const glassSelect = 'bg-white/[0.05] border border-white/[0.09] text-slate-200 text-sm rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all';

/* ── Component ── */
const ListaProyectos = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [proyectos, setProyectos]       = useState([]);
    const [stats, setStats]               = useState(null);
    const [cargando, setCargando]         = useState(true);
    const [cargandoStats, setCargandoStats] = useState(true);

    const [filtros, setFiltros] = useState({
        busqueda: '', categoria: 'todos', estado: 'todos', prioridad: 'todos', archivados: false,
    });
    const [pagina, setPagina] = useState({ actual: 1, total: 1, totalReg: 0, porPagina: 20 });

    const [archivar, setArchivar]         = useState(null);
    const [razonArchivar, setRazonArchivar] = useState('');
    const [archivando, setArchivando]     = useState(false);

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
            if (filtros.busqueda)              filtrosApi.busqueda  = filtros.busqueda;
            if (filtros.categoria !== 'todos') filtrosApi.categoria = filtros.categoria;
            if (filtros.estado    !== 'todos') filtrosApi.estado    = filtros.estado;
            if (filtros.prioridad !== 'todos') filtrosApi.prioridad = filtros.prioridad;
            if (filtros.archivados)            filtrosApi.archivados = true;

            const res = await proyectoService.listar(filtrosApi, pagina.actual, pagina.porPagina);
            setProyectos(res?.data ?? []);
            setPagina(p => ({
                ...p,
                actual:   res?.current_page ?? 1,
                total:    res?.last_page    ?? 1,
                totalReg: res?.total        ?? 0,
            }));
        } catch {
            toast.error('Error al cargar proyectos');
        } finally {
            setCargando(false);
        }
    }, [filtros, pagina.actual, pagina.porPagina]);

    useEffect(() => { cargar(); }, [cargar]);

    const setFiltro = (k, v) => {
        setFiltros(p => ({ ...p, [k]: v }));
        setPagina(p => ({ ...p, actual: 1 }));
    };

    const handleArchivar = async () => {
        if (!razonArchivar.trim()) { toast.error('La razón es obligatoria'); return; }
        try {
            setArchivando(true);
            await proyectoService.eliminar(archivar.id, razonArchivar);
            toast.success('Proyecto archivado');
            setArchivar(null);
            setRazonArchivar('');
            cargar();
            proyectoService.obtenerEstadisticas().then(s => setStats(s)).catch(() => {});
        } catch (e) {
            toast.error(e.message || 'Error al archivar');
        } finally {
            setArchivando(false);
        }
    };

    /* ── Stats cards config ── */
    const statItems = [
        {
            label: 'En Ejecución',
            val:   stats?.por_estado?.en_ejecucion ?? 0,
            color: '#34d399',
            icon:  Activity,
            cls:   'from-emerald-500/15 to-teal-500/5 border-emerald-500/20',
        },
        {
            label: 'Total Proyectos',
            val:   stats?.total ?? pagina.totalReg,
            color: '#60a5fa',
            icon:  Briefcase,
            cls:   'from-blue-500/15 to-indigo-500/5 border-blue-500/20',
        },
        {
            label: 'Sociales',
            val:   stats?.por_categoria?.social ?? 0,
            color: '#22d3ee',
            icon:  Users,
            cls:   'from-cyan-500/15 to-sky-500/5 border-cyan-500/20',
        },
        {
            label: 'Avance Promedio',
            val:   `${parseFloat(stats?.avance_promedio ?? 0).toFixed(1)}%`,
            color: '#fbbf24',
            icon:  TrendingUp,
            cls:   'from-amber-500/15 to-yellow-500/5 border-amber-500/20',
        },
    ];

    const hayFiltros = filtros.busqueda || filtros.categoria !== 'todos' ||
                       filtros.estado !== 'todos' || filtros.prioridad !== 'todos';

    return (
        <div className="animate-fade-in space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-500/20">
                        <Briefcase size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">Proyectos</h1>
                        <p className="text-xs text-slate-500">
                            {cargandoStats
                                ? 'Cargando…'
                                : `${pagina.totalReg} proyecto${pagina.totalReg !== 1 ? 's' : ''} registrado${pagina.totalReg !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <BotonExportar
                        url="/exportar/proyectos"
                        filtros={{
                            ...(filtros.estado    !== 'todos' && { estado:    filtros.estado    }),
                            ...(filtros.categoria !== 'todos' && { categoria: filtros.categoria }),
                        }}
                        formatos={[
                            { tipo: 'pdf',   label: 'Lista PDF'   },
                            { tipo: 'excel', label: 'Lista Excel' },
                        ]}
                    />
                    {hasPermission('proyectos.crear') && !filtros.archivados && (
                        <button
                            onClick={() => navigate('/dashboard/proyectos/crear')}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30 transition-all">
                            <Plus size={16} /> Nuevo Proyecto
                        </button>
                    )}
                </div>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cargandoStats
                    ? [1,2,3,4].map(i => <Skeleton key={i} height="80px" className="rounded-2xl" />)
                    : statItems.map((s, i) => (
                        <div key={i} className={`rounded-2xl px-4 py-3.5 flex items-center gap-3 bg-gradient-to-br border ${s.cls}`}>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: s.color + '22', border: `1px solid ${s.color}44` }}>
                                <s.icon size={18} style={{ color: s.color }} />
                            </div>
                            <div>
                                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium leading-none">{s.label}</p>
                                <p className="text-xl font-bold text-white leading-snug mt-0.5">{s.val}</p>
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* ── Toolbar ── */}
            <div className="rounded-2xl p-3.5 flex flex-wrap gap-2.5 items-center bg-white/[0.03] border border-white/[0.07]">
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <input
                        value={filtros.busqueda}
                        onChange={e => setFiltro('busqueda', e.target.value)}
                        placeholder="Buscar por código o nombre..."
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl outline-none text-slate-200 placeholder-slate-600
                            bg-white/[0.05] border border-white/[0.09]
                            focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40 transition-all"
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

                {hayFiltros && (
                    <button
                        onClick={() => setFiltros({ busqueda: '', categoria: 'todos', estado: 'todos', prioridad: 'todos', archivados: false })}
                        className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all flex items-center gap-1.5">
                        <X size={12} /> Limpiar
                    </button>
                )}

                <div className="flex-1 hidden md:block" />

                <button
                    onClick={() => setFiltro('archivados', !filtros.archivados)}
                    className={`px-3 py-2 text-sm rounded-xl font-medium flex items-center gap-2 transition-all border ${
                        filtros.archivados
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-white/[0.04] text-slate-400 border-white/[0.09] hover:bg-white/[0.08] hover:text-slate-200'
                    }`}>
                    <Archive size={15} />
                    {filtros.archivados ? 'Ver Activos' : 'Archivados'}
                </button>
            </div>

            {/* ── Cards ── */}
            {cargando ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[1,2,3,4,5,6].map(i => <Skeleton key={i} height="160px" className="rounded-2xl" />)}
                </div>
            ) : proyectos.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/[0.07]">
                    <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                        <Briefcase size={28} className="text-slate-600" />
                    </div>
                    <div className="text-center">
                        <p className="text-slate-400 font-medium">No se encontraron proyectos</p>
                        <p className="text-slate-600 text-sm mt-1">
                            {hayFiltros ? 'Prueba cambiando los filtros' : 'Crea el primer proyecto para comenzar'}
                        </p>
                    </div>
                    {hasPermission('proyectos.crear') && !filtros.archivados && !hayFiltros && (
                        <button
                            onClick={() => navigate('/dashboard/proyectos/crear')}
                            className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 transition-all">
                            Crear primer proyecto
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {proyectos.map(p => {
                            const monto    = presupuestoEfectivo(p);
                            const entidad  = p.entidad_estatal?.nombre || p.entidadEstatal?.nombre || p.cliente?.nombre_completo || null;
                            const esSocial = p.categoria === 'social';
                            const pct      = Math.min(100, Math.max(0, parseFloat(p.avance_fisico ?? p.porcentaje_avance ?? 0)));
                            const barColor = pct >= 80 ? '#34d399' : pct >= 40 ? '#60a5fa' : '#fbbf24';
                            const estadoM  = ESTADO_META[p.estado] || ESTADO_META.formulacion;
                            const priorM   = PRIORIDAD_META[p.prioridad] || PRIORIDAD_META.media;

                            return (
                                <div key={p.id}
                                    className="group relative flex flex-col gap-3 p-4 rounded-2xl border transition-all cursor-pointer hover:border-white/[0.15] hover:bg-white/[0.04]"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                    onClick={() => navigate(`/dashboard/proyectos/${p.id}`)}>

                                    {/* Acciones — aparecen al hover */}
                                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => navigate(`/dashboard/proyectos/${p.id}`)}
                                            title="Ver detalle"
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-emerald-400 hover:bg-white/[0.1] transition-all">
                                            <Eye size={13} />
                                        </button>
                                        {hasPermission('proyectos.editar') && !filtros.archivados && !['finalizado', 'cancelado', 'pausado'].includes(p.estado) && (
                                            <button
                                                onClick={() => navigate(`/dashboard/proyectos/${p.id}/editar`)}
                                                title="Editar"
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-blue-400 hover:bg-white/[0.1] transition-all">
                                                <Edit size={13} />
                                            </button>
                                        )}
                                        {hasPermission('proyectos.eliminar') && !filtros.archivados && ['finalizado', 'cancelado', 'pausado'].includes(p.estado) && (
                                            <button
                                                onClick={() => { setArchivar(p); setRazonArchivar(''); }}
                                                title="Archivar"
                                                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-amber-400 hover:bg-white/[0.1] transition-all">
                                                <Archive size={13} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Cabecera de la card */}
                                    <div className="flex items-start gap-3 pr-16">
                                        <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                                            style={{
                                                background: esSocial ? 'rgba(34,211,238,0.12)' : 'rgba(167,139,250,0.12)',
                                                border:     `1px solid ${esSocial ? 'rgba(34,211,238,0.25)' : 'rgba(167,139,250,0.25)'}`,
                                                color:      esSocial ? '#22d3ee' : '#a78bfa',
                                            }}>
                                            {esSocial ? 'S' : 'P'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-slate-100 font-semibold text-sm leading-snug hover:text-emerald-400 transition-colors">
                                                {p.nombre}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                <span className="text-[11px] text-slate-500 font-mono">{p.codigo}</span>
                                                {entidad && (
                                                    <>
                                                        <span className="text-slate-700 select-none">·</span>
                                                        <span className="text-[11px] text-slate-500 truncate">{entidad}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Barra de avance */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-[11px] text-slate-500 font-medium">Avance</span>
                                            <span className="text-[11px] font-semibold tabular-nums" style={{ color: barColor }}>{pct.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
                                        </div>
                                    </div>

                                    {/* Footer: estado · presupuesto · prioridad */}
                                    <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                                            style={{ background: estadoM.bg, border: `1px solid ${estadoM.border}`, color: estadoM.color }}>
                                            {estadoM.label}
                                        </span>

                                        <span className="text-slate-200 font-semibold font-mono text-xs">
                                            {monto > 0 ? `Bs. ${fmtMonto(monto)}` : '—'}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: priorM.color }} />
                                            <span className="text-[11px] text-slate-400">{priorM.label}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Paginación */}
                    {pagina.total > 1 && (
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-slate-500">
                                Página {pagina.actual} de {pagina.total}
                                <span className="text-slate-400 ml-1">· {pagina.totalReg} proyectos</span>
                            </span>
                            <div className="flex gap-2">
                                <button
                                    disabled={pagina.actual === 1}
                                    onClick={() => setPagina(p => ({ ...p, actual: p.actual - 1 }))}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08]">
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    disabled={pagina.actual === pagina.total}
                                    onClick={() => setPagina(p => ({ ...p, actual: p.actual + 1 }))}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-all bg-white/[0.04] border border-white/[0.07] hover:bg-white/[0.08]">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Modal archivar ── */}
            {archivar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-full max-w-md rounded-2xl p-6 space-y-4 bg-slate-900/95 border border-white/[0.1]"
                        style={{ boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                                    <Archive size={18} className="text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Archivar Proyecto</h3>
                                    <p className="text-xs text-slate-500">Eliminación lógica, el registro se conserva</p>
                                </div>
                            </div>
                            <button onClick={() => setArchivar(null)} className="text-slate-500 hover:text-white transition-colors mt-0.5">
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-sm text-slate-400">
                            Se archivará <span className="text-white font-medium">"{archivar.nombre}"</span>.
                        </p>

                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                Razón <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={razonArchivar}
                                onChange={e => setRazonArchivar(e.target.value)}
                                rows={3}
                                placeholder="Ej: Proyecto cancelado por el cliente..."
                                className="w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-600 resize-none outline-none
                                    bg-white/[0.05] border border-white/[0.09]
                                    focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-1">
                            <button
                                onClick={() => setArchivar(null)}
                                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-all bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.1]">
                                Cancelar
                            </button>
                            <button
                                onClick={handleArchivar}
                                disabled={archivando || !razonArchivar.trim()}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all
                                    bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-900/30">
                                {archivando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                <Archive size={14} /> Archivar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ListaProyectos;
