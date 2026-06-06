import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useBreadcrumbTitle } from '../../../context/BreadcrumbContext';
import personalService from '../../../services/personalService';
import rolService from '../../../services/rolService';
import usuarioService from '../../../services/usuarioService';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Avatar from '../../../components/ui/Avatar';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Dropdown from '../../../components/ui/Dropdown';
import {
    Briefcase, Edit, UserPlus, UserMinus, UserX, Shield, MapPin, Phone,
    Award, Activity, FileText, CheckCircle, AlertTriangle,
    MoreVertical, Eye, Plus, X, Search, Mail,
} from '../../../components/icons/Icons';
import AsignarCompetenciaModal from '../../../components/personal/AsignarCompetenciaModal';
import AuditoriaTimeline from '../../../components/ui/AuditoriaTimeline';

const ESTADO_COLORS = {
    activo:       { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#34d399', dot: '#10b981' },
    vacaciones:   { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24', dot: '#f59e0b' },
    licencia:     { bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)',  text: '#60a5fa', dot: '#3b82f6' },
    desvinculado: { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',   text: '#f87171', dot: '#ef4444' },
};

const EstadoPill = ({ estado, onClick }) => {
    const c = ESTADO_COLORS[estado] || ESTADO_COLORS.activo;
    const labels = { activo: 'Activo', vacaciones: 'De Permiso', licencia: 'En Licencia', desvinculado: 'Desvinculado' };
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={onClick ? 'Cambiar estado laboral' : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${onClick ? 'cursor-pointer hover:brightness-125 active:scale-95' : ''}`}
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
            {labels[estado] || estado}
        </Tag>
    );
};

const InfoRow = ({ label, value, mono }) => (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs text-slate-500 shrink-0 pt-0.5">{label}</span>
        <span className={`text-sm font-medium text-slate-200 text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
);

// Glass panel for tab content
const GlassPanel = ({ children, className = '' }) => (
    <div className={`rounded-2xl p-6 ${className}`}
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {children}
    </div>
);

const PanelTitle = ({ icon, title, color = '#34d399' }) => (
    <div className="flex items-center gap-2.5 mb-5">
        <span style={{ color }}>{icon}</span>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
    </div>
);

const DetallePersonal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [personalData, setPersonalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('informacion');
    const [actionLoading, setActionLoading] = useState(false);

    // Modals
    const [modalEstado, setModalEstado] = useState({ open: false, estado: '', razon: '' });
    const [modalDesvincular, setModalDesvincular] = useState(false);
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalCompetencia, setModalCompetencia] = useState({ open: false, competenciaId: null, pivotId: null });
    const [modalCrearUsuario, setModalCrearUsuario] = useState(false);
    const [modalVincularUsuario, setModalVincularUsuario] = useState(false);

    // Crear usuario form
    const [crearForm, setCrearForm] = useState({ email: '', rol_id: '' });
    const [crearLoading, setCrearLoading] = useState(false);
    const [roles, setRoles] = useState([]);

    // Vincular usuario form
    const [vincularBusqueda, setVincularBusqueda] = useState('');
    const [vincularUsuarios, setVincularUsuarios] = useState([]);
    const [vincularSeleccionado, setVincularSeleccionado] = useState(null);
    const [vincularLoading, setVincularLoading] = useState(false);

    const isGerenteOrFinanzas = user?.rol?.nombre === 'gerente' || user?.rol?.nombre === 'encargado_finanzas';

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const res = await personalService.obtener(id);
            setPersonalData(res.data);
        } catch {
            toast.error('Error al cargar el personal');
            navigate('/dashboard/personal');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    // Register breadcrumb title once personal data loads
    const nombreBreadcrumb = personalData?.personal
        ? `${personalData.personal.nombre} ${personalData.personal.apellido_paterno}`
        : undefined;
    useBreadcrumbTitle(`/dashboard/personal/${id}`, nombreBreadcrumb);

    // Load roles when crear usuario modal opens
    useEffect(() => {
        if (!modalCrearUsuario) return;
        // API returns paginated: { data: { data: [...], ... } }
        rolService.listar().then(res => setRoles(res?.data?.data ?? res?.data ?? [])).catch(() => {});
    }, [modalCrearUsuario]);

    // Load users when vincular modal opens
    useEffect(() => {
        if (!modalVincularUsuario) return;
        // API returns paginated: { data: { data: [...], ... } }
        usuarioService.listar({}, 50).then(res => {
            setVincularUsuarios(res?.data?.data ?? res?.data ?? []);
        }).catch(() => {});
    }, [modalVincularUsuario]);

    if (loading || !personalData) {
        return (
            <div className="space-y-6">
                <Skeleton height="160px" className="rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2"><Skeleton height="320px" className="rounded-2xl" /></div>
                    <div><Skeleton height="220px" className="rounded-2xl" /></div>
                </div>
            </div>
        );
    }

    const { personal, estadisticas_competencias } = personalData;

    // ── Action handlers ──

    const handleCambiarEstado = async () => {
        if (!modalEstado.estado) return toast.error('Seleccione un estado');
        if (modalEstado.estado === 'desvinculado' && !modalEstado.razon)
            return toast.error('La razón es obligatoria para desvincular');
        try {
            setActionLoading(true);
            await personalService.cambiarEstadoLaboral(id, modalEstado.estado, modalEstado.razon || null);
            toast.success('Estado actualizado');
            setModalEstado({ open: false, estado: '', razon: '' });
            cargar();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al cambiar estado');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDesvincularUsuario = async () => {
        try {
            setActionLoading(true);
            await personalService.desvincularUsuario(id);
            toast.success('Usuario desvinculado');
            setModalDesvincular(false);
            cargar();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al desvincular');
        } finally {
            setActionLoading(false);
        }
    };

    const handleEliminar = async () => {
        try {
            setActionLoading(true);
            await personalService.eliminar(id, 'Eliminado desde detalle');
            toast.success('Personal eliminado');
            navigate('/dashboard/personal');
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al eliminar');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCrearUsuario = async () => {
        if (!crearForm.email) return toast.error('El email es obligatorio');
        if (!crearForm.rol_id) return toast.error('Selecciona un rol');
        try {
            setCrearLoading(true);
            await personalService.crearUsuarioParaPersonal(id, crearForm.email, crearForm.rol_id);
            toast.success('Cuenta de sistema creada correctamente');
            setModalCrearUsuario(false);
            setCrearForm({ email: '', rol_id: '' });
            cargar();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al crear cuenta');
        } finally {
            setCrearLoading(false);
        }
    };

    const handleVincularUsuario = async () => {
        if (!vincularSeleccionado) return toast.error('Selecciona un usuario');
        try {
            setVincularLoading(true);
            await personalService.vincularUsuario(id, vincularSeleccionado.id);
            toast.success('Usuario vinculado correctamente');
            setModalVincularUsuario(false);
            setVincularSeleccionado(null);
            setVincularBusqueda('');
            cargar();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al vincular usuario');
        } finally {
            setVincularLoading(false);
        }
    };

    const tabs = [
        { id: 'informacion', label: 'Información', icon: <FileText size={16} /> },
        { id: 'laboral', label: 'Laboral', icon: <Briefcase size={16} /> },
        { id: 'sistema', label: 'Sistema', icon: <Shield size={16} /> },
        {
            id: 'competencias', label: 'Competencias', icon: <Award size={16} />,
            badge: estadisticas_competencias?.competencias_vencidas > 0
                ? estadisticas_competencias.competencias_vencidas : null,
        },
        { id: 'auditoria', label: 'Auditoría', icon: <Activity size={16} /> },
    ];

    const menuAcciones = [
        { label: 'Editar personal', icon: <Edit size={15} />, onClick: () => navigate(`/dashboard/personal/${id}/editar`) },
        { label: 'Cambiar estado laboral', icon: <Activity size={15} />, onClick: () => setModalEstado({ open: true, estado: '', razon: '' }) },
        { type: 'divider' },
        ...(personal.usuario_id
            ? [{ label: 'Desconectar del sistema', icon: <UserMinus size={15} />, onClick: () => setModalDesvincular(true) }]
            : [{ label: 'Crear cuenta de sistema', icon: <Shield size={15} />, onClick: () => { setActiveTab('sistema'); } }]
        ),
        { type: 'divider' },
        { label: 'Archivar personal', icon: <UserX size={15} />, danger: true, onClick: () => setModalEliminar(true) },
    ];

    const usuariosFiltrados = vincularUsuarios.filter(u => {
        const q = vincularBusqueda.toLowerCase();
        return !q || u.email?.toLowerCase().includes(q) || u.nombre?.toLowerCase().includes(q);
    });

    return (
        <div className="animate-fade-in space-y-6">
            {/* ── Hero Card ── */}
            <div className="relative rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                    <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl"
                        style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }} />
                </div>

                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 p-6">
                    <div className="flex items-center gap-5">
                        <Avatar name={`${personal.nombre} ${personal.apellido_paterno}`} size="xl" />
                        <div>
                            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                                <h1 className="text-2xl font-bold text-white">
                                    {personal.nombre} {personal.apellido_paterno}
                                    {personal.apellido_materno ? ` ${personal.apellido_materno}` : ''}
                                </h1>
                                <EstadoPill
                                    estado={personal.estado_laboral}
                                    onClick={() => setModalEstado({ open: true, estado: '', razon: '' })}
                                />
                            </div>
                            <p className="text-sm font-mono text-slate-400 mb-2 flex items-center gap-1.5">
                                <Briefcase size={13} className="text-emerald-500" />
                                {personal.codigo_empleado}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400">
                                <span className="capitalize">{personal.tipo.replace(/_/g, ' ')}</span>
                                {personal.especialidad && (
                                    <><span className="opacity-30">•</span><span>{personal.especialidad}</span></>
                                )}
                                {personal.usuario_id && (
                                    <><span className="opacity-30">•</span>
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle size={12} /> Con acceso al sistema
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                            onClick={() => navigate(`/dashboard/personal/${id}/editar`)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all flex-1 md:flex-none justify-center"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <Edit size={15} /> Editar
                        </button>
                        <Dropdown items={menuAcciones}>
                            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <MoreVertical size={16} />
                            </button>
                        </Dropdown>
                    </div>
                </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            {/* ── Tab Content ── */}
            <div className="min-h-[300px]">

                {/* Información */}
                {activeTab === 'informacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                        <GlassPanel>
                            <PanelTitle icon={<FileText size={16} />} title="Datos Personales" />
                            <InfoRow label="Nombre completo" value={`${personal.nombre} ${personal.apellido_paterno} ${personal.apellido_materno || ''}`} />
                            <InfoRow label="C.I." value={personal.ci + (personal.ci_complemento ? `-${personal.ci_complemento}` : '')} mono />
                            <InfoRow label="Fecha de nacimiento"
                                value={personal.fecha_nacimiento
                                    ? new Date(personal.fecha_nacimiento.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : null} />
                        </GlassPanel>
                        <GlassPanel>
                            <PanelTitle icon={<Phone size={16} />} title="Contacto" color="#60a5fa" />
                            <InfoRow label="Teléfono" value={personal.telefono} mono />
                            <InfoRow label="Dirección" value={personal.direccion} />
                        </GlassPanel>
                    </div>
                )}

                {/* Laboral */}
                {activeTab === 'laboral' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                        <GlassPanel>
                            <PanelTitle icon={<Briefcase size={16} />} title="Contrato" color="#60a5fa" />
                            <InfoRow label="Fecha de contratación"
                                value={new Date(personal.fecha_contratacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })} />
                            <InfoRow label="Tipo de contrato" value={personal.tipo_contrato?.replace(/_/g, ' ')} />
                            <InfoRow label="Tipo de personal" value={personal.tipo?.replace(/_/g, ' ')} />
                            <InfoRow label="Categoría" value={personal.categoria} />
                        </GlassPanel>

                        {isGerenteOrFinanzas ? (
                            <GlassPanel>
                                <PanelTitle icon={<FileText size={16} />} title="Compensación" color="#fbbf24" />
                                <InfoRow label="Salario base"
                                    value={<span className="text-emerald-400 font-bold">Bs. {Number(personal.salario_base).toLocaleString('es-BO')}</span>} />
                                <InfoRow label="Frecuencia de pago" value={personal.frecuencia_pago} />
                                <InfoRow label="Banco" value={personal.banco} />
                                <InfoRow label="Nº cuenta" value={personal.numero_cuenta} mono />
                                {personal.tipo_cuenta && <InfoRow label="Tipo de cuenta" value={personal.tipo_cuenta} />}
                            </GlassPanel>
                        ) : (
                            <GlassPanel className="flex flex-col items-center justify-center text-center gap-3">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <Shield size={22} className="text-slate-500" />
                                </div>
                                <p className="text-sm text-slate-500 max-w-xs">Sin permisos para ver información de compensación</p>
                            </GlassPanel>
                        )}
                    </div>
                )}

                {/* Sistema */}
                {activeTab === 'sistema' && (
                    <div className="animate-fade-in">
                        {personal.usuario_id && personal.usuario ? (
                            <GlassPanel>
                                <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                        <Shield size={22} className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Cuenta de Sistema Vinculada</h3>
                                        <p className="text-sm text-slate-400">{personal.usuario.email}</p>
                                    </div>
                                    <EstadoPill estado={personal.usuario.estado} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1.5">Rol en el sistema</p>
                                        <span className="text-sm font-semibold text-blue-400">
                                            {personal.usuario.rol?.nombre_visible || 'Sin rol'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1.5">Último acceso</p>
                                        <span className="text-sm text-slate-300">
                                            {personal.usuario.ultimo_acceso
                                                ? new Date(personal.usuario.ultimo_acceso).toLocaleString('es-BO')
                                                : 'Nunca'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => navigate(`/dashboard/usuarios/${personal.usuario_id}`)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <Eye size={15} /> Ver usuario
                                    </button>
                                    <button
                                        onClick={() => setModalDesvincular(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-amber-400 hover:text-amber-300 transition-all"
                                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <UserMinus size={15} /> Desconectar cuenta
                                    </button>
                                </div>
                            </GlassPanel>
                        ) : (
                            <GlassPanel>
                                <div className="flex flex-col items-center text-center gap-4 py-4">
                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <UserPlus size={28} className="text-slate-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-white mb-1">Sin cuenta de sistema</h3>
                                        <p className="text-sm text-slate-500 max-w-sm">
                                            Este trabajador no tiene acceso al sistema. Puedes crearle una cuenta nueva o vincularlo a una cuenta existente.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                                        <button
                                            onClick={() => setModalCrearUsuario(true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.85))',
                                                boxShadow: '0 4px 16px rgba(16,185,129,0.25)',
                                            }}>
                                            <Plus size={15} /> Crear cuenta nueva
                                        </button>
                                        <button
                                            onClick={() => setModalVincularUsuario(true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                            <UserPlus size={15} /> Vincular cuenta existente
                                        </button>
                                    </div>
                                </div>
                            </GlassPanel>
                        )}
                    </div>
                )}

                {/* Competencias */}
                {activeTab === 'competencias' && (
                    <div className="animate-fade-in space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white">Competencias y Certificaciones</h3>
                            <button
                                onClick={() => setModalCompetencia({ open: true, competenciaId: null, pivotId: null })}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-emerald-400 transition-all"
                                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <Plus size={14} /> Asignar
                            </button>
                        </div>

                        {!personal.competencias || personal.competencias.length === 0 ? (
                            <GlassPanel className="flex flex-col items-center justify-center text-center py-8 gap-3">
                                <Award size={32} className="text-slate-600" />
                                <p className="text-sm text-slate-500">Sin competencias registradas</p>
                            </GlassPanel>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {personal.competencias.map(comp => {
                                    // Semáforo on-the-fly
                                    const hoy = new Date(); hoy.setHours(0,0,0,0);
                                    let semColor = '#10b981'; let semLabel = 'Vigente';
                                    let semBg = 'rgba(16,185,129,0.12)'; let semBorder = 'rgba(16,185,129,0.25)';
                                    if (comp.pivot.fecha_vencimiento) {
                                        const [y,m,d] = comp.pivot.fecha_vencimiento.split('-').map(Number);
                                        const vence = new Date(y,m-1,d);
                                        const diff = Math.floor((vence - hoy) / 86400000);
                                        if (diff < 0) { semColor='#ef4444'; semLabel='Vencida'; semBg='rgba(239,68,68,0.12)'; semBorder='rgba(239,68,68,0.25)'; }
                                        else if (diff <= 30) { semColor='#f59e0b'; semLabel=`Vence en ${diff}d`; semBg='rgba(245,158,11,0.12)'; semBorder='rgba(245,158,11,0.25)'; }
                                    }
                                    return (
                                        <GlassPanel key={comp.pivot.id} className="flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h4 className="font-semibold text-white">{comp.nombre}</h4>
                                                    <p className="text-xs text-slate-500 capitalize mt-0.5">{comp.tipo.replace(/_/g, ' ')}</p>
                                                </div>
                                                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5"
                                                    style={{ background: semBg, border: `1px solid ${semBorder}`, color: semColor }}>
                                                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: semColor }} />
                                                    {semLabel}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 mb-4 flex-1">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-500">Emisión</span>
                                                    <span className="text-slate-300">{comp.pivot.fecha_emision ? new Date(comp.pivot.fecha_emision.replace(/-/g, '/')).toLocaleDateString('es-BO') : '—'}</span>
                                                </div>
                                                {comp.pivot.fecha_vencimiento && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-500">Vencimiento</span>
                                                        <span style={{ color: semColor }} className="font-medium">
                                                            {new Date(comp.pivot.fecha_vencimiento.replace(/-/g, '/')).toLocaleDateString('es-BO')}
                                                        </span>
                                                    </div>
                                                )}
                                                {comp.pivot.entidad_emisora && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-slate-500">Emisor</span>
                                                        <span className="text-slate-300">{comp.pivot.entidad_emisora}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setModalCompetencia({ open: true, competenciaId: comp.id, pivotId: comp.pivot.id })}
                                                className="text-xs text-slate-400 hover:text-white transition-colors self-end pt-3"
                                                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                Editar
                                            </button>
                                        </GlassPanel>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Auditoría */}
                {activeTab === 'auditoria' && (
                    <AuditoriaTimeline entidad="personal" id={id} />
                )}
            </div>

            {/* ── Modal Cambiar Estado ── */}
            <Modal
                open={modalEstado.open}
                onClose={() => setModalEstado({ open: false, estado: '', razon: '' })}
                title="Cambiar Estado Laboral"
                size="md"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalEstado({ open: false, estado: '', razon: '' })} disabled={actionLoading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleCambiarEstado} loading={actionLoading}
                            variant={modalEstado.estado === 'desvinculado' ? 'danger' : 'primary'}>
                            Guardar
                        </Button>
                    </>
                }>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Nuevo Estado <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={modalEstado.estado}
                            onChange={e => setModalEstado({ ...modalEstado, estado: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600/50">
                            <option value="">Seleccione un estado...</option>
                            <option value="activo" disabled={personal.estado_laboral === 'activo'}>Activo</option>
                            <option value="vacaciones" disabled={personal.estado_laboral === 'vacaciones'}>De Permiso</option>
                            <option value="licencia" disabled={personal.estado_laboral === 'licencia'}>En Licencia</option>
                            <option value="desvinculado" disabled={personal.estado_laboral === 'desvinculado'}>Desvinculado (sale de la empresa)</option>
                        </select>
                    </div>
                    {modalEstado.estado === 'desvinculado' && (
                        <div className="space-y-3 animate-fade-in">
                            {personal.usuario_id && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex gap-3">
                                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-400">
                                        Al marcar como <strong>Desvinculado</strong>, la cuenta de sistema vinculada será <strong>suspendida</strong> automáticamente.
                                    </p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Razón <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={modalEstado.razon}
                                    onChange={e => setModalEstado({ ...modalEstado, razon: e.target.value })}
                                    rows={3}
                                    placeholder="Motivo de la desvinculación..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600/50 resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* ── Modal Crear Usuario ── */}
            <Modal
                open={modalCrearUsuario}
                onClose={() => { setModalCrearUsuario(false); setCrearForm({ email: '', rol_id: '' }); }}
                title="Crear Cuenta de Sistema"
                size="sm"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalCrearUsuario(false)} disabled={crearLoading}>Cancelar</Button>
                        <Button onClick={handleCrearUsuario} loading={crearLoading}>Crear cuenta</Button>
                    </>
                }>
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Se creará una cuenta de sistema para <strong className="text-slate-900 dark:text-white">
                            {personal.nombre} {personal.apellido_paterno}</strong>.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Correo electrónico <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            value={crearForm.email}
                            onChange={e => setCrearForm({ ...crearForm, email: e.target.value })}
                            placeholder="usuario@empresa.com"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600/50"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Rol <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={crearForm.rol_id}
                            onChange={e => setCrearForm({ ...crearForm, rol_id: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600/50">
                            <option value="">Seleccionar rol...</option>
                            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible || r.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </Modal>

            {/* ── Modal Vincular Usuario ── */}
            <Modal
                open={modalVincularUsuario}
                onClose={() => { setModalVincularUsuario(false); setVincularSeleccionado(null); setVincularBusqueda(''); }}
                title="Vincular Cuenta Existente"
                size="md"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalVincularUsuario(false)} disabled={vincularLoading}>Cancelar</Button>
                        <Button onClick={handleVincularUsuario} loading={vincularLoading} disabled={!vincularSeleccionado}>
                            Vincular
                        </Button>
                    </>
                }>
                <div className="space-y-3">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={vincularBusqueda}
                            onChange={e => setVincularBusqueda(e.target.value)}
                            placeholder="Buscar usuario por email o nombre..."
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-600/50"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1.5">
                        {usuariosFiltrados.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">No hay usuarios disponibles</p>
                        )}
                        {usuariosFiltrados.map(u => (
                            <button
                                key={u.id}
                                onClick={() => setVincularSeleccionado(u)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                    vincularSeleccionado?.id === u.id
                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                                }`}>
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                    {(u.nombre || u.email || '?')[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    {u.nombre && <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{u.nombre}</p>}
                                    <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                </div>
                                {vincularSeleccionado?.id === u.id && (
                                    <CheckCircle size={16} className="text-emerald-500 ml-auto shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* ── ConfirmDialog Desvincular ── */}
            <ConfirmDialog
                open={modalDesvincular}
                onCancel={() => setModalDesvincular(false)}
                onConfirm={handleDesvincularUsuario}
                title="Desconectar Cuenta del Sistema"
                confirmText="Desconectar"
                danger
                loading={actionLoading}
                message={`¿Desconectar la cuenta "${personal.usuario?.email ?? ''}" de este registro de personal? La cuenta de usuario seguirá activa e intacta, solo se rompe el vínculo. Para bloquear el acceso al sistema usa "Cambiar estado laboral → Desvinculado".`}
            />

            {/* ── ConfirmDialog Eliminar ── */}
            <ConfirmDialog
                open={modalEliminar}
                onCancel={() => setModalEliminar(false)}
                onConfirm={handleEliminar}
                title="Archivar Personal"
                confirmText="Archivar"
                danger
                loading={actionLoading}
                message={`¿Archivar a ${personal.nombre} ${personal.apellido_paterno}? El registro pasará a la papelera y podrá restaurarse.${personal.usuario_id ? ' La cuenta de sistema vinculada NO se verá afectada.' : ''}`}
            />

            {/* ── Modal Competencia ── */}
            {modalCompetencia.open && (
                <AsignarCompetenciaModal
                    personalId={id}
                    competenciaId={modalCompetencia.competenciaId}
                    pivotId={modalCompetencia.pivotId}
                    onClose={() => setModalCompetencia({ open: false, competenciaId: null, pivotId: null })}
                    onSuccess={cargar}
                />
            )}
        </div>
    );
};

export default DetallePersonal;
