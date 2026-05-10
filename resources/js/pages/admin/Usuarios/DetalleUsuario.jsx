import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Skeleton from '../../../components/ui/Skeleton';
import Avatar from '../../../components/ui/Avatar';
import EmptyState from '../../../components/ui/EmptyState';
import { Users, Edit, Trash, ArrowLeft, Shield, Key, History, Check, X, Eye, Info } from '../../../components/icons/Icons';

const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatRel = (f) => { if (!f) return 'Nunca'; const d = Math.floor((Date.now() - new Date(f)) / 60000); if (d < 60) return `Hace ${d}m`; if (d < 1440) return `Hace ${Math.floor(d/60)}h`; return `Hace ${Math.floor(d/1440)}d`; };
const estadoColor = { activo: 'success', inactivo: 'warning', suspendido: 'danger' };

const DetalleUsuario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [roles, setRoles] = useState([]);

    // Modales
    const [modalEstado, setModalEstado] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [razonEstado, setRazonEstado] = useState('');
    const [estadoLoading, setEstadoLoading] = useState(false);

    const [modalRol, setModalRol] = useState(false);
    const [nuevoRol, setNuevoRol] = useState('');
    const [razonRol, setRazonRol] = useState('');
    const [rolLoading, setRolLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState('');

    const cargar = useCallback(async () => {
        try { setLoading(true); const r = await usuarioService.obtener(id); setData(r.data); } catch { toast.error('Error al cargar usuario'); navigate('/dashboard/usuarios'); } finally { setLoading(false); }
    }, [id, navigate]);

    useEffect(() => { cargar(); rolService.listar().then(r => setRoles(r.data || [])).catch(() => {}); }, [cargar]);

    const handleCambiarEstado = async () => {
        try { setEstadoLoading(true); await usuarioService.cambiarEstado(id, nuevoEstado, razonEstado || null); toast.success('Estado actualizado'); setModalEstado(false); setRazonEstado(''); cargar(); }
        catch (e) { toast.error(e.response?.data?.message || 'Error'); } finally { setEstadoLoading(false); }
    };

    const handleCambiarRol = async () => {
        try { setRolLoading(true); await usuarioService.cambiarRol(id, parseInt(nuevoRol), razonRol || null); toast.success('Rol actualizado'); setModalRol(false); setRazonRol(''); cargar(); }
        catch (e) { toast.error(e.response?.data?.message || 'Error'); } finally { setRolLoading(false); }
    };

    const quickAction = async (action, label) => {
        try {
            setActionLoading(action);
            if (action === 'desbloquear') await usuarioService.desbloquear(id);
            else if (action === 'reenviar') await usuarioService.reenviarPassword(id);
            else await usuarioService.cerrarTodasSesiones(id);
            toast.success(label);
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setActionLoading(''); }
    };

    const cerrarSesionIndividual = async (tokenId) => {
        try { await usuarioService.cerrarSesion(id, tokenId); toast.success('Sesión cerrada'); cargar(); } catch { toast.error('Error'); }
    };

    const revocarDisp = async (dispId) => {
        try { await usuarioService.revocarDispositivo(id, dispId); toast.success('Dispositivo revocado'); cargar(); } catch { toast.error('Error'); }
    };

    if (loading) return <div className="animate-fade-in space-y-4"><Skeleton width="200px" height="1rem" /><Skeleton width="100%" height="3rem" /><div className="grid grid-cols-2 gap-4"><Skeleton width="100%" height="200px" /><Skeleton width="100%" height="200px" /></div></div>;
    if (!data) return null;

    const { usuario: u, sesiones, dispositivos, intentos_acceso, estadisticas, auditoria } = data;
    const permisosAgrupados = u.rol?.permisos ? Object.entries(u.rol.permisos.reduce((acc, p) => { (acc[p.modulo] = acc[p.modulo] || []).push(p); return acc; }, {})) : [];

    const tabs = [
        { key: 'info', label: 'Información', icon: <Info size={16} /> },
        { key: 'seguridad', label: 'Seguridad', icon: <Shield size={16} />, badge: <Badge variant="neutral">{sesiones?.length || 0}</Badge> },
        { key: 'rol', label: 'Rol y Permisos', icon: <Key size={16} /> },
        { key: 'actividad', label: 'Actividad', icon: <Eye size={16} /> },
        { key: 'auditoria', label: 'Auditoría', icon: <History size={16} /> },
    ];

    return (
        <div className="animate-fade-in">
            <button onClick={() => navigate('/dashboard/usuarios')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"><ArrowLeft size={16} /> Volver</button>

            <PageHeader title={`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ''}`}
                subtitle={<span className="flex items-center gap-3"><span>{u.email}</span><Badge variant="info">{u.rol?.nombre_visible}</Badge><Badge variant={estadoColor[u.estado]}>{u.estado}</Badge></span>}
                icon={<Avatar name={`${u.nombre} ${u.apellido_paterno}`} size="lg" />}
                actions={<div className="flex gap-2">
                    <Button variant="outline" leftIcon={<Edit size={16} />} onClick={() => navigate(`/dashboard/usuarios/${id}/editar`)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => { setNuevoEstado(u.estado === 'activo' ? 'inactivo' : 'activo'); setModalEstado(true); }}>Cambiar estado</Button>
                    <Button variant="outline" size="sm" onClick={() => { setNuevoRol(u.rol_id?.toString() || ''); setModalRol(true); }}>Cambiar rol</Button>
                </div>}
                tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="mt-6">
                {/* TAB INFO */}
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <Card title="Datos Personales">
                            <div className="space-y-3">
                                <InfoRow label="Nombre completo" value={`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ''}`} />
                                <InfoRow label="CI" value={`${u.ci}${u.ci_complemento ? '-' + u.ci_complemento : ''}`} />
                                <InfoRow label="Fecha nacimiento" value={u.fecha_nacimiento ? new Date(u.fecha_nacimiento).toLocaleDateString('es-BO') : '—'} />
                                <InfoRow label="Dirección" value={u.direccion || '—'} />
                            </div>
                        </Card>
                        <Card title="Contacto y Sistema">
                            <div className="space-y-3">
                                <InfoRow label="Email" value={u.email} />
                                <InfoRow label="Teléfono" value={u.telefono || '—'} />
                                <InfoRow label="Fecha creación" value={formatFecha(u.created_at)} />
                                <InfoRow label="Último acceso" value={formatFecha(u.ultimo_acceso)} />
                                <InfoRow label="Intentos fallidos" value={u.intentos_fallidos} />
                                <InfoRow label="Cambiar password" value={u.debe_cambiar_password ? <Badge variant="warning">Pendiente</Badge> : <Badge variant="success">No</Badge>} />
                            </div>
                        </Card>
                    </div>
                )}

                {/* TAB SEGURIDAD */}
                {activeTab === 'seguridad' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card title="Sesiones Activas" actions={sesiones?.length > 0 && <Button size="sm" variant="outline" onClick={() => quickAction('sesiones', 'Sesiones cerradas')}>Cerrar todas</Button>}>
                            {!sesiones?.length ? <p className="text-sm text-slate-400">Sin sesiones activas</p> : (
                                <div className="space-y-2">{sesiones.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
                                        <div><p className="text-sm font-medium text-slate-900 dark:text-white">{s.name}</p><p className="text-xs text-slate-400">Último uso: {formatRel(s.last_used_at)} · Creada: {formatRel(s.created_at)}</p></div>
                                        <Button size="sm" variant="ghost" onClick={() => cerrarSesionIndividual(s.id)}>Cerrar</Button>
                                    </div>
                                ))}</div>
                            )}
                        </Card>
                        <Card title="Dispositivos Confiables" actions={dispositivos?.filter(d => d.activo).length > 0 && <Button size="sm" variant="outline" onClick={async () => { await usuarioService.revocarTodosDispositivos(id); toast.success('Dispositivos revocados'); cargar(); }}>Revocar todos</Button>}>
                            {!dispositivos?.length ? <p className="text-sm text-slate-400">Sin dispositivos</p> : (
                                <div className="space-y-2">{dispositivos.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
                                        <div><p className="text-sm font-medium text-slate-900 dark:text-white">{d.nombre_dispositivo || 'Dispositivo'}</p><p className="text-xs text-slate-400">IP: {d.ip_registro} · Último uso: {formatRel(d.ultimo_uso)}</p></div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={d.activo ? 'success' : 'danger'}>{d.activo ? 'Activo' : 'Revocado'}</Badge>
                                            {d.activo && <Button size="sm" variant="ghost" onClick={() => revocarDisp(d.id)}>Revocar</Button>}
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </Card>
                        <Card title="Estado de Seguridad">
                            <div className="space-y-3">
                                <InfoRow label="2FA configurado" value={u.rostro_registrado ? <Badge variant="success">Sí</Badge> : <Badge variant="danger">No</Badge>} />
                                <InfoRow label="Cuenta bloqueada" value={u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date() ? <Badge variant="danger">Sí — hasta {formatFecha(u.bloqueado_hasta)}</Badge> : <Badge variant="success">No</Badge>} />
                                {u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date() && <Button size="sm" onClick={() => quickAction('desbloquear', 'Cuenta desbloqueada')}>Desbloquear cuenta</Button>}
                                <Button size="sm" variant="outline" onClick={() => quickAction('reenviar', 'Password temporal reenviado')}>Reenviar contraseña temporal</Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* TAB ROL */}
                {activeTab === 'rol' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card title="Rol Actual" actions={<Button size="sm" leftIcon={<Edit size={14} />} onClick={() => { setNuevoRol(u.rol_id?.toString()); setModalRol(true); }}>Cambiar rol</Button>}>
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center"><Shield size={24} className="text-emerald-600 dark:text-emerald-400" /></div>
                                <div><p className="font-bold text-slate-900 dark:text-white">{u.rol?.nombre_visible}</p><p className="text-xs text-slate-500 font-mono">{u.rol?.nombre}</p></div>
                                <Badge variant={u.rol?.es_sistema ? 'info' : 'tech'}>{u.rol?.es_sistema ? 'Sistema' : 'Personalizado'}</Badge>
                            </div>
                        </Card>
                        {permisosAgrupados.length > 0 && <Card title="Permisos Efectivos">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {permisosAgrupados.map(([mod, perms]) => (
                                    <div key={mod} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50">
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-white capitalize mb-2">{mod} <Badge variant="neutral">{perms.length}</Badge></h5>
                                        {perms.map(p => <div key={p.id} className="flex items-center gap-2 py-1"><Check size={14} className="text-emerald-500" /><span className="text-sm text-slate-700 dark:text-slate-300">{p.nombre_visible}</span></div>)}
                                    </div>
                                ))}
                            </div>
                        </Card>}
                    </div>
                )}

                {/* TAB ACTIVIDAD */}
                {activeTab === 'actividad' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Logins exitosos</p>
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{estadisticas.total_logins_exitosos_30d}</p>
                                <p className="text-xs text-slate-400 mt-1">Últimos 30 días</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Logins fallidos</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{estadisticas.total_logins_fallidos_30d}</p>
                                <p className="text-xs text-slate-400 mt-1">Últimos 30 días</p>
                            </div>
                            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Sesiones activas</p>
                                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{estadisticas.sesiones_activas_count}</p>
                                <p className="text-xs text-slate-400 mt-1">Últimos 30 días</p>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-500/5 border border-purple-100 dark:border-purple-500/10">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Dispositivos</p>
                                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{estadisticas.dispositivos_activos_count}</p>
                                <p className="text-xs text-slate-400 mt-1">Últimos 30 días</p>
                            </div>
                        </div>
                        <Card title="Últimos Intentos de Acceso">
                            {!intentos_acceso?.length ? <p className="text-sm text-slate-400">Sin registros</p> : (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">{intentos_acceso.map((ia, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                        {ia.exitoso ? <Check size={16} className="text-emerald-500 shrink-0" /> : <X size={16} className="text-red-500 shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{ia.exitoso ? 'Login exitoso' : `Fallido: ${ia.motivo || '—'}`}</p>
                                            <p className="text-xs text-slate-400">IP: {ia.ip_address} · {formatFecha(ia.created_at)}</p>
                                        </div>
                                    </div>
                                ))}</div>
                            )}
                        </Card>
                    </div>
                )}

                {/* TAB AUDITORIA */}
                {activeTab === 'auditoria' && (
                    <div className="animate-fade-in">
                        {!auditoria?.length ? <EmptyState icon={<History size={32} />} title="Sin historial" description="No hay eventos de auditoría." /> : (
                            <Card><div className="relative"><div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-800" />
                                <div className="space-y-6">{auditoria.map((ev, i) => (
                                    <div key={ev.id || i} className="relative flex gap-4 pl-2">
                                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${ev.evento.includes('eliminado') ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30' : ev.evento.includes('creado') ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30' : 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30'}`}>
                                            <History size={14} className={ev.evento.includes('eliminado') ? 'text-red-500' : ev.evento.includes('creado') ? 'text-emerald-500' : 'text-blue-500'} />
                                        </div>
                                        <div className="flex-1 pb-2">
                                            <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-semibold text-slate-900 dark:text-white">{ev.actor ? `${ev.actor.nombre} ${ev.actor.apellido_paterno}` : 'Sistema'}</span>
                                                <Badge variant={ev.evento.includes('eliminado') ? 'danger' : ev.evento.includes('creado') ? 'success' : 'info'}>{ev.evento.replace('usuario.', '').replace(/_/g, ' ')}</Badge></div>
                                            <p className="text-xs text-slate-400 mt-1">{formatFecha(ev.created_at)}</p>
                                            {ev.razon && <p className="text-xs text-slate-500 italic mt-1">Razón: "{ev.razon}"</p>}
                                        </div>
                                    </div>
                                ))}</div>
                            </div></Card>
                        )}
                    </div>
                )}
            </div>

            {/* Modal cambiar estado */}
            <Modal open={modalEstado} onClose={() => setModalEstado(false)} title="Cambiar estado" size="md"
                footer={<><Button variant="secondary" onClick={() => setModalEstado(false)} disabled={estadoLoading}>Cancelar</Button><Button onClick={handleCambiarEstado} loading={estadoLoading}>Cambiar</Button></>}>
                <div className="space-y-4">
                    <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)} className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                        <option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="suspendido">Suspendido</option>
                    </select>
                    {nuevoEstado === 'suspendido' && <textarea value={razonEstado} onChange={e => setRazonEstado(e.target.value)} rows={2} placeholder="Razón de la suspensión *" className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />}
                </div>
            </Modal>

            {/* Modal cambiar rol */}
            <Modal open={modalRol} onClose={() => setModalRol(false)} title="Cambiar rol" size="md"
                footer={<><Button variant="secondary" onClick={() => setModalRol(false)} disabled={rolLoading}>Cancelar</Button><Button onClick={handleCambiarRol} loading={rolLoading}>Cambiar rol</Button></>}>
                <div className="space-y-4">
                    <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                        <option value="">Seleccionar rol</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible}</option>)}
                    </select>
                    <textarea value={razonRol} onChange={e => setRazonRol(e.target.value)} rows={2} placeholder="Razón del cambio (opcional)" className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none resize-none" />
                </div>
            </Modal>
        </div>
    );
};

const InfoRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">{label}</span>
        <span className="text-sm text-slate-900 dark:text-white font-medium">{value}</span>
    </div>
);

export default DetalleUsuario;
