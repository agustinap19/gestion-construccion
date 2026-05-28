import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
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
import AsignarAccesoModal from './AsignarAccesoModal';
import {
    Users, Plus, Eye, Edit, Trash, Shield, Key, Check, X, AlertTriangle,
} from '../../../components/icons/Icons';

/* ── Estado helpers ── */
const ESTADO_LABELS = { activo: 'Activo', inactivo: 'Inhabilitado', suspendido: 'Suspendido' };
const ESTADO_COLORS = {
    activo:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  text: '#34d399',  dot: '#10b981' },
    inactivo:  { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24',  dot: '#f59e0b' },
    suspendido:{ bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171',  dot: '#ef4444' },
};

const EstadoCell = ({ usuario, onClick }) => {
    const esPendiente = usuario.debe_cambiar_password && !usuario.ultimo_acceso;
    if (esPendiente) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-default"
                style={{ background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.25)', color: '#94a3b8' }}
                title="Pendiente de primer acceso — no se puede cambiar manualmente">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Sin activar
            </span>
        );
    }
    const c = ESTADO_COLORS[usuario.estado] || ESTADO_COLORS.activo;
    const label = ESTADO_LABELS[usuario.estado] || usuario.estado;
    return (
        <button type="button" onClick={e => { e.stopPropagation(); onClick(usuario); }}
            title="Clic para cambiar estado"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 cursor-pointer hover:brightness-125 active:scale-95"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} /> {label}
        </button>
    );
};

const formatRelativo = (fecha) => {
    if (!fecha) return 'Nunca';
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `Hace ${days}d`;
    return new Date(fecha).toLocaleDateString('es-BO');
};

/* ── Glass modal style helpers ── */
const glassSelect = 'w-full h-[42px] px-3 rounded-xl text-sm text-slate-200 outline-none bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40';
const glassTextarea = 'w-full px-3 py-2 rounded-xl text-sm text-slate-200 outline-none resize-none bg-white/[0.05] border border-white/[0.09] focus:ring-2 focus:ring-emerald-500/40';

