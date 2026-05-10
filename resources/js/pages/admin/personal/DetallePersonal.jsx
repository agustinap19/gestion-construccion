import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Avatar from '../../../components/ui/Avatar';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Dropdown from '../../../components/ui/Dropdown';
import { Briefcase, Edit, UserPlus, UserMinus, UserX, Calendar, Shield, MapPin, Phone, Mail, Award, Clock, Activity, FileText, CheckCircle, AlertTriangle } from '../../../components/icons/Icons';
import AsignarCompetenciaModal from '../../../components/personal/AsignarCompetenciaModal';

const estadoBadge = (estado) => {
    const map = { activo: 'success', vacaciones: 'warning', licencia: 'info', desvinculado: 'danger' };
    return <Badge variant={map[estado] || 'neutral'}>{estado}</Badge>;
};

const DetallePersonal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasPermission } = useAuth();
    
    const [personalData, setPersonalData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('informacion');
    
    const [modalEstado, setModalEstado] = useState({ open: false, estado: '', razon: '' });
    const [modalDesvincular, setModalDesvincular] = useState(false);
    const [modalEliminar, setModalEliminar] = useState(false);
    const [modalCompetencia, setModalCompetencia] = useState({ open: false, competenciaId: null });
    
    const [actionLoading, setActionLoading] = useState(false);

    const isGerenteOrFinanzas = user?.rol?.nombre === 'gerente' || user?.rol?.nombre === 'encargado_finanzas';

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const res = await personalService.obtener(id);
            setPersonalData(res.data);
        } catch (e) {
            toast.error('Error al cargar el personal');
            navigate('/dashboard/personal');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    if (loading || !personalData) {
        return (
            <div className="space-y-6">
                <Skeleton height="120px" className="rounded-2xl" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6"><Skeleton height="300px" className="rounded-2xl" /></div>
                    <div className="space-y-6"><Skeleton height="200px" className="rounded-2xl" /></div>
                </div>
            </div>
        );
    }

    const { personal, estadisticas_competencias, auditoria } = personalData;

    const handleCambiarEstado = async () => {
        if (!modalEstado.estado) return toast.error('Seleccione un estado');
        if (modalEstado.estado === 'desvinculado' && !modalEstado.razon) return toast.error('La razón es obligatoria para desvincular');
        
        try {
            setActionLoading(true);
            await personalService.cambiarEstadoLaboral(id, modalEstado.estado, modalEstado.razon || null);
            toast.success('Estado actualizado correctamente');
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
            toast.success('Usuario desvinculado correctamente');
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

    const tabs = [
        { id: 'informacion', label: 'Información', icon: <UserPlus size={18} /> },
        { id: 'laboral', label: 'Laboral', icon: <Briefcase size={18} /> },
        { id: 'sistema', label: 'Sistema', icon: <Shield size={18} /> },
        { id: 'competencias', label: 'Competencias', icon: <Award size={18} />, badge: estadisticas_competencias?.competencias_vencidas > 0 ? estadisticas_competencias.competencias_vencidas : null },
        { id: 'auditoria', label: 'Auditoría', icon: <Activity size={18} /> },
    ];

    const menuAcciones = [
        { label: 'Editar personal', icon: <Edit size={16} />, onClick: () => navigate(`/dashboard/personal/${id}/editar`) },
        { label: 'Cambiar estado laboral', icon: <Activity size={16} />, onClick: () => setModalEstado({ open: true, estado: '', razon: '' }) },
        { type: 'divider' },
        ...(personal.usuario_id 
            ? [{ label: 'Desvincular usuario', icon: <UserMinus size={16} />, onClick: () => setModalDesvincular(true) }]
            : [{ label: 'Crear cuenta de sistema', icon: <Shield size={16} />, onClick: () => setActiveTab('sistema') }]
        ),
        { type: 'divider' },
        { label: 'Eliminar personal', icon: <UserX size={16} />, danger: true, onClick: () => setModalEliminar(true) },
    ];

    return (
        <div className="animate-fade-in space-y-6">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/personal')} className="mb-2">← Volver a la lista</Button>
            
            <div className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                <div className="flex items-center gap-5 relative z-10">
                    <Avatar name={`${personal.nombre} ${personal.apellido_paterno}`} size="xl" />
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                {personal.nombre} {personal.apellido_paterno} {personal.apellido_materno || ''}
                            </h1>
                            {estadoBadge(personal.estado_laboral)}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2 font-mono">
                            <Briefcase size={14} /> {personal.codigo_empleado}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                            <span className="capitalize">{personal.tipo.replace('_', ' ')}</span>
                            {personal.especialidad && <><span className="text-slate-300 dark:text-slate-600">•</span><span>{personal.especialidad}</span></>}
                            {personal.usuario_id && <><span className="text-slate-300 dark:text-slate-600">•</span><span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle size={14} /> Sistema</span></>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative z-10 w-full md:w-auto">
                    <Button variant="outline" leftIcon={<Edit size={18} />} onClick={() => navigate(`/dashboard/personal/${id}/editar`)} className="flex-1 md:flex-none">Editar</Button>
                    <Dropdown items={menuAcciones}>
                        <Button variant="secondary" className="px-2"><MoreVertical size={20} /></Button>
                    </Dropdown>
                </div>
            </div>

            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

            <div className="mt-6">
                {activeTab === 'informacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Datos Personales</h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400 col-span-1">Nombre completo</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white col-span-2">{personal.nombre} {personal.apellido_paterno} {personal.apellido_materno || ''}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400 col-span-1">CI</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white col-span-2">{personal.ci} {personal.ci_complemento ? `-${personal.ci_complemento}` : ''}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                    <span className="text-sm text-slate-500 dark:text-slate-400 col-span-1">Nacimiento</span>
                                    <span className="text-sm font-medium text-slate-900 dark:text-white col-span-2">{personal.fecha_nacimiento ? new Date(personal.fecha_nacimiento).toLocaleDateString('es-BO') : 'No registrado'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Contacto</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4 pb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500"><Phone size={18} /></div>
                                    <div>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Teléfono</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{personal.telefono || 'No registrado'}</span>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4 pb-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500"><MapPin size={18} /></div>
                                    <div>
                                        <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Dirección</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">{personal.direccion || 'No registrado'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'laboral' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Datos del Contrato</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Fecha contratación</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{new Date(personal.fecha_contratacion).toLocaleDateString('es-BO')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Tipo contrato</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{personal.tipo_contrato.replace('_', ' ')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Tipo de personal</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{personal.tipo.replace('_', ' ')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                        <span className="text-sm text-slate-500 dark:text-slate-400">Categoría</span>
                                        <span className="text-sm font-medium text-slate-900 dark:text-white">{personal.categoria || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {isGerenteOrFinanzas ? (
                                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Compensación y Banco</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">Salario base</span>
                                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Bs. {Number(personal.salario_base).toLocaleString('es-BO')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">Frecuencia de pago</span>
                                            <span className="text-sm font-medium text-slate-900 dark:text-white capitalize">{personal.frecuencia_pago}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">Banco</span>
                                            <span className="text-sm font-medium text-slate-900 dark:text-white">{personal.banco || 'No registrado'}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800/50 pb-4">
                                            <span className="text-sm text-slate-500 dark:text-slate-400">Cuenta bancaria</span>
                                            <span className="text-sm font-mono text-slate-900 dark:text-white">{personal.numero_cuenta || 'No registrado'} {personal.tipo_cuenta ? `(${personal.tipo_cuenta})` : ''}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 dark:bg-slate-900/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6 flex flex-col items-center justify-center text-center">
                                    <Shield size={32} className="text-slate-400 mb-3" />
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">No tienes permisos suficientes para ver la información de compensación y datos bancarios.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'sistema' && (
                    <div className="animate-fade-in">
                        {personal.usuario_id && personal.usuario ? (
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6">
                                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800/50">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cuenta de Sistema Activa</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{personal.usuario.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Rol en el sistema</p>
                                        <Badge variant="info">{personal.usuario.rol?.nombre_visible || 'Sin rol'}</Badge>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Estado de cuenta</p>
                                        {estadoBadge(personal.usuario.estado)}
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Último acceso</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{personal.usuario.ultimo_acceso ? new Date(personal.usuario.ultimo_acceso).toLocaleString('es-BO') : 'Nunca'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button onClick={() => navigate(`/dashboard/usuarios/${personal.usuario_id}`)} leftIcon={<Eye size={18} />}>Ver detalle de usuario</Button>
                                    <Button variant="danger" outline onClick={() => setModalDesvincular(true)} leftIcon={<UserMinus size={18} />}>Desvincular cuenta</Button>
                                </div>
                            </div>
                        ) : (
                            <EmptyState icon={<UserPlus size={32} />} title="Sin cuenta de sistema" description="Este trabajador no tiene acceso al sistema. Puedes crearle una cuenta nueva o vincularlo a una cuenta existente."
                                action={<div className="flex gap-3"><Button variant="primary">Crear cuenta nueva</Button><Button variant="outline">Vincular cuenta existente</Button></div>} />
                        )}
                    </div>
                )}

                {activeTab === 'competencias' && (
                    <div className="animate-fade-in space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Competencias y Certificaciones</h3>
                            <Button size="sm" leftIcon={<Plus size={16} />} onClick={() => setModalCompetencia({ open: true, competenciaId: null })}>Asignar competencia</Button>
                        </div>
                        
                        {!personal.competencias || personal.competencias.length === 0 ? (
                            <EmptyState icon={<Award size={32} />} title="Sin competencias" description="Este trabajador aún no tiene competencias o certificaciones registradas." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {personal.competencias.map(comp => (
                                    <div key={comp.pivot.id} className="bg-white dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/50 rounded-2xl p-5 flex flex-col">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{comp.nombre}</h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{comp.tipo.replace('_', ' ')}</p>
                                            </div>
                                            {comp.pivot.estado === 'vencida' ? <Badge variant="danger">Vencida</Badge> : <Badge variant="success">Vigente</Badge>}
                                        </div>
                                        <div className="space-y-2 mb-4 flex-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 dark:text-slate-400">Emisión:</span>
                                                <span className="text-slate-900 dark:text-white">{new Date(comp.pivot.fecha_emision).toLocaleDateString('es-BO')}</span>
                                            </div>
                                            {comp.pivot.fecha_vencimiento && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 dark:text-slate-400">Vencimiento:</span>
                                                    <span className={`font-medium ${comp.pivot.estado === 'vencida' ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                                        {new Date(comp.pivot.fecha_vencimiento).toLocaleDateString('es-BO')}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                            <Button variant="ghost" size="sm" onClick={() => setModalCompetencia({ open: true, competenciaId: comp.id })}>Editar</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'auditoria' && (
                    <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Historial de Cambios</h3>
                        {!auditoria || auditoria.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No hay registros de auditoría para este personal.</p>
                        ) : (
                            <div className="space-y-6 border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-5 relative">
                                {auditoria.map(item => (
                                    <div key={item.id} className="relative">
                                        <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 ring-4 ring-white dark:ring-slate-900"></div>
                                        <p className="text-xs text-slate-400 mb-1">{new Date(item.created_at).toLocaleString('es-BO')}</p>
                                        <p className="text-sm font-medium text-slate-900 dark:text-white">{item.accion}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">Por: {item.actor?.email || 'Sistema'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Cambiar Estado */}
            <Modal open={modalEstado.open} onClose={() => setModalEstado({ open: false, estado: '', razon: '' })} title="Cambiar Estado Laboral" size="md"
                footer={<><Button variant="secondary" onClick={() => setModalEstado({ open: false, estado: '', razon: '' })} disabled={actionLoading}>Cancelar</Button>
                    <Button onClick={handleCambiarEstado} loading={actionLoading} variant={modalEstado.estado === 'desvinculado' ? 'danger' : 'primary'}>Guardar cambios</Button></>}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nuevo Estado <span className="text-red-500">*</span></label>
                        <select value={modalEstado.estado} onChange={e => setModalEstado({ ...modalEstado, estado: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-600/50">
                            <option value="">Seleccione un estado...</option>
                            <option value="activo" disabled={personal.estado_laboral === 'activo'}>Activo</option>
                            <option value="vacaciones" disabled={personal.estado_laboral === 'vacaciones'}>Vacaciones</option>
                            <option value="licencia" disabled={personal.estado_laboral === 'licencia'}>Licencia</option>
                            <option value="desvinculado" disabled={personal.estado_laboral === 'desvinculado'}>Desvinculado</option>
                        </select>
                    </div>
                    {modalEstado.estado === 'desvinculado' && (
                        <div className="animate-fade-in space-y-3">
                            {personal.usuario_id && (
                                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg flex items-start gap-3">
                                    <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-400"><strong>Atención:</strong> Al desvincular este personal, su cuenta de sistema vinculada será <strong>suspendida</strong> automáticamente y todas sus sesiones cerradas.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón de la desvinculación <span className="text-red-500">*</span></label>
                                <textarea value={modalEstado.razon} onChange={e => setModalEstado({ ...modalEstado, razon: e.target.value })} rows={3} placeholder="Motivo de la desvinculación..."
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-600/50 resize-none" />
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* ConfirmDialog Desvincular Usuario */}
            <ConfirmDialog open={modalDesvincular} onClose={() => setModalDesvincular(false)} onConfirm={handleDesvincularUsuario}
                title="Desvincular Cuenta de Sistema" confirmText="Desvincular" variant="danger" loading={actionLoading}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">¿Estás seguro de que deseas desvincular la cuenta <strong>{personal.usuario?.email}</strong> de este registro de personal? La cuenta de usuario seguirá existiendo pero ya no estará vinculada.</p>
            </ConfirmDialog>

            {/* ConfirmDialog Eliminar */}
            <ConfirmDialog open={modalEliminar} onClose={() => setModalEliminar(false)} onConfirm={handleEliminar}
                title="Eliminar Personal" confirmText="Eliminar permanentemente" variant="danger" loading={actionLoading}>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">¿Estás seguro de que deseas eliminar a <strong>{personal.nombre} {personal.apellido_paterno}</strong>? Esta acción lo enviará a la papelera (soft delete).</p>
                {personal.usuario_id && <p className="text-sm text-amber-600 dark:text-amber-500 mb-2 font-medium">Nota: Su cuenta de usuario vinculada NO será eliminada.</p>}
            </ConfirmDialog>

            {/* Modal Competencia */}
            {modalCompetencia.open && (
                <AsignarCompetenciaModal personalId={id} competenciaId={modalCompetencia.competenciaId} 
                    onClose={() => setModalCompetencia({ open: false, competenciaId: null })} onSuccess={cargar} />
            )}
        </div>
    );
};

export default DetallePersonal;
