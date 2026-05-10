import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Avatar from '../../../components/ui/Avatar';
import Tooltip from '../../../components/ui/Tooltip';
import { Users, Plus, Eye, Edit, Trash, Shield, Key, Check, X, Search } from '../../../components/icons/Icons';

const estadoBadge = (estado) => {
    const map = { activo: 'success', inactivo: 'warning', suspendido: 'danger' };
    return <Badge variant={map[estado] || 'neutral'}>{estado}</Badge>;
};

const formatRelativo = (fecha) => {
    if (!fecha) return 'Nunca';
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `Hace ${days}d`;
    return new Date(fecha).toLocaleDateString('es-BO');
};

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

    // Modales
    const [modalAccion, setModalAccion] = useState({ open: false, accion: '', titulo: '', requiereRazon: false });
    const [razonAccion, setRazonAccion] = useState('');
    const [accionLoading, setAccionLoading] = useState(false);
    const [modalEliminar, setModalEliminar] = useState({ open: false, usuario: null });
    const [eliminarLoading, setEliminarLoading] = useState(false);
    const [razonEliminar, setRazonEliminar] = useState('');

    // Filtros avanzados drawer
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [filtrosAvanzados, setFiltrosAvanzados] = useState({
        tiene_2fa: false, con_password_temporal: false, bloqueado: false, ultimo_acceso_dias: ''
    });

    useEffect(() => {
        rolService.listar().then(r => setRoles(r.data || [])).catch(() => {});
    }, []);

    const cargar = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = { ...filtros, page };
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
    const toggleTodos = () => {
        if (seleccionados.length === usuarios.length) setSeleccionados([]);
        else setSeleccionados(usuarios.map(u => u.id));
    };

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

    const handleEliminarUnico = async () => {
        try {
            setEliminarLoading(true);
            await usuarioService.eliminar(modalEliminar.usuario.id, razonEliminar || null);
            toast.success('Usuario eliminado');
            setModalEliminar({ open: false, usuario: null });
            setRazonEliminar('');
            cargar(paginacion.current_page);
        } catch (e) { toast.error(e.response?.data?.message || 'Error al eliminar'); }
        finally { setEliminarLoading(false); }
    };

    const abrirAccionMasiva = (accion, titulo, requiereRazon = false) => {
        setModalAccion({ open: true, accion, titulo, requiereRazon });
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
                    Mostrando {((paginacion.current_page - 1) * paginacion.per_page) + 1}-{Math.min(paginacion.current_page * paginacion.per_page, paginacion.total)} de {paginacion.total}
                </span>
                <div className="flex gap-1">
                    {pages.slice(Math.max(0, paginacion.current_page - 3), paginacion.current_page + 2).map(p => (
                        <button key={p} onClick={() => cargar(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === paginacion.current_page
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const skeletonRows = () => Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 dark:border-slate-800/50">
            {[1,2,3,4,5,6,7].map(j => <td key={j} className="p-3"><Skeleton width={j === 1 ? '20px' : '80%'} height="1rem" /></td>)}
        </tr>
    ));

    return (
        <div className="animate-fade-in">
            <PageHeader title="Usuarios del Sistema" subtitle="Gestiona las cuentas de acceso al sistema"
                icon={<Users size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={<Button leftIcon={<Plus size={18} />} onClick={() => navigate('/dashboard/usuarios/crear')}>Nuevo Usuario</Button>} />

            {/* Filtros */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                <SearchInput value={busquedaLocal} onChange={setBusquedaLocal} placeholder="Buscar por nombre, email, CI..." className="w-full sm:w-80" />
                <select value={filtros.rol_id} onChange={e => setFiltros(p => ({ ...p, rol_id: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all">
                    <option value="">Todos los roles</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible}</option>)}
                </select>
                <select value={filtros.estado} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all">
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="inactivo">Inactivos</option>
                    <option value="suspendido">Suspendidos</option>
                </select>
                <Button variant="ghost" size="sm" onClick={() => setDrawerOpen(!drawerOpen)}>Más filtros</Button>
                <div className="ml-auto flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setVista('tabla')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${vista === 'tabla' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Tabla</button>
                    <button onClick={() => setVista('grid')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${vista === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}>Grid</button>
                </div>
            </div>

            {/* Drawer filtros avanzados */}
            {drawerOpen && (
                <div className="mb-5 p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/50 rounded-2xl animate-fade-in space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Filtros avanzados</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={filtrosAvanzados.tiene_2fa} onChange={e => setFiltrosAvanzados(p => ({ ...p, tiene_2fa: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" /> Con 2FA
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={filtrosAvanzados.con_password_temporal} onChange={e => setFiltrosAvanzados(p => ({ ...p, con_password_temporal: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" /> Password temporal
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input type="checkbox" checked={filtrosAvanzados.bloqueado} onChange={e => setFiltrosAvanzados(p => ({ ...p, bloqueado: e.target.checked }))} className="w-4 h-4 rounded text-emerald-600" /> Bloqueados
                        </label>
                        <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">Último acceso (días)</label>
                            <input type="number" min="1" max="365" value={filtrosAvanzados.ultimo_acceso_dias}
                                onChange={e => setFiltrosAvanzados(p => ({ ...p, ultimo_acceso_dias: e.target.value }))}
                                className="w-full h-[36px] px-2 mt-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-lg text-sm text-slate-900 dark:text-slate-200 outline-none" placeholder="30" />
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
                        <Button size="sm" variant="outline" onClick={() => abrirAccionMasiva('activar', 'Activar usuarios')}>Activar</Button>
                        <Button size="sm" variant="outline" onClick={() => abrirAccionMasiva('desactivar', 'Desactivar usuarios')}>Desactivar</Button>
                        <Button size="sm" variant="outline" onClick={() => abrirAccionMasiva('suspender', 'Suspender usuarios', true)}>Suspender</Button>
                        <Button size="sm" variant="outline" onClick={() => abrirAccionMasiva('reenviar_password', 'Reenviar password')}>Reenviar password</Button>
                        <Button size="sm" variant="outline" onClick={() => abrirAccionMasiva('cerrar_sesiones', 'Cerrar sesiones')}>Cerrar sesiones</Button>
                        <Button size="sm" variant="danger" onClick={() => abrirAccionMasiva('eliminar', 'Eliminar usuarios', true)}>Eliminar</Button>
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
                        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-5 space-y-3"><Skeleton width="100%" height="4rem" /><Skeleton width="60%" height="1rem" /><Skeleton width="40%" height="1rem" /></div>)}
                    </div>
                )
            ) : usuarios.length === 0 ? (
                <EmptyState icon={<Users size={32} />} title="No se encontraron usuarios" description="No hay usuarios que coincidan con los filtros."
                    action={<Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>} />
            ) : vista === 'tabla' ? (
                /* VISTA TABLA */
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800/50 text-left">
                                <th className="p-3 w-10"><input type="checkbox" checked={seleccionados.length === usuarios.length && usuarios.length > 0} onChange={toggleTodos} className="w-4 h-4 rounded text-emerald-600" /></th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Usuario</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Email</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">CI</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Rol</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Estado</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">Último acceso</th>
                                <th className="p-3 text-slate-500 dark:text-slate-400 font-medium">2FA</th>
                                <th className="p-3 w-24"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {usuarios.map(u => (
                                <tr key={u.id} onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                                    className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 cursor-pointer transition-colors group">
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={seleccionados.includes(u.id)} onChange={() => toggleSeleccion(u.id)} className="w-4 h-4 rounded text-emerald-600" />
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={`${u.nombre} ${u.apellido_paterno}`} size="sm" />
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{u.nombre} {u.apellido_paterno} {u.apellido_materno || ''}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400">{u.email}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-xs">{u.ci}{u.ci_complemento ? `-${u.ci_complemento}` : ''}</td>
                                    <td className="p-3"><Badge variant="info">{u.rol?.nombre_visible || '—'}</Badge></td>
                                    <td className="p-3">{estadoBadge(u.estado)}</td>
                                    <td className="p-3 text-slate-500 dark:text-slate-400 text-xs">{formatRelativo(u.ultimo_acceso)}</td>
                                    <td className="p-3">{u.rostro_registrado ? <Check size={16} className="text-emerald-500" /> : <X size={16} className="text-slate-300 dark:text-slate-600" />}</td>
                                    <td className="p-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Tooltip content="Ver"><button onClick={() => navigate(`/dashboard/usuarios/${u.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"><Eye size={15} /></button></Tooltip>
                                            <Tooltip content="Editar"><button onClick={() => navigate(`/dashboard/usuarios/${u.id}/editar`)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Edit size={15} /></button></Tooltip>
                                            <Tooltip content="Eliminar"><button onClick={() => setModalEliminar({ open: true, usuario: u })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash size={15} /></button></Tooltip>
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
                                    <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{u.nombre} {u.apellido_paterno}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                                </div>
                                {estadoBadge(u.estado)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <Badge variant="info">{u.rol?.nombre_visible || '—'}</Badge>
                                <span>·</span>
                                <span>{formatRelativo(u.ultimo_acceso)}</span>
                                {u.rostro_registrado && <Check size={14} className="text-emerald-500" />}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {renderPaginacion()}

            {/* Modal acción masiva */}
            <Modal open={modalAccion.open} onClose={() => setModalAccion({ open: false, accion: '', titulo: '', requiereRazon: false })}
                title={modalAccion.titulo} size="md"
                footer={<><Button variant="secondary" onClick={() => setModalAccion({ open: false, accion: '', titulo: '', requiereRazon: false })} disabled={accionLoading}>Cancelar</Button>
                    <Button onClick={ejecutarAccionMasiva} loading={accionLoading} variant={['eliminar','suspender'].includes(modalAccion.accion) ? 'danger' : 'primary'}>Confirmar ({seleccionados.length})</Button></>}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Esta acción se aplicará a <strong className="text-slate-900 dark:text-white">{seleccionados.length} usuarios</strong>.</p>
                {modalAccion.requiereRazon && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón <span className="text-red-500">*</span></label>
                        <textarea value={razonAccion} onChange={e => setRazonAccion(e.target.value)} rows={2} maxLength={500} placeholder="Explica el motivo..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-600/50 resize-none" />
                    </div>
                )}
            </Modal>

            {/* Modal eliminar individual */}
            <Modal open={modalEliminar.open} onClose={() => setModalEliminar({ open: false, usuario: null })}
                title={`Eliminar: ${modalEliminar.usuario?.nombre || ''}`} size="md"
                footer={<><Button variant="secondary" onClick={() => setModalEliminar({ open: false, usuario: null })} disabled={eliminarLoading}>Cancelar</Button>
                    <Button variant="danger" onClick={handleEliminarUnico} loading={eliminarLoading}>Eliminar usuario</Button></>}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Se eliminará el usuario <strong>{modalEliminar.usuario?.nombre} {modalEliminar.usuario?.apellido_paterno}</strong>. Sus sesiones y dispositivos serán revocados.</p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón (opcional)</label>
                    <textarea value={razonEliminar} onChange={e => setRazonEliminar(e.target.value)} rows={2} maxLength={500} placeholder="Motivo de la eliminación..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-600/50 resize-none" />
                </div>
            </Modal>
        </div>
    );
};

export default ListaUsuarios;
