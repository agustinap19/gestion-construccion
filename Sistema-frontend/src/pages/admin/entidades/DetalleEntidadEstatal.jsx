import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import {
    Building, MapPin, Mail, Phone, Calendar, Shield, Edit, MoreVertical, Link2, Briefcase, Trash, ArrowLeft
} from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Avatar from '../../../components/ui/Avatar';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Dropdown from '../../../components/ui/Dropdown';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import entidadEstatalService from '../../../services/entidadEstatalService';
import AuditoriaTimeline from '../../../components/ui/AuditoriaTimeline';

const DetalleEntidadEstatal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [entidad, setEntidad] = useState(null);
    const [estadisticas, setEstadisticas] = useState({});
    const [cargando, setCargando] = useState(true);

    const [modalEstado, setModalEstado] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [razonEstado, setRazonEstado] = useState('');
    const [cambiandoEstado, setCambiandoEstado] = useState(false);

    const [modalEliminar, setModalEliminar] = useState(false);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const data = await entidadEstatalService.obtener(id);
            setEntidad(data.entidad);
            setEstadisticas(data.estadisticas);
        } catch (error) {
            toast.error("Error al cargar detalles de la entidad");
            navigate('/dashboard/entidades-estatales');
        } finally {
            setCargando(false);
        }
    };

    const handleCambiarEstado = async () => {
        if (nuevoEstado === 'en_disputa' && !razonEstado.trim()) {
            toast.error("Razón obligatoria al poner en disputa");
            return;
        }

        try {
            setCambiandoEstado(true);
            await entidadEstatalService.cambiarEstado(id, nuevoEstado, razonEstado);
            toast.success("Estado actualizado");
            setModalEstado(false);
            setRazonEstado('');
            cargarDatos();
        } catch (error) {
            toast.error(error.message || "Error al cambiar el estado");
        } finally {
            setCambiandoEstado(false);
        }
    };

    const handleEliminar = async () => {
        if (!razonEliminar.trim()) {
            toast.error("Debe ingresar una razón para eliminar");
            return;
        }

        try {
            setEliminando(true);
            await entidadEstatalService.eliminar(id, razonEliminar);
            toast.success("Entidad eliminada exitosamente");
            navigate('/dashboard/entidades-estatales');
        } catch (error) {
            toast.error(error.message || "Error al eliminar");
        } finally {
            setEliminando(false);
            setModalEliminar(false);
        }
    };

    const getStateColor = (estado) => {
        const colors = { 'activa': 'success', 'inactiva': 'secondary', 'en_disputa': 'warning' };
        return colors[estado] || 'primary';
    };

    if (cargando || !entidad) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    const tabs = [
        { id: 'informacion', label: 'Información General' },
        { id: 'proyectos', label: `Proyectos y Licitaciones (${estadisticas.cantidad_proyectos})` },
        { id: 'auditoria', label: 'Auditoría' },
    ];

    const tabContent = {
        informacion: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-white">Identificación</h3>
                        {hasPermission('entidades.editar') && (
                            <Button variant="ghost" size="sm" icon={Edit} onClick={() => navigate(`/dashboard/entidades-estatales/${id}/editar`)}>Editar</Button>
                        )}
                    </div>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Nivel Gubernamental:</span>
                            <span className="col-span-2 text-blue-400 capitalize font-medium">{entidad.nivel}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Nombre Completo:</span>
                            <span className="col-span-2 text-white">{entidad.nombre}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Sigla:</span>
                            <span className="col-span-2 text-white font-medium">{entidad.sigla || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">NIT:</span>
                            <span className="col-span-2 text-slate-300 font-mono">{entidad.nit}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">Contacto y Ubicación</h3>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><Phone size={14}/> Teléfono:</span>
                            <span className="col-span-2 text-slate-300">{entidad.telefono_principal || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><Mail size={14}/> Email Oficial:</span>
                            <span className="col-span-2 text-blue-400">{entidad.email_oficial || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><Link2 size={14}/> Sitio Web:</span>
                            <span className="col-span-2 text-emerald-400">
                                {entidad.sitio_web ? <a href={`https://${entidad.sitio_web.replace('https://','')}`} target="_blank" rel="noreferrer" className="hover:underline">{entidad.sitio_web}</a> : '-'}
                            </span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><MapPin size={14}/> Zona/Región:</span>
                            <span className="col-span-2 text-slate-300">{entidad.zona?.nombre || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Dirección:</span>
                            <span className="col-span-2 text-slate-300">{entidad.direccion || '-'}</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-5 md:col-span-2">
                    <h3 className="text-lg font-medium text-white mb-4">Representación e Intereses</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Rep. Legal / Máxima Autoridad (MAE):</span>
                            <span className="col-span-2 text-white">{entidad.representante_legal || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Cargo:</span>
                            <span className="col-span-2 text-slate-300">{entidad.cargo_representante || '-'}</span>
                        </div>
                        <div className="grid grid-cols-3 md:col-span-2">
                            <span className="text-slate-500">Tipo de Proyectos que Licita:</span>
                            <span className="col-span-2 text-slate-300">{entidad.tipo_proyectos_que_otorga || '-'}</span>
                        </div>
                        {entidad.notas && (
                            <div className="grid grid-cols-3 md:col-span-2 mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                <span className="text-slate-500">Notas / Observaciones:</span>
                                <span className="col-span-2 text-slate-300 italic">{entidad.notas}</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        ),
        proyectos: (
            <Card className="p-8">
                <EmptyState
                    icon={Building}
                    title="Módulo en desarrollo"
                    description="El listado de proyectos públicos, licitaciones (SICOES) y contratos se activará pronto."
                />
            </Card>
        ),
        auditoria: <AuditoriaTimeline entidad="entidades-estatales" id={id} />
    };

    const accionesDropdown = [
        { label: 'Editar Información', icon: Edit, onClick: () => navigate(`/dashboard/entidades-estatales/${id}/editar`), show: hasPermission('entidades.editar') },
        { label: 'Cambiar Estado', icon: Shield, onClick: () => { setNuevoEstado(entidad.estado); setModalEstado(true); }, show: hasPermission('entidades.editar') },
        { label: 'Eliminar', icon: Trash, onClick: () => setModalEliminar(true), show: hasPermission('entidades.eliminar'), danger: true }
    ].filter(a => a.show);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 shadow-lg">
                        <Building size={32} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                            {entidad.nombre}
                            <Badge variant={getStateColor(entidad.estado)}>
                                {entidad.estado.replace('_', ' ').charAt(0).toUpperCase() + entidad.estado.replace('_', ' ').slice(1)}
                            </Badge>
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <span className="text-slate-300 font-medium">{entidad.sigla || 'Sin Sigla'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="font-mono text-xs">NIT: {entidad.nit}</span>
                            <span className="text-slate-600">•</span>
                            <span className="capitalize">{entidad.nivel}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/dashboard/entidades-estatales')}>
                        Volver
                    </Button>
                    {accionesDropdown.length > 0 && (
                        <Dropdown trigger={<Button variant="secondary" icon={MoreVertical} />}>
                            {accionesDropdown.map((acc, i) => (
                                <button key={i} onClick={acc.onClick} className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${acc.danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}>
                                    <acc.icon size={16} /> {acc.label}
                                </button>
                            ))}
                        </Dropdown>
                    )}
                </div>
            </div>

            <Tabs tabs={tabs}>
                {tabContent}
            </Tabs>

            {/* Modal Estado */}
            <ConfirmDialog
                isOpen={modalEstado}
                onClose={() => setModalEstado(false)}
                onConfirm={handleCambiarEstado}
                title="Cambiar Estado de Entidad"
                message="Selecciona el nuevo estado de la entidad estatal."
                confirmText="Actualizar Estado"
                isLoading={cambiandoEstado}
            >
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Nuevo Estado</label>
                        <select 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            value={nuevoEstado}
                            onChange={(e) => setNuevoEstado(e.target.value)}
                        >
                            <option value="activa">Activa</option>
                            <option value="inactiva">Inactiva</option>
                            <option value="en_disputa">En Disputa Legal / Conflicto</option>
                        </select>
                    </div>

                    {nuevoEstado === 'en_disputa' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Razón de la Disputa <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                rows="3"
                                placeholder="Especifique los detalles del conflicto legal o deuda..."
                                value={razonEstado}
                                onChange={(e) => setRazonEstado(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </ConfirmDialog>

            <ConfirmDialog
                isOpen={modalEliminar}
                onClose={() => setModalEliminar(false)}
                onConfirm={handleEliminar}
                title="Eliminar Entidad"
                message={`¿Estás seguro de eliminar "${entidad.nombre}"?`}
                confirmText="Sí, Eliminar"
                confirmVariant="danger"
                isLoading={eliminando}
            >
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Razón <span className="text-rose-500">*</span></label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500"
                        rows="3"
                        value={razonEliminar}
                        onChange={(e) => setRazonEliminar(e.target.value)}
                    />
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default DetalleEntidadEstatal;
