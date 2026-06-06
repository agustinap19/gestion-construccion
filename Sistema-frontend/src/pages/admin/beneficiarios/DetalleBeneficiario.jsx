import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { 
    Users, MapPin, Mail, Phone, Calendar, Shield, Edit, MoreVertical, Building, Check, Briefcase, FileText
} from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Tabs from '../../../components/ui/Tabs';
import Badge from '../../../components/ui/Badge';
import Dropdown from '../../../components/ui/Dropdown';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import ModalCambiarEstado from '../../../components/beneficiarios/ModalCambiarEstado';
import TimelineEstados from '../../../components/beneficiarios/TimelineEstados';
import EstadoBeneficiarioBadge from '../../../components/beneficiarios/EstadoBeneficiarioBadge';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import beneficiarioService from '../../../services/beneficiarioService';
import AuditoriaTimeline from '../../../components/ui/AuditoriaTimeline';
import BotonExportar from '../../../components/ui/BotonExportar';

const DetalleBeneficiario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission, hasRole } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const [isEstadoModalOpen, setIsEstadoModalOpen] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [razonEliminacion, setRazonEliminacion] = useState('');

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const response = await beneficiarioService.getById(id);
            setData(response);
        } catch (error) {
            console.error("Error al cargar beneficiario:", error);
            toast.error("No se pudo cargar el beneficiario");
            navigate('/dashboard/beneficiarios');
        } finally {
            setLoading(false);
        }
    };

    const handleCambiarEstado = async (payload) => {
        try {
            await beneficiarioService.cambiarEstado(id, payload.estado_seleccion, payload.razon, {
                fecha_aceptacion: payload.fecha_aceptacion,
                fecha_entrega_vivienda: payload.fecha_entrega_vivienda
            });
            toast.success("Estado actualizado correctamente");
            setIsEstadoModalOpen(false);
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.errors?.estado_seleccion?.[0] || error.response?.data?.error || "Error al actualizar estado");
        }
    };

    const handleDelete = async () => {
        if (!razonEliminacion.trim()) {
            toast.error("La razón es obligatoria");
            return;
        }

        try {
            await beneficiarioService.delete(id, razonEliminacion);
            toast.success("Beneficiario eliminado correctamente");
            navigate('/dashboard/beneficiarios');
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar");
        }
    };

    if (loading || !data) return <div className="text-center py-12 text-slate-400">Cargando perfil...</div>;

    const { beneficiario, transiciones_permitidas } = data;

    const dropdownItems = [];
    if (hasPermission('beneficiarios.editar')) {
        dropdownItems.push({ label: 'Editar Datos', onClick: () => navigate(`/dashboard/beneficiarios/${id}/editar`) });
    }
    if (hasPermission('beneficiarios.eliminar')) {
        dropdownItems.push({ separator: true });
        dropdownItems.push({ label: 'Eliminar', danger: true, onClick: () => setIsDeleteModalOpen(true) });
    }

    const tabItems = [
        {
            id: 'info',
            label: 'Información Personal',
            icon: <Users className="w-4 h-4" />,
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                    <Card title="Identificación" icon={<Shield className="w-5 h-5 text-emerald-400" />}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-slate-500">Carnet de Identidad</p>
                                    <p className="font-medium text-slate-200">{beneficiario.ci_completo}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Fecha de Nacimiento</p>
                                    <p className="font-medium text-slate-200">
                                        {beneficiario.fecha_nacimiento || 'No registrada'} 
                                        {beneficiario.edad && <span className="text-slate-500 text-sm ml-2">({beneficiario.edad} años)</span>}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Estado Civil</p>
                                    <p className="font-medium text-slate-200 capitalize">{beneficiario.estado_civil || 'No registrado'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">Género</p>
                                    <p className="font-medium text-slate-200 capitalize">{beneficiario.genero || 'No registrado'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Contacto" icon={<Phone className="w-5 h-5 text-emerald-400" />}>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500">Teléfono Principal</p>
                                    <p className="font-medium text-slate-200">{beneficiario.telefono_principal || 'No registrado'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500">Teléfono Alternativo</p>
                                    <p className="font-medium text-slate-200">{beneficiario.telefono_alternativo || 'No registrado'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-slate-500 mt-0.5" />
                                <div>
                                    <p className="text-sm text-slate-500">Email</p>
                                    <p className="font-medium text-slate-200">{beneficiario.email || 'No registrado'}</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Núcleo Familiar y Economía" icon={<Users className="w-5 h-5 text-emerald-400" />}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-slate-500">Familiares Totales</p>
                                <p className="text-xl font-bold text-slate-200">{beneficiario.cantidad_familiares}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Personas Dependientes</p>
                                <p className="text-xl font-bold text-slate-200">{beneficiario.personas_dependientes || 0}</p>
                            </div>
                            <div className="col-span-2 mt-2 p-4 bg-slate-900 rounded-xl border border-slate-700/50">
                                <p className="text-sm text-slate-500 mb-1">Ingreso Mensual Familiar (Bs.)</p>
                                {beneficiario.ingreso_mensual_familiar !== null ? (
                                    <p className="text-2xl font-mono text-emerald-400">Bs. {beneficiario.ingreso_mensual_familiar}</p>
                                ) : (
                                    <div className="flex items-center gap-2 text-slate-400" title="Información confidencial">
                                        <span className="text-xl font-mono">{beneficiario.ingreso_mensual_familiar_oculto || 'No registrado'}</span>
                                        <Shield className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'vivienda',
            label: 'Vivienda y Terreno',
            icon: <Building className="w-4 h-4" />,
            content: (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
                    <Card title="Tipo de Vivienda Asignada" icon={<Home className="w-5 h-5 text-emerald-400" />}>
                        {beneficiario.tipo_vivienda ? (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-200">{beneficiario.tipo_vivienda.nombre}</h4>
                                    <p className="text-slate-400 text-sm">{beneficiario.tipo_vivienda.descripcion}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-700/50">
                                    <div>
                                        <p className="text-sm text-slate-500">Superficie</p>
                                        <p className="font-medium text-slate-200">{beneficiario.tipo_vivienda.metros_cuadrados} m²</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500">Dormitorios</p>
                                        <p className="font-medium text-slate-200">{beneficiario.tipo_vivienda.cantidad_dormitorios}</p>
                                    </div>
                                </div>
                                {hasPermission('beneficiarios.editar') && beneficiario.estado_seleccion !== 'vivienda_entregada' && (
                                    <Button variant="secondary" className="w-full">Cambiar Tipo de Vivienda</Button>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <Home className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-400 mb-4">Aún no se ha asignado un tipo de vivienda a esta familia.</p>
                                {hasPermission('beneficiarios.editar') && (
                                    <Button variant="primary">Asignar Vivienda</Button>
                                )}
                            </div>
                        )}
                    </Card>

                    <Card title="Ubicación del Terreno" icon={<MapPin className="w-5 h-5 text-emerald-400" />}>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-slate-500">Dirección Actual de Vivienda</p>
                                <p className="font-medium text-slate-200">{beneficiario.direccion_actual || 'No registrada'}</p>
                            </div>
                            <div className="pt-3 border-t border-slate-700/50">
                                <p className="text-sm text-slate-500">Dirección del Terreno del Proyecto</p>
                                <p className="font-medium text-slate-200">{beneficiario.direccion_terreno || 'No registrada'}</p>
                            </div>
                            {beneficiario.latitud_terreno && beneficiario.longitud_terreno && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-slate-700 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-slate-800 opacity-50 bg-[url('https://www.transparenttextures.com/patterns/grid-noise.png')]"></div>
                                    <div className="relative z-10 flex flex-col items-center justify-center h-24">
                                        <MapPin className="w-8 h-8 text-red-500 mb-2 drop-shadow-lg" />
                                        <p className="text-xs font-mono text-slate-400">
                                            {beneficiario.latitud_terreno}, {beneficiario.longitud_terreno}
                                        </p>
                                    </div>
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${beneficiario.latitud_terreno},${beneficiario.longitud_terreno}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                                    >
                                        <span className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium text-sm">Ver en Google Maps</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            )
        },
        {
            id: 'estado',
            label: 'Estado y Transiciones',
            icon: <Check className="w-4 h-4" />,
            content: (
                <div className="space-y-6 animate-fadeIn">
                    <Card>
                        <TimelineEstados estadoActual={beneficiario.estado_seleccion} />
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Fechas Clave" icon={<Calendar className="w-5 h-5 text-emerald-400" />}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                                    <span className="text-slate-400">Fecha de Registro</span>
                                    <span className="font-medium text-slate-200">{new Date(beneficiario.created_at).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                                    <span className="text-slate-400">Fecha de Aceptación</span>
                                    <span className="font-medium text-slate-200">{beneficiario.fecha_aceptacion || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-slate-400">Fecha Entrega Vivienda</span>
                                    <span className="font-medium text-slate-200">{beneficiario.fecha_entrega_vivienda || '-'}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Acciones de Estado" icon={<Edit className="w-5 h-5 text-emerald-400" />}>
                            <div className="flex flex-col items-center justify-center h-full min-h-[150px]">
                                {hasPermission('beneficiarios.cambiar_estado') ? (
                                    transiciones_permitidas.length > 0 ? (
                                        <Button variant="primary" onClick={() => setIsEstadoModalOpen(true)}>
                                            Modificar Estado
                                        </Button>
                                    ) : (
                                        <div className="text-center">
                                            {beneficiario.estado_seleccion === 'vivienda_entregada' && (
                                                <div className="text-emerald-400 mb-2"><Check className="w-8 h-8 mx-auto" /></div>
                                            )}
                                            <p className="text-slate-400">
                                                Este beneficiario ha llegado a un estado final y no admite más transiciones.
                                            </p>
                                        </div>
                                    )
                                ) : (
                                    <p className="text-slate-400 text-center">No tienes permisos para modificar el estado.</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            )
        },
        {
            id: 'auditoria',
            label: 'Auditoría',
            icon: <Shield className="w-4 h-4" />,
            content: <AuditoriaTimeline entidad="beneficiarios" id={id} />
        }
    ];

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            <div className="flex items-center gap-4 text-sm text-slate-400 mb-2">
                <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('/dashboard/beneficiarios')}>Beneficiarios</span>
                <span>/</span>
                <span className="text-emerald-500 font-medium">{beneficiario.codigo_beneficiario}</span>
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-500 text-2xl font-bold shadow-lg overflow-hidden shrink-0">
                            {beneficiario.foto_titular_url ? (
                                <img src={beneficiario.foto_titular_url} alt={beneficiario.nombre} className="w-full h-full object-cover" />
                            ) : (
                                beneficiario.nombre.charAt(0)
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{beneficiario.nombre_completo}</h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-mono border border-slate-700">
                                    {beneficiario.codigo_beneficiario}
                                </span>
                                <span className="flex items-center gap-1 text-slate-400 text-sm hover:text-slate-300 cursor-help" title={beneficiario.proyecto?.nombre}>
                                    <Building className="w-4 h-4" /> {beneficiario.proyecto?.codigo}
                                </span>
                                <EstadoBeneficiarioBadge estado={beneficiario.estado_seleccion} />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 items-center">
                        <BotonExportar
                            url={`/beneficiarios/${id}/reportes/fotografico`}
                            formatos={['pdf']}
                            label="Rep. Fotográfico"
                        />
                        <BotonExportar
                            url={`/beneficiarios/${id}/reportes/planilla-entregas`}
                            formatos={['pdf', 'excel']}
                            label="Planilla Entregas"
                        />
                        {hasPermission('beneficiarios.editar') && (
                            <Button variant="secondary" onClick={() => navigate(`/dashboard/beneficiarios/${id}/editar`)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                            </Button>
                        )}
                        {dropdownItems.length > 0 && (
                            <Dropdown 
                                trigger={<Button variant="ghost"><MoreVertical className="w-5 h-5 text-slate-300" /></Button>}
                                items={dropdownItems}
                                align="right"
                            />
                        )}
                    </div>
                </div>
            </div>

            <Tabs tabs={tabItems} />

            <ModalCambiarEstado 
                isOpen={isEstadoModalOpen}
                onClose={() => setIsEstadoModalOpen(false)}
                beneficiario={beneficiario}
                transiciones={transiciones_permitidas}
                onGuardar={handleCambiarEstado}
            />

            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar Beneficiario"
                message={<>
                    <p className="mb-4">¿Estás seguro de que deseas eliminar a <strong>{beneficiario.nombre_completo}</strong>?</p>
                    <p className="mb-4 text-orange-400 text-sm">Esta acción ocultará el registro del sistema, pero su historial de cambios se conservará.</p>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Razón obligatoria <span className="text-red-400">*</span></label>
                        <textarea
                            value={razonEliminacion}
                            onChange={(e) => setRazonEliminacion(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-red-500/50"
                            rows="2"
                            placeholder="Especifica el motivo de la eliminación..."
                        />
                    </div>
                </>}
                confirmText="Sí, Eliminar"
                confirmVariant="danger"
            />
        </div>
    );
};

export default DetalleBeneficiario;
