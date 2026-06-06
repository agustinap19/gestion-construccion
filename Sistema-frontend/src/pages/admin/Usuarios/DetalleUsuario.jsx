import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import Skeleton from '../../../components/ui/Skeleton';
import Avatar from '../../../components/ui/Avatar';
import AuditoriaTimeline from '../../../components/ui/AuditoriaTimeline';
import {
    Users, Edit, ArrowLeft, Shield, Key, History, Check, X, Eye,
    Info, AlertTriangle, CheckCircle,
} from '../../../components/icons/Icons';

/* ── Helpers ── */
const formatFecha = (f) => f
    ? new Date(f).toLocaleDateString('es-BO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
const formatRel = (f) => {
    if (!f) return 'Nunca';
    const d = Math.floor((Date.now() - new Date(f)) / 60000);
    if (d < 60) return `Hace ${d}m`;
    if (d < 1440) return `Hace ${Math.floor(d / 60)}h`;
    return `Hace ${Math.floor(d / 1440)}d`;
};

const ESTADO_LABELS = { activo: 'Activo', inactivo: 'Inhabilitado', suspendido: 'Suspendido' };
const ESTADO_COLORS = {
    activo:    { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)',  text: '#34d399',  dot: '#10b981' },
    inactivo:  { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24',  dot: '#f59e0b' },
    suspendido:{ bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171',  dot: '#ef4444' },
};

const EstadoPill = ({ estado, onClick }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.activo;
    const label = ESTADO_LABELS[estado] || estado;
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag type={onClick ? 'button' : undefined} onClick={onClick}
            title={onClick ? 'Cambiar estado' : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${onClick ? 'cursor-pointer hover:brightness-125 active:scale-95' : ''}`}
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            {label}
        </Tag>
    );
};

/* ── GlassPanel ── */
const GlassPanel = ({ children, className = '' }) => (
    <div className={`rounded-2xl p-5 ${className}`}
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {children}
    </div>
);

const PanelTitle = ({ icon, title, color = '#34d399' }) => (
    <div className="flex items-center gap-2.5 mb-4">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
);

const InfoRow = ({ label, value }) => (
    <div className="flex items-start justify-between gap-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs text-slate-500 shrink-0 pt-0.5">{label}</span>
        <span className="text-sm font-medium text-slate-200 text-right">{value || '—'}</span>
    </div>
);

/* ── Tab bar ── */
const TABS = [
    { key: 'info',      label: 'Información',  icon: <Info size={14} /> },
    { key: 'seguridad', label: 'Seguridad',    icon: <Shield size={14} /> },
    { key: 'rol',       label: 'Rol y Permisos', icon: <Key size={14} /> },
    { key: 'actividad', label: 'Actividad',    icon: <Eye size={14} /> },
    { key: 'auditoria', label: 'Auditoría',    icon: <History size={14} /> },
];

/* ── Glass select/textarea helper styles ── */
const glassSelect = 'w-full h-[42px] px-3 rounded-xl text-sm text-slate-200 outline-none bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40';
const glassTextarea = 'w-full px-3 py-2 rounded-xl text-sm text-slate-200 outline-none resize-none bg-white/[0.05] border border-white/[0.09] focus:ring-2 focus:ring-emerald-500/40';

/* ── Main Component ── */
const DetalleUsuario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');
    const [roles, setRoles] = useState([]);

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
        try {
            setLoading(true);
            const r = await usuarioService.obtener(id);
            setData(r.data);
        } catch {
            toast.error('Error al cargar usuario');
            navigate('/dashboard/usuarios');
        } finally { setLoading(false); }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        rolService.listar().then(r => setRoles(r?.data?.data ?? r?.data ?? [])).catch(() => {});
    }, []);

    const handleCambiarEstado = async () => {
        try {
            setEstadoLoading(true);
            await usuarioService.cambiarEstado(id, nuevoEstado, razonEstado || null);
            toast.success('Estado actualizado');
            setModalEstado(false);
            setRazonEstado('');
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setEstadoLoading(false); }
    };

    const handleCambiarRol = async () => {
        try {
            setRolLoading(true);
            await usuarioService.cambiarRol(id, parseInt(nuevoRol), razonRol || null);
            toast.success('Rol actualizado');
            setModalRol(false);
            setRazonRol('');
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setRolLoading(false); }
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

    if (loading) return (
        <div className="space-y-4 animate-fade-in">
            <Skeleton height="160px" className="rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton height="200px" className="rounded-2xl" />
                <Skeleton height="200px" className="rounded-2xl" />
            </div>
        </div>
    );
    if (!data) return null;

    const { usuario: u, sesiones, dispositivos, intentos_acceso, estadisticas } = data;
    const esPendiente = u.debe_cambiar_password && !u.ultimo_acceso;
    const permisosAgrupados = u.rol?.permisos
        ? Object.entries(u.rol.permisos.reduce((acc, p) => { (acc[p.modulo] = acc[p.modulo] || []).push(p); return acc; }, {}))
        : [];

    return (
        <div className="animate-fade-in space-y-6">
            {/* ── Back ── */}
            <button onClick={() => navigate('/dashboard/usuarios')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors">
                <ArrowLeft size={16} /> Volver
            </button>

            {/* ── Hero Card ── */}
            <div className="relative rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                </div>
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-6">
                    <div className="flex items-center gap-5">
                        <Avatar name={`${u.nombre} ${u.apellido_paterno}`} size="xl" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                <h1 className="text-2xl font-bold text-white">
                                    {u.nombre} {u.apellido_paterno} {u.apellido_materno || ''}
                                </h1>
                                {esPendiente
                                    ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                        style={{ background: 'rgba(100,116,139,0.2)', border: '1px solid rgba(100,116,139,0.3)', color: '#94a3b8' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Sin activar
                                      </span>
                                    : <EstadoPill estado={u.estado} onClick={() => { setNuevoEstado(u.estado); setModalEstado(true); }} />
                                }
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                                <span>{u.email}</span>
                                <span className="opacity-30">•</span>
                                <span className="font-mono text-xs">{u.ci}{u.ci_complemento ? `-${u.ci_complemento}` : ''}</span>
                                {u.rol && (
                                    <><span className="opacity-30">•</span>
                                        <span className="text-blue-400 font-medium">{u.rol.nombre_visible}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {!esPendiente && (
                            <button onClick={() => { setNuevoEstado(u.estado); setModalEstado(true); }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all flex-1 md:flex-none justify-center"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <Shield size={15} /> Cambiar estado
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex items-center gap-1 px-6 pb-4 flex-wrap">
                    {TABS.map(t => {
                        const isActive = activeTab === t.key;
                        return (
                            <button key={t.key} onClick={() => setActiveTab(t.key)}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                                style={isActive
                                    ? { background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }
                                    : { color: '#64748b', border: '1px solid transparent' }}>
                                {t.icon} {t.label}
                                {t.key === 'seguridad' && sesiones?.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                                        style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399' }}>
                                        {sesiones.length}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab Content ── */}

            {/* TAB INFO */}
            {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                    <GlassPanel>
                        <div className="flex items-start justify-between gap-2 mb-4">
                            <PanelTitle icon={<Info size={16} />} title="Datos Personales" />
                            {u.personal_id && (
                                <button onClick={() => navigate(`/dashboard/personal/${u.personal_id}`)}
                                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors shrink-0 flex items-center gap-1">
                                    <Edit size={11} /> Ver ficha
                                </button>
                            )}
                        </div>
                        <InfoRow label="Nombre completo" value={`${u.nombre} ${u.apellido_paterno} ${u.apellido_materno || ''}`} />
                        <InfoRow label="CI" value={`${u.ci}${u.ci_complemento ? '-' + u.ci_complemento : ''}`} />
                        <InfoRow label="Fecha nacimiento" value={u.fecha_nacimiento ? new Date(u.fecha_nacimiento.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' }) : null} />
                        <InfoRow label="Dirección" value={u.direccion} />
                        <div className="mt-3 pt-3 flex items-center gap-1.5 text-xs text-slate-600"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <Info size={11} />
                            Los datos personales se editan desde la ficha de personal.
                        </div>
                    </GlassPanel>
                    <GlassPanel>
                        <PanelTitle icon={<Users size={16} />} title="Cuenta y Sistema" color="#60a5fa" />
                        <InfoRow label="Email" value={u.email} />
                        <InfoRow label="Teléfono" value={u.telefono} />
                        <InfoRow label="Fecha de creación" value={formatFecha(u.created_at)} />
                        <InfoRow label="Último acceso" value={formatFecha(u.ultimo_acceso)} />
                        <InfoRow label="Intentos fallidos" value={u.intentos_fallidos} />
                        <InfoRow label="Estado de password"
                            value={u.debe_cambiar_password
                                ? <Badge variant="warning">Pendiente cambio</Badge>
                                : <Badge variant="success">Al día</Badge>} />
                    </GlassPanel>
                </div>
            )}

            {/* TAB SEGURIDAD */}
            {activeTab === 'seguridad' && (
                <div className="space-y-5 animate-fade-in">
                    <GlassPanel>
                        <div className="flex items-center justify-between mb-4">
                            <PanelTitle icon={<Shield size={16} />} title="Sesiones Activas" />
                            {sesiones?.length > 0 && (
                                <button onClick={() => quickAction('sesiones', 'Sesiones cerradas')}
                                    disabled={actionLoading === 'sesiones'}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors">
                                    Cerrar todas
                                </button>
                            )}
                        </div>
                        {!sesiones?.length ? <p className="text-sm text-slate-500">Sin sesiones activas</p> : (
                            <div className="space-y-2">
                                {sesiones.map(s => (
                                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{s.name}</p>
                                            <p className="text-xs text-slate-500">Últ. uso: {formatRel(s.last_used_at)} · Creada: {formatRel(s.created_at)}</p>
                                        </div>
                                        <button onClick={() => cerrarSesionIndividual(s.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Cerrar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassPanel>

                    <GlassPanel>
                        <PanelTitle icon={<Shield size={16} />} title="Dispositivos de Confianza" color="#60a5fa" />
                        {!dispositivos?.length ? <p className="text-sm text-slate-500">Sin dispositivos</p> : (
                            <div className="space-y-2">
                                {dispositivos.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div>
                                            <p className="text-sm font-medium text-slate-200">{d.nombre_dispositivo || 'Dispositivo'}</p>
                                            <p className="text-xs text-slate-500">IP: {d.ip_registro} · {formatRel(d.ultimo_uso)}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Badge variant={d.activo ? 'success' : 'danger'}>{d.activo ? 'Activo' : 'Revocado'}</Badge>
                                            {d.activo && <button onClick={() => revocarDisp(d.id)} className="text-xs text-slate-500 hover:text-red-400 transition-colors">Revocar</button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassPanel>

                    <GlassPanel>
                        <PanelTitle icon={<Key size={16} />} title="Seguridad de la Cuenta" color="#a78bfa" />
                        <div className="space-y-3">
                            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-sm text-slate-400">Google Authenticator (TOTP)</span>
                                {u.totp_activo ? <Badge variant="success">Configurado</Badge> : <Badge variant="danger">Sin configurar</Badge>}
                            </div>
                            <div className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span className="text-sm text-slate-400">Cuenta bloqueada</span>
                                {u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()
                                    ? <Badge variant="danger">Hasta {formatFecha(u.bloqueado_hasta)}</Badge>
                                    : <Badge variant="success">No</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-2">
                                {u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date() && (
                                    <button onClick={() => quickAction('desbloquear', 'Cuenta desbloqueada')}
                                        disabled={actionLoading === 'desbloquear'}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-400 hover:text-white transition-all"
                                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                        Desbloquear cuenta
                                    </button>
                                )}
                                <button onClick={() => quickAction('reenviar', 'Password temporal reenviado')}
                                    disabled={actionLoading === 'reenviar'}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    Reenviar contraseña temporal
                                </button>
                            </div>
                        </div>
                    </GlassPanel>
                </div>
            )}

            {/* TAB ROL */}
            {activeTab === 'rol' && (
                <div className="space-y-5 animate-fade-in">
                    <GlassPanel>
                        <div className="flex items-center justify-between mb-4">
                            <PanelTitle icon={<Key size={16} />} title="Rol Actual" />
                            <button onClick={() => { setNuevoRol(u.rol_id?.toString()); setModalRol(true); }}
                                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                                <Edit size={12} /> Cambiar rol
                            </button>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-xl"
                            style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <Shield size={22} className="text-emerald-400" />
                            </div>
                            <div>
                                <p className="font-bold text-white">{u.rol?.nombre_visible}</p>
                                <p className="text-xs text-slate-500 font-mono">{u.rol?.nombre}</p>
                            </div>
                            <Badge variant={u.rol?.es_sistema ? 'info' : 'tech'}>{u.rol?.es_sistema ? 'Sistema' : 'Personalizado'}</Badge>
                        </div>
                    </GlassPanel>

                    {permisosAgrupados.length > 0 && (
                        <GlassPanel>
                            <PanelTitle icon={<Shield size={16} />} title="Permisos Efectivos" color="#60a5fa" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {permisosAgrupados.map(([mod, perms]) => (
                                    <div key={mod} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <h5 className="text-xs font-bold text-white capitalize mb-2 flex items-center gap-2">
                                            {mod} <Badge variant="neutral">{perms.length}</Badge>
                                        </h5>
                                        {perms.map(p => (
                                            <div key={p.id} className="flex items-center gap-2 py-1">
                                                <Check size={12} className="text-emerald-500 shrink-0" />
                                                <span className="text-xs text-slate-400">{p.nombre_visible}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </GlassPanel>
                    )}
                </div>
            )}

            {/* TAB ACTIVIDAD */}
            {activeTab === 'actividad' && (
                <div className="space-y-5 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Logins exitosos', value: estadisticas?.total_logins_exitosos_30d, color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.15)' },
                            { label: 'Logins fallidos', value: estadisticas?.total_logins_fallidos_30d, color: '#f87171', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.15)' },
                            { label: 'Sesiones activas', value: estadisticas?.sesiones_activas_count, color: '#60a5fa', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)' },
                            { label: 'Dispositivos', value: estadisticas?.dispositivos_activos_count, color: '#a78bfa', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)' },
                        ].map(st => (
                            <div key={st.label} className="p-4 rounded-2xl" style={{ background: st.bg, border: `1px solid ${st.border}` }}>
                                <p className="text-xs text-slate-500">{st.label}</p>
                                <p className="text-2xl font-bold mt-1" style={{ color: st.color }}>{st.value ?? '—'}</p>
                                <p className="text-xs text-slate-600 mt-1">Últimos 30 días</p>
                            </div>
                        ))}
                    </div>

                    <GlassPanel>
                        <PanelTitle icon={<Eye size={16} />} title="Últimos Intentos de Acceso" color="#60a5fa" />
                        {!intentos_acceso?.length ? <p className="text-sm text-slate-500">Sin registros</p> : (
                            <div className="space-y-1 max-h-[400px] overflow-y-auto">
                                {intentos_acceso.map((ia, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg transition-all"
                                        style={{ background: 'rgba(255,255,255,0.01)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}>
                                        {ia.exitoso
                                            ? <Check size={14} className="text-emerald-500 shrink-0" />
                                            : <X size={14} className="text-red-500 shrink-0" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-300">{ia.exitoso ? 'Login exitoso' : `Fallido: ${ia.motivo || '—'}`}</p>
                                            <p className="text-xs text-slate-500">IP: {ia.ip_address} · {formatFecha(ia.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </GlassPanel>
                </div>
            )}

            {/* TAB AUDITORÍA */}
            {activeTab === 'auditoria' && <AuditoriaTimeline entidad="usuarios" id={id} />}

            {/* ── Modal cambiar estado ── */}
            <Modal open={modalEstado} onClose={() => { setModalEstado(false); setRazonEstado(''); }}
                title="Cambiar Estado del Usuario" size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setModalEstado(false)} disabled={estadoLoading}>Cancelar</Button>
                    <Button onClick={handleCambiarEstado} loading={estadoLoading} variant={nuevoEstado === 'suspendido' ? 'danger' : 'primary'}>Cambiar</Button>
                </>}>
                <div className="space-y-4">
                    <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)} className={glassSelect}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inhabilitado</option>
                        <option value="suspendido">Suspendido</option>
                    </select>
                    {nuevoEstado === 'suspendido' && (
                        <div className="space-y-2">
                            <div className="p-2.5 rounded-lg flex gap-2 items-center text-xs"
                                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                                <AlertTriangle size={13} className="shrink-0" /> La razón es obligatoria para suspender.
                            </div>
                            <textarea value={razonEstado} onChange={e => setRazonEstado(e.target.value)} rows={2}
                                placeholder="Razón de la suspensión *" className={glassTextarea} />
                        </div>
                    )}
                </div>
            </Modal>

            {/* ── Modal cambiar rol ── */}
            <Modal open={modalRol} onClose={() => setModalRol(false)} title="Cambiar Rol" size="md"
                footer={<>
                    <Button variant="secondary" onClick={() => setModalRol(false)} disabled={rolLoading}>Cancelar</Button>
                    <Button onClick={handleCambiarRol} loading={rolLoading}>Cambiar rol</Button>
                </>}>
                <div className="space-y-4">
                    <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)} className={glassSelect}>
                        <option value="">Seleccionar rol</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible}</option>)}
                    </select>
                    <textarea value={razonRol} onChange={e => setRazonRol(e.target.value)} rows={2}
                        placeholder="Razón del cambio (opcional)" className={glassTextarea} />
                </div>
            </Modal>
        </div>
    );
};

export default DetalleUsuario;