/* ── Component ── */
const ListaUsuarios = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 15 });
    const [roles, setRoles] = useState([]);
    const [busquedaLocal, setBusquedaLocal] = useState('');
    const [filtros, setFiltros] = useState({ busqueda: '', rol_id: '', estado: 'todos', ordenar_por: 'created_at', direccion: 'desc' });
    const [seleccionados, setSeleccionados] = useState([]);
    const [vista, setVista] = useState(() => localStorage.getItem('usuarios_vista') || 'tabla');

    const [modalAsignar, setModalAsignar] = useState(false);

    // Modales
    const [modalAccion, setModalAccion] = useState({ open: false, accion: '', titulo: '', requiereRazon: false });
    const [razonAccion, setRazonAccion] = useState('');
    const [accionLoading, setAccionLoading] = useState(false);
    const [modalArchivar, setModalArchivar] = useState({ open: false, usuario: null });
    const [archivarLoading, setArchivarLoading] = useState(false);
    const [razonArchivar, setRazonArchivar] = useState('');

    // Quick estado change
    const [quickEstado, setQuickEstado] = useState({ open: false, usuario: null, nuevo: '', razon: '' });
    const [quickLoading, setQuickLoading] = useState(false);

    // Filtros avanzados
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        tiene_2fa: false, con_password_temporal: false, bloqueado: false, ultimo_acceso_dias: ''
    });

    useEffect(() => {
        rolService.listar().then(r => setRoles(r?.data?.data ?? r?.data ?? [])).catch(() => {});
    }, []);

    const cargar = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = { ...filtros, page };
            if (params.estado === 'pendiente') { params.con_password_temporal = true; delete params.estado; }
            if (filtrosAvanzados.tiene_2fa) params.tiene_2fa = true;
            if (filtrosAvanzados.con_password_temporal) params.con_password_temporal = true;
            if (filtrosAvanzados.bloqueado) params.bloqueado = true;
            if (filtrosAvanzados.ultimo_acceso_dias) params.ultimo_acceso_dias = filtrosAvanzados.ultimo_acceso_dias;
            Object.keys(params).forEach(k => { if (!params[k] || params[k] === 'todos') delete params[k]; });
            const res = await usuarioService.listar(params, filtros.per_page || 15);
            const d = res.data;
            setUsuarios(d.data || []);
            setPaginacion({ current_page: d.current_page, last_page: d.last_page, total: d.total, per_page: d.per_page });
        } catch { toast.error('Error al cargar usuarios'); }
        finally { setLoading(false); }
    }, [filtros, filtrosAvanzados]);

    useEffect(() => { cargar(); }, [cargar]);
    useEffect(() => {
        const t = setTimeout(() => setFiltros(p => ({ ...p, busqueda: busquedaLocal })), 400);
        return () => clearTimeout(t);
    }, [busquedaLocal]);
    useEffect(() => { localStorage.setItem('usuarios_vista', vista); }, [vista]);

    const toggleSeleccion = (id) => setSeleccionados(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleTodos = () => setSeleccionados(seleccionados.length === usuarios.length ? [] : usuarios.map(u => u.id));

    const ejecutarAccionMasiva = async () => {
        try {
            setAccionLoading(true);
            const res = await usuarioService.accionMasiva(modalAccion.accion, seleccionados, razonAccion || null);
            const ex = res.data?.exitosos?.length || 0;
            const fa = res.data?.fallidos?.length || 0;
            toast.success(`${ex} usuarios procesados` + (fa > 0 ? `, ${fa} con errores` : ''));
            setModalAccion({ open: false, accion: '', titulo: '', requiereRazon: false });
            setRazonAccion('');
            setSeleccionados([]);
            cargar(paginacion.current_page);
        } catch (e) { toast.error(e.response?.data?.message || 'Error en la acción masiva'); }
        finally { setAccionLoading(false); }
    };

    const handleArchivar = async () => {
        try {
            setArchivarLoading(true);
            await usuarioService.eliminar(modalArchivar.usuario.id, razonArchivar || null);
            toast.success('Usuario archivado');
            setModalArchivar({ open: false, usuario: null });
            setRazonArchivar('');
            cargar(paginacion.current_page);
        } catch (e) { toast.error(e.response?.data?.message || 'Error al archivar'); }
        finally { setArchivarLoading(false); }
    };

    const handleQuickEstado = async () => {
        if (!quickEstado.nuevo) return toast.error('Seleccione un estado');
        if (quickEstado.nuevo === 'suspendido' && !quickEstado.razon) return toast.error('Razón obligatoria para suspender');
        try {
            setQuickLoading(true);
            await usuarioService.cambiarEstado(quickEstado.usuario.id, quickEstado.nuevo, quickEstado.razon || null);
            toast.success('Estado actualizado');
            setQuickEstado({ open: false, usuario: null, nuevo: '', razon: '' });
            cargar(paginacion.current_page);
        } catch (e) { toast.error(e.response?.data?.message || 'Error al cambiar estado'); }
        finally { setQuickLoading(false); }
    };

    const limpiarFiltros = () => {
        setBusquedaLocal('');
        setFiltros({ busqueda: '', rol_id: '', estado: 'todos', ordenar_por: 'created_at', direccion: 'desc' });
        setFiltrosAvanzados({ tiene_2fa: false, con_password_temporal: false, bloqueado: false, ultimo_acceso_dias: '' });
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
        <tr key={i} className="border-b border-slate-800/50">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                <td key={j} className="p-3"><Skeleton width={j === 1 ? '20px' : '80%'} height="1rem" /></td>
            ))}
        </tr>
    ));

    return (
        <div className="animate-fade-in">
            <PageHeader title="Usuarios del Sistema" subtitle="Gestiona las cuentas de acceso"
                icon={<Users size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <div className="flex items-center gap-2">
                        <BotonExportar
                            url="/exportar/usuarios"
                            params={{
                                ...(filtros.estado && filtros.estado !== 'todos' && filtros.estado !== 'pendiente' && { estado: filtros.estado }),
                                ...(filtros.rol_id && { rol_id: filtros.rol_id }),
                            }}
                            formatos={[
                                { tipo: 'pdf',   label: 'Lista PDF'   },
                                { tipo: 'excel', label: 'Lista Excel' },
                            ]}
                        />
                        <Button leftIcon={<Shield size={18} />} onClick={() => setModalAsignar(true)}>Asignar Acceso</Button>
                    </div>
                } />

            {/* Filtros */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                <SearchInput value={busquedaLocal} onChange={setBusquedaLocal} placeholder="Buscar nombre, email, CI..." className="w-full sm:w-80" />
                <select value={filtros.rol_id} onChange={e => setFiltros(p => ({ ...p, rol_id: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                    <option value="">Todos los roles</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible}</option>)}
                </select>
                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inhabilitados</option>
                    <option value="suspendido">Suspendidos</option>
                    <option value="pendiente">Sin activar (primer login)</option>
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { key: 'tiene_2fa', label: 'Con 2FA' },
                            { key: 'con_password_temporal', label: 'Sin activar' },
                            { key: 'bloqueado', label: 'Bloqueados' },
                        ].map(f => (
                            <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input type="checkbox" checked={filtrosAvanzados[f.key]} onChange={e => setFiltrosAvanzados(p => ({ ...p, [f.key]: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" />
                                {f.label}
                            </label>
                        ))}
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Último acceso (días)</label>
                            <input type="number" min="1" max="365" value={filtrosAvanzados.ultimo_acceso_dias}
                                onChange={e => setFiltrosAvanzados(p => ({ ...p, ultimo_acceso_dias: e.target.value }))}
                                className="w-full h-[36px] px-2 mt-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm outline-none" placeholder="30" />
                        </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => { setDrawerOpen(false); cargar(); }}>Aplicar</Button>
                        <Button size="sm" variant="ghost" onClick={limpiarFiltros}>Limpiar</Button>
                    </div>
                </div>
            )}

            {/* Barra acciones masivas */}
            {seleccionados.length > 0 && (
                <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-center gap-3 flex-wrap animate-fade-in">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{seleccionados.length} seleccionados</span>
                    <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => setModalAccion({ open: true, accion: 'activar', titulo: 'Activar usuarios', requiereRazon: false })}>Activar</Button>
                        <Button size="sm" variant="outline" onClick={() => setModalAccion({ open: true, accion: 'desactivar', titulo: 'Inhabilitar usuarios', requiereRazon: false })}>Inhabilitar</Button>
                        <Button size="sm" variant="outline" onClick={() => setModalAccion({ open: true, accion: 'suspender', titulo: 'Suspender usuarios', requiereRazon: true })}>Suspender</Button>
                        <Button size="sm" variant="outline" onClick={() => setModalAccion({ open: true, accion: 'reenviar_password', titulo: 'Reenviar credenciales', requiereRazon: false })}>Reenviar credenciales</Button>
                        <Button size="sm" variant="outline" onClick={() => setModalAccion({ open: true, accion: 'cerrar_sesiones', titulo: 'Cerrar sesiones', requiereRazon: false })}>Cerrar sesiones</Button>
                        <Button size="sm" variant="danger" onClick={() => setModalAccion({ open: true, accion: 'eliminar', titulo: 'Archivar usuarios', requiereRazon: true })}>Archivar</Button>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setSeleccionados([])}>Limpiar</Button>
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
                            <div key={i} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-5 space-y-3">
                                <Skeleton width="100%" height="4rem" /><Skeleton width="60%" height="1rem" />
                            </div>
                        ))}
                    </div>
                )
            ) : usuarios.length === 0 ? (
                <EmptyState icon={<Users size={32} />} title="No se encontraron usuarios"
                    description="No hay usuarios que coincidan con los filtros."
                    action={<Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>} />
            ) : vista === 'tabla' ? (
                /* VISTA TABLA */
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800/50 text-left">
                                <th className="p-3 w-10">
                                    <input type="checkbox" checked={seleccionados.length === usuarios.length && usuarios.length > 0} onChange={toggleTodos} className="w-4 h-4 rounded text-emerald-600" />
                                </th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">CI</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Usuario</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Email</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Rol</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Estado</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Último acceso</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">2FA</th>
                                <th className="p-3 w-20"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id} onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                                    className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors group">
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={seleccionados.includes(u.id)} onChange={() => toggleSeleccion(u.id)} className="w-4 h-4 rounded text-emerald-600" />
                                    </td>
                                    <td className="p-3 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {u.ci}{u.ci_complemento ? `-${u.ci_complemento}` : ''}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${u.nombre} ${u.apellido_paterno}`} size="sm" />
                                            <p className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {u.nombre} {u.apellido_paterno} {u.apellido_materno || ''}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 text-xs">{u.email}</td>
                                    <td className="p-3"><Badge variant="info">{u.rol?.nombre_visible || '—'}</Badge></td>
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <EstadoCell usuario={u} onClick={(usr) => setQuickEstado({ open: true, usuario: usr, nuevo: usr.estado, razon: '' })} />
                                    </td>
                                    <td className="p-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{formatRelativo(u.ultimo_acceso)}</td>
                                    <td className="p-3">
                                        {u.rostro_registrado
                                            ? <Check size={16} className="text-emerald-500" />
                                            : <X size={16} className="text-slate-600" />}
                                    </td>
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="Ver">
                                                <button onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">
                                                    <Eye size={15} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Editar">
                                                <button onClick={() => navigate(`/dashboard/usuarios/${u.id}/editar`)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all">
                                                    <Edit size={15} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip content="Archivar">
                                                <button onClick={() => setModalArchivar({ open: true, usuario: u })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all">
                                                    <Trash size={15} />
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
                    {usuarios.map(u => (
                        <div key={u.id} onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                            className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-5 hover:-translate-y-1 hover:shadow-lg transition-all cursor-pointer group">
                            <div className="flex items-center gap-3 mb-3">
                                <Avatar name={`${u.nombre} ${u.apellido_paterno}`} size="md" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                        {u.nombre} {u.apellido_paterno}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                </div>
                                <EstadoCell usuario={u} onClick={(usr) => { setQuickEstado({ open: true, usuario: usr, nuevo: usr.estado, razon: '' }); }} />
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-2">
                                    <Badge variant="info">{u.rol?.nombre_visible || '—'}</Badge>
                                    <span className="font-mono">{u.ci}</span>
                                </div>
                                <span>{formatRelativo(u.ultimo_acceso)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {renderPaginacion()}

            {/* ── Modal acción masiva ── */}
            <Modal open={modalAccion.open} onClose={() => setModalAccion({ open: false, accion: '', titulo: '', requiereRazon: false })}
                title={modalAccion.titulo} size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setModalAccion({ open: false, accion: '', titulo: '', requiereRazon: false })} disabled={accionLoading}>Cancelar</Button>
                    <Button onClick={ejecutarAccionMasiva} loading={accionLoading}
                        variant={['eliminar', 'suspender'].includes(modalAccion.accion) ? 'danger' : 'primary'}>
                        Confirmar ({seleccionados.length})
                    </Button>
                </>}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Esta acción se aplicará a <strong className="text-slate-900 dark:text-white">{seleccionados.length} usuarios</strong>.
                </p>
                {modalAccion.requiereRazon && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Razón <span className="text-red-500">*</span>
                        </label>
                        <textarea value={razonAccion} onChange={e => setRazonAccion(e.target.value)} rows={2} maxLength={500}
                            placeholder="Explica el motivo..." className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />
                    </div>
                )}
            </Modal>

            {/* ── Modal archivar individual ── */}
            <Modal open={modalArchivar.open} onClose={() => setModalArchivar({ open: false, usuario: null })}
                title={`Archivar: ${modalArchivar.usuario?.nombre || ''}`} size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setModalArchivar({ open: false, usuario: null })} disabled={archivarLoading}>Cancelar</Button>
                    <Button variant="danger" onClick={handleArchivar} loading={archivarLoading}>Archivar usuario</Button>
                </>}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    El usuario <strong>{modalArchivar.usuario?.nombre} {modalArchivar.usuario?.apellido_paterno}</strong> pasará a la papelera.
                    Sus sesiones serán cerradas.
                </p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón (opcional)</label>
                    <textarea value={razonArchivar} onChange={e => setRazonArchivar(e.target.value)} rows={2} maxLength={500}
                        placeholder="Motivo del archivado..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />
                </div>
            </Modal>

            {/* ── Modal quick estado ── */}
            <Modal open={quickEstado.open}
                onClose={() => setQuickEstado({ open: false, usuario: null, nuevo: '', razon: '' })}
                title={`Estado: ${quickEstado.usuario?.nombre || ''}`} size="sm"
                footer={<>
                    <Button variant="secondary" onClick={() => setQuickEstado({ open: false, usuario: null, nuevo: '', razon: '' })} disabled={quickLoading}>Cancelar</Button>
                    <Button onClick={handleQuickEstado} loading={quickLoading}
                        variant={quickEstado.nuevo === 'suspendido' ? 'danger' : 'primary'}>
                        Cambiar
                    </Button>
                </>}>
                <div className="space-y-3">
                    <select value={quickEstado.nuevo} onChange={e => setQuickEstado(p => ({ ...p, nuevo: e.target.value }))}
                        className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inhabilitado</option>
                        <option value="suspendido">Suspendido</option>
                    </select>
                    {quickEstado.nuevo === 'suspendido' && (
                        <div className="space-y-2 animate-fade-in">
                            <div className="p-2.5 rounded-lg flex gap-2 items-center text-xs text-amber-700 dark:text-amber-400"
                                style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <AlertTriangle size={13} className="shrink-0" /> La razón es obligatoria para suspender.
                            </div>
                            <textarea value={quickEstado.razon} onChange={e => setQuickEstado(p => ({ ...p, razon: e.target.value }))}
                                rows={2} placeholder="Razón de la suspensión *"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />
                        </div>
                    )}
                </div>
            </Modal>

            <AsignarAccesoModal
                isOpen={modalAsignar}
                onClose={() => setModalAsignar(false)}
                onAsignado={() => { cargar(paginacion.current_page); }}
            />
        </div>
    );
};

export default ListaUsuarios;
