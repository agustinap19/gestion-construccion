import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import BotonExportar from '../../../components/ui/BotonExportar';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import Avatar from '../../../components/ui/Avatar';
import Tooltip from '../../../components/ui/Tooltip';
import {
    Briefcase, Plus, Eye, Shield, Calendar, Users, CheckCircle, XCircle, AlertTriangle,
} from '../../../components/icons/Icons';

/* ── Estado helpers ── */
const ESTADO_LABELS  = { activo: 'Activo', vacaciones: 'De Permiso', licencia: 'En Licencia', desvinculado: 'Desvinculado' };
const ESTADO_COLORS  = {
    activo:      { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  text: '#34d399',  dot: '#10b981' },
    vacaciones:  { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24',  dot: '#f59e0b' },
    licencia:    { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa',  dot: '#3b82f6' },
    desvinculado:{ bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171',  dot: '#ef4444' },
};

const EstadoCell = ({ estado, onClick }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.activo;
    const label = ESTADO_LABELS[estado] || estado;
    return (
        <button type="button" onClick={e => { e.stopPropagation(); onClick(); }}
            title="Clic para cambiar estado"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer hover:brightness-125 active:scale-95"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} /> {label}
        </button>
    );
};

const rolBadge = (personal) => {
    const nombre = personal?.rol?.nombre_visible;
    if (!nombre) return null;
    return <Badge variant="neutral">{nombre}</Badge>;
};

/* ── Component ── */
const ListaPersonal = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [filtros, setFiltros] = useState({ busqueda: '', estado_laboral: 'todos' });
    const [stats, setStats] = useState(null);
    const [vista, setVista] = useState(() => localStorage.getItem('personal_vista') || 'tabla');

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        tipo_contrato: 'todos', tiene_usuario: false, competencias_vencidas: false
    });

    // Quick estado change
    const [quickEstado, setQuickEstado] = useState({ open: false, personalId: null, actual: '', nuevo: '', razon: '' });
    const [quickLoading, setQuickLoading] = useState(false);

    useEffect(() => {
        personalService.obtenerEstadisticas().then(r => setStats(r.data)).catch(() => {});
    }, []);

    const cargar = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = { ...filtros, page };
            if (filtrosAvanzados.tipo_contrato !== 'todos') params.tipo_contrato = filtrosAvanzados.tipo_contrato;
            if (filtrosAvanzados.tiene_usuario) params.tiene_usuario = true;
            if (filtrosAvanzados.competencias_vencidas) params.competencias_vencidas = true;
            Object.keys(params).forEach(k => { if (!params[k] || params[k] === 'todos') delete params[k]; });
            const res = await personalService.listar(params, 15);
            const d = res.data;
            setPersonal(d.data || []);
            setPaginacion({ current_page: d.current_page, last_page: d.last_page, total: d.total, per_page: d.per_page });
        } catch {
            toast.error('Error al cargar la lista de personal');
        } finally { setLoading(false); }
    }, [filtros, filtrosAvanzados]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => {
        const t = setTimeout(() => setFiltros(p => ({ ...p, busqueda: busquedaLocal })), 400);
        return () => clearTimeout(t);
    }, [busquedaLocal]);
    useEffect(() => { localStorage.setItem('personal_vista', vista); }, [vista]);

    const handleQuickEstado = async () => {
        if (!quickEstado.nuevo) return toast.error('Seleccione un estado');
        if (quickEstado.nuevo === 'desvinculado' && !quickEstado.razon) return toast.error('La razón es obligatoria para el egreso');
        try {
            setQuickLoading(true);
            await personalService.cambiarEstadoLaboral(quickEstado.personalId, quickEstado.nuevo, quickEstado.razon || null);
            toast.success('Estado actualizado');
            setQuickEstado({ open: false, personalId: null, actual: '', nuevo: '', razon: '' });
            cargar(paginacion.current_page);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al cambiar estado');
        } finally { setQuickLoading(false); }
    };

    const limpiarFiltros = () => {
        setBusquedaLocal('');
        setFiltros({ busqueda: '', tipo: 'todos', estado_laboral: 'todos' });
        setFiltrosAvanzados({ tipo_contrato: 'todos', tiene_usuario: false, competencias_vencidas: false });
    };

    const renderPaginacion = () => {
        if (paginacion.last_page <= 1) return null;
        const pages = [];
        for (let i = 1; i <= paginacion.last_page; i++) pages.push(i);
        return (
            <div className="flex items-center justify-between mt-6">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                    {((paginacion.current_page - 1) * paginacion.per_page) + 1}–{Math.min(paginacion.current_page * paginacion.per_page, paginacion.total)} de {paginacion.total}
                </span>
                <div className="flex gap-1">
                    {pages.slice(Math.max(0, paginacion.current_page - 3), paginacion.current_page + 2).map(p => (
                        <button key={p} onClick={() => cargar(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === paginacion.current_page
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'text-slate-400 hover:bg-slate-800'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const skeletonRows = () => Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
            {[1, 2, 3, 4, 5, 6, 7].map(j => (
                <td key={j} className="p-3"><Skeleton height="1rem" width={j === 1 ? '60px' : '80%'} /></td>
            ))}
        </tr>
    ));

    return (
        <div className="animate-fade-in">
            <PageHeader title="Personal de la Empresa" subtitle="Gestiona el personal y su información laboral"
                icon={<Briefcase size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <div className="flex items-center gap-2">
                        <BotonExportar
                            url="/exportar/personal"
                            filtros={{
                                ...(filtros.estado_laboral !== 'todos' && { estado_laboral: filtros.estado_laboral }),
                            }}
                            formatos={[
                                { tipo: 'pdf',   label: 'Lista PDF'   },
                                { tipo: 'excel', label: 'Lista Excel' },
                            ]}
                        />
                        <Button leftIcon={<Plus size={18} />} onClick={() => navigate('/dashboard/personal/crear')}>Nuevo Personal</Button>
                    </div>
                } />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Activos',    icon: <CheckCircle size={22} />, value: stats?.total_activos,      color: 'emerald' },
                    { label: 'De Permiso', icon: <Calendar size={22} />,    value: stats?.total_vacaciones,   color: 'amber' },
                    { label: 'Licencia',   icon: <Shield size={22} />,      value: stats?.total_licencia,     color: 'blue' },
                    { label: 'Desvinculados', icon: <XCircle size={22} />, value: stats?.total_desvinculados, color: 'red' },
                ].map(st => (
                    <div key={st.label} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-${st.color}-50 dark:bg-${st.color}-500/10 text-${st.color}-600 dark:text-${st.color}-400`}>
                            {st.icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{st.label}</p>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                {stats ? st.value : <Skeleton width="40px" />}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                <SearchInput value={busquedaLocal} onChange={setBusquedaLocal} placeholder="Buscar nombre, CI, código..." className="w-full sm:w-80" />
                <select value={filtros.estado_laboral} onChange={e => setFiltros(p => ({ ...p, estado_laboral: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="vacaciones">De Permiso</option>
                    <option value="licencia">En Licencia</option>
                    <option value="desvinculado">Desvinculado</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(!drawerOpen)}>Más filtros</Button>
                <div className="ml-auto flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    {['tabla', 'grid'].map(v => (
                        <button key={v} onClick={() => setVista(v)}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${vista === v ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {/* Drawer filtros avanzados */}
            {drawerOpen && (
                <div className="mb-5 p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 rounded-2xl animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Filtros avanzados</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Tipo de Contrato</label>
                            <select value={filtrosAvanzados.tipo_contrato} onChange={e => setFiltrosAvanzados(p => ({ ...p, tipo_contrato: e.target.value }))}
                                className="w-full h-[36px] px-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm outline-none">
                                <option value="todos">Todos</option>
                                <option value="indefinido">Indefinido</option>
                                <option value="plazo_fijo">Plazo Fijo</option>
                                <option value="obra">Por Obra</option>
                                <option value="consultoria">Consultoría</option>
                            </select>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-5">
                            <input type="checkbox" checked={filtrosAvanzados.tiene_usuario} onChange={e => setFiltrosAvanzados(p => ({ ...p, tiene_usuario: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" />
                            Con cuenta de sistema
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer pt-5">
                            <input type="checkbox" checked={filtrosAvanzados.competencias_vencidas} onChange={e => setFiltrosAvanzados(p => ({ ...p, competencias_vencidas: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" />
                            Competencias vencidas
                        </label>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => { setDrawerOpen(false); cargar(); }}>Aplicar</Button>
                        <Button size="sm" variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
                    </div>
                </div>
            )}

            {/* Contenido */}
            {loading ? (
                vista === 'tabla' ? (
                    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-hidden">
                        <table className="w-full"><tbody>{skeletonRows()}</tbody></table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900/40 rounded-2xl border p-5 space-y-3">
                                <Skeleton width="100%" height="4rem" /><Skeleton width="60%" height="1rem" />
                            </div>
                        ))}
                    </div>
                )
            ) : personal.length === 0 ? (
                <EmptyState icon={<Users size={32} />} title="No se encontró personal"
                    description="No hay registros que coincidan."
                    action={<Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>} />
            ) : vista === 'tabla' ? (
                /* VISTA TABLA */
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800/50 text-left">
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">CI</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Nombre Completo</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Código</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Tipo</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Estado</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Sistema</th>
                                <th className="p-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {personal.map(p => (
                                <tr key={p.id} onClick={() => navigate(`/dashboard/personal/${p.id}`)}
                                    className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors group">
                                    <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {p.ci}{p.ci_complemento ? `-${p.ci_complemento}` : ''}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${p.nombre} ${p.apellido_paterno}`} size="sm" />
                                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {p.nombre} {p.apellido_paterno} {p.apellido_materno || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400">{p.codigo_empleado}</td>
                                    <td className="p-3">
                                        <div className="flex flex-col gap-1 items-start">
                                            {rolBadge(p)}
                                            {p.especialidad && (
                                                <span className="text-xs text-slate-500 truncate max-w-[120px]" title={p.especialidad}>{p.especialidad}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <EstadoCell estado={p.estado_laboral}
                                            onClick={() => setQuickEstado({ open: true, personalId: p.id, actual: p.estado_laboral, nuevo: p.estado_laboral, razon: '' })} />
                                    </td>
                                    <td className="p-3">
                                        {p.usuario_id ? (
                                            <Tooltip content={`${p.usuario?.email || 'Con acceso'}`}>
                                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                    <CheckCircle size={16} />
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="Ver detalle">
                                                <button onClick={() => navigate(`/dashboard/personal/${p.id}`)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                                                    <Eye size={16} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                /* VISTA GRID */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personal.map(p => (
                        <div key={p.id} onClick={() => navigate(`/dashboard/personal/${p.id}`)}
                            className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <Avatar name={`${p.nombre} ${p.apellido_paterno}`} size="md" />
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                                            {p.nombre} {p.apellido_paterno}
                                        </p>
                                        <p className="text-xs font-mono text-slate-500">{p.ci}</p>
                                    </div>
                                </div>
                                <div onClick={e => e.stopPropagation()}>
                                    <EstadoCell estado={p.estado_laboral}
                                        onClick={() => setQuickEstado({ open: true, personalId: p.id, actual: p.estado_laboral, nuevo: p.estado_laboral, razon: '' })} />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {rolBadge(p)}
                                {p.usuario_id && (
                                    <Badge variant="success" icon={<CheckCircle size={11} />}>Sistema</Badge>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-2 line-clamp-1">{p.especialidad || 'Sin especialidad'}</p>
                        </div>
                    ))}
                </div>
            )}

            {renderPaginacion()}

            {/* ── Modal Quick Estado ── */}
            <Modal open={quickEstado.open}
                onClose={() => setQuickEstado({ open: false, personalId: null, actual: '', nuevo: '', razon: '' })}
                title="Cambiar Estado Laboral" size="sm"
                footer={<>
                    <Button variant="secondary"
                        onClick={() => setQuickEstado({ open: false, personalId: null, actual: '', nuevo: '', razon: '' })}
                        disabled={quickLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleQuickEstado} loading={quickLoading}
                        variant={quickEstado.nuevo === 'desvinculado' ? 'danger' : 'primary'}>
                        Cambiar
                    </Button>
                </>}>
                <div className="space-y-3">
                    <select value={quickEstado.nuevo} onChange={e => setQuickEstado(p => ({ ...p, nuevo: e.target.value }))}
                        className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                        <option value="">Seleccionar estado...</option>
                        <option value="activo" disabled={quickEstado.actual === 'activo'}>Activo</option>
                        <option value="vacaciones" disabled={quickEstado.actual === 'vacaciones'}>De Permiso</option>
                        <option value="licencia" disabled={quickEstado.actual === 'licencia'}>En Licencia</option>
                        <option value="desvinculado" disabled={quickEstado.actual === 'desvinculado'}>Desvinculado (sale de la empresa)</option>
                    </select>
                    {quickEstado.nuevo === 'desvinculado' && (
                        <div className="space-y-2 animate-fade-in">
                            <div className="p-2.5 rounded-lg flex gap-2 items-center text-xs text-red-400"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertTriangle size={13} className="shrink-0" />
                                Si tiene cuenta de sistema, será suspendida automáticamente.
                            </div>
                            <textarea value={quickEstado.razon} onChange={e => setQuickEstado(p => ({ ...p, razon: e.target.value }))}
                                rows={2} placeholder="Razón del egreso *"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ListaPersonal;
