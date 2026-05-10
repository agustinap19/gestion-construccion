import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Briefcase, Users, Building, MapPin, Calendar, 
    History, Shield, MoreVertical, Edit, Activity
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
import BarraProgresoProyecto from '../../../components/proyectos/BarraProgresoProyecto';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import proyectoService from '../../../services/proyectoService';

const DetalleProyecto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [proyecto, setProyecto] = useState(null);
    const [estadisticas, setEstadisticas] = useState({});
    const [auditoria, setAuditoria] = useState([]);
    const [transiciones, setTransiciones] = useState([]);
    const [cargando, setCargando] = useState(true);

    const [modalEstado, setModalEstado] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [razonEstado, setRazonEstado] = useState('');
    const [cambiandoEstado, setCambiandoEstado] = useState(false);

    const [modalEliminar, setModalEliminar] = useState(false);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => { cargarDatos(); }, [id]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const data = await proyectoService.obtener(id);
            setProyecto(data.proyecto);
            setEstadisticas(data.estadisticas || {});
            setAuditoria(data.auditoria || []);
            setTransiciones(data.transiciones_permitidas || []);
        } catch (error) {
            toast.error("Error al cargar detalles del proyecto");
            navigate('/dashboard/proyectos');
        } finally {
            setCargando(false);
        }
    };

    const handleCambiarEstado = async () => {
        if (['cancelado', 'pausado'].includes(nuevoEstado) && !razonEstado.trim()) {
            toast.error("Razón obligatoria para este cambio de estado");
            return;
        }
        try {
            setCambiandoEstado(true);
            await proyectoService.cambiarEstado(id, nuevoEstado, razonEstado);
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
            await proyectoService.eliminar(id, razonEliminar);
            toast.success("Proyecto eliminado exitosamente");
            navigate('/dashboard/proyectos');
        } catch (error) {
            toast.error(error.message || "Error al eliminar el proyecto");
        } finally {
            setEliminando(false);
            setModalEliminar(false);
        }
    };

    const getStateColor = (estado) => {
        const colors = { 'borrador': 'secondary', 'planificacion': 'info', 'en_ejecucion': 'success', 'pausado': 'warning', 'finalizado': 'primary', 'cancelado': 'danger' };
        return colors[estado] || 'secondary';
    };

    const getStateLabel = (estado) => {
        const labels = { 'borrador': 'Borrador', 'planificacion': 'Planificación', 'en_ejecucion': 'En Ejecución', 'pausado': 'Pausado', 'finalizado': 'Finalizado', 'cancelado': 'Cancelado' };
        return labels[estado] || estado;
    };

    if (cargando) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (!proyecto) return null;

    const esSocial = proyecto.categoria === 'social';

    const tabs = [
        { id: 'informacion', label: 'Información General' },
        ...(esSocial ? [{ id: 'viviendas', label: `Viviendas (${estadisticas.total_viviendas || 0})` }] : []),
        ...(!esSocial ? [{ id: 'fases', label: `Fases (${estadisticas.total_fases || 0})` }] : []),
        { id: 'personal', label: `Personal (${estadisticas.personal_asignado || 0})` },
        { id: 'auditoria', label: 'Auditoría' },
    ];

    const tabContent = {
        informacion: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-white">Datos Generales</h3>
                        {hasPermission('proyectos.editar') && (
                            <Button variant="ghost" size="sm" leftIcon={<Edit size={16} />} onClick={() => navigate(`/dashboard/proyectos/${id}/editar`)}>Editar</Button>
                        )}
                    </div>
                    <div className="space-y-4 text-sm">
                        {[
                            ['Tipo', proyecto.tipo_proyecto?.nombre || '—'],
                            ['Prioridad', <span className="capitalize">{proyecto.prioridad || 'media'}</span>],
                            ['Contraparte', esSocial ? proyecto.entidad_estatal?.nombre : proyecto.cliente?.nombre_visible],
                            ['Administrador', proyecto.administrador ? `${proyecto.administrador.nombre} ${proyecto.administrador.apellido_paterno || ''}` : '—'],
                        ].map(([k, v], i) => (
                            <div key={i} className="grid grid-cols-3">
                                <span className="text-slate-500">{k}:</span>
                                <span className="col-span-2 text-slate-300">{v || '—'}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">Cronograma y Finanzas</h3>
                    <div className="space-y-4 text-sm">
                        {[
                            ['Presupuesto', `Bs. ${parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-BO')}`],
                            ...(esSocial && proyecto.monto_garantia ? [['Garantía', `Bs. ${parseFloat(proyecto.monto_garantia).toLocaleString('es-BO')}`]] : []),
                            ['Inicio Plan.', proyecto.fecha_inicio_planificada || '—'],
                            ['Fin Plan.', proyecto.fecha_fin_planificada || '—'],
                            ['Inicio Real', proyecto.fecha_inicio_real || '—'],
                            ['Fin Real', proyecto.fecha_fin_real || '—'],
                        ].map(([k, v], i) => (
                            <div key={i} className="grid grid-cols-3">
                                <span className="text-slate-500">{k}:</span>
                                <span className="col-span-2 text-white font-medium">{v}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-5 md:col-span-2">
                    <h3 className="text-lg font-medium text-white mb-4">Avance del Proyecto</h3>
                    <BarraProgresoProyecto porcentaje={parseFloat(proyecto.porcentaje_avance)} size="lg" />
                    {proyecto.descripcion && (
                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                            <span className="text-slate-500 text-xs block mb-1">Descripción</span>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{proyecto.descripcion}</p>
                        </div>
                    )}
                </Card>

                <Card className="p-5 md:col-span-2">
                    <h3 className="text-lg font-medium text-white mb-4">Registro en Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">Zona</span>
                            <span className="text-emerald-400 flex items-center gap-1"><MapPin size={14} /> {proyecto.zona?.nombre || 'No asignada'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Dirección de Obra</span>
                            <span className="text-slate-300">{proyecto.direccion_obra || 'No registrada'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Fecha de Registro</span>
                            <span className="text-slate-300 flex items-center gap-1"><Calendar size={14} /> {new Date(proyecto.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </Card>
            </div>
        ),
        viviendas: (
            <Card className="p-6">
                {proyecto.viviendas?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                                <tr><th className="px-4 py-3">Código</th><th className="px-4 py-3">Beneficiario</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Avance</th></tr>
                            </thead>
                            <tbody>
                                {proyecto.viviendas.map(v => (
                                    <tr key={v.id} className="border-b border-slate-700/50 hover:bg-slate-800/30">
                                        <td className="px-4 py-3 font-mono text-xs">{v.codigo}</td>
                                        <td className="px-4 py-3">{v.beneficiario ? `${v.beneficiario.nombre} ${v.beneficiario.apellido_paterno || ''}` : <span className="text-slate-500 italic">Sin asignar</span>}</td>
                                        <td className="px-4 py-3 text-xs">{v.tipo_vivienda?.nombre || '—'}</td>
                                        <td className="px-4 py-3"><Badge variant="secondary" size="sm">{v.estado?.replace(/_/g, ' ')}</Badge></td>
                                        <td className="px-4 py-3 min-w-[120px]"><BarraProgresoProyecto porcentaje={parseFloat(v.porcentaje_avance)} size="sm" showLabel={false} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon={<Building size={32} />} title="Sin viviendas" description="Este proyecto aún no tiene viviendas registradas." />
                )}
            </Card>
        ),
        fases: (
            <Card className="p-6">
                {proyecto.fases_proyecto?.length > 0 ? (
                    <div className="space-y-3">
                        {proyecto.fases_proyecto.map(f => (
                            <div key={f.id} className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${f.estado === 'completada' ? 'bg-emerald-500 text-white' : f.estado === 'en_proceso' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    {f.estado === 'completada' ? '✓' : f.orden}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-white text-sm truncate">{f.nombre}</span>
                                        <Badge variant={f.estado === 'completada' ? 'success' : f.estado === 'en_proceso' ? 'info' : 'secondary'} size="sm">{f.estado?.replace(/_/g, ' ')}</Badge>
                                    </div>
                                    <BarraProgresoProyecto porcentaje={parseFloat(f.porcentaje_avance_interno)} size="sm" showLabel={false} />
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-white">{parseFloat(f.porcentaje_avance_interno).toFixed(0)}%</p>
                                    <p className="text-xs text-slate-500">Peso: {parseFloat(f.peso_porcentual).toFixed(0)}%</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={<Activity size={32} />} title="Sin fases" description="Este proyecto aún no tiene fases definidas." />
                )}
            </Card>
        ),
        personal: (
            <Card className="p-6">
                {proyecto.asignaciones_personal?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400"><tr><th className="px-4 py-3">Personal</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Estado</th></tr></thead>
                            <tbody>
                                {proyecto.asignaciones_personal.map(a => (
                                    <tr key={a.id} className="border-b border-slate-700/50">
                                        <td className="px-4 py-3 font-medium text-white">{a.personal?.nombre} {a.personal?.apellido_paterno}</td>
                                        <td className="px-4 py-3 capitalize">{a.rol_en_proyecto?.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3"><Badge variant={a.estado === 'activa' ? 'success' : 'secondary'} size="sm">{a.estado}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <EmptyState icon={<Users size={32} />} title="Sin personal" description="No hay personal asignado a este proyecto." />
                )}
            </Card>
        ),
        auditoria: (
            <Card className="p-6">
                <h3 className="text-lg font-medium text-white mb-6">Historial de Cambios</h3>
                {auditoria.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No hay registros de auditoría recientes.</p>
                ) : (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                        {auditoria.map(evento => (
                            <div key={evento.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-800 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                    <Shield size={16} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-300 text-sm">{evento.evento}</span>
                                        <span className="text-xs text-slate-500">{new Date(evento.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-400">Por: {evento.actor?.nombre || 'Sistema'}</p>
                                    {evento.datos_nuevos && (
                                        <details className="text-xs mt-2">
                                            <summary className="cursor-pointer text-emerald-500 font-medium hover:text-emerald-400">Ver detalles técnicos</summary>
                                            <pre className="mt-2 p-2 bg-slate-950 rounded border border-slate-800 text-slate-400 overflow-x-auto">
                                                {JSON.stringify(evento.datos_nuevos, null, 2)}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        )
    };

    const accionesDropdown = [
        { label: 'Editar Información', icon: <Edit size={16} />, onClick: () => navigate(`/dashboard/proyectos/${id}/editar`), show: hasPermission('proyectos.editar') },
        { label: 'Cambiar Estado', icon: <Shield size={16} />, onClick: () => { setNuevoEstado(''); setModalEstado(true); }, show: hasPermission('proyectos.cambiar_estado') && transiciones.length > 0 },
        { label: 'Eliminar Proyecto', icon: <MoreVertical size={16} />, onClick: () => setModalEliminar(true), show: hasPermission('proyectos.eliminar'), danger: true },
    ].filter(a => a.show);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                    <Avatar name={proyecto.nombre} size="xl" icon={esSocial ? Users : Building} className="shadow-xl" />
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                            {proyecto.nombre}
                            <Badge variant={getStateColor(proyecto.estado)}>{getStateLabel(proyecto.estado)}</Badge>
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-slate-700 rounded text-slate-300">{proyecto.codigo}</span>
                            <span className="text-slate-600">•</span>
                            <span className={`capitalize text-xs font-medium ${esSocial ? 'text-cyan-400' : 'text-violet-400'}`}>{proyecto.categoria}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="ghost" leftIcon={<Briefcase size={18} />} onClick={() => navigate('/dashboard/proyectos')}>Volver a Lista</Button>
                    {accionesDropdown.length > 0 && (
                        <Dropdown 
                            trigger={<Button variant="secondary" leftIcon={<MoreVertical size={18} />} />}
                            items={accionesDropdown}
                        />
                    )}
                </div>
            </div>

            <Tabs tabs={tabs}>{tabContent}</Tabs>

            {/* Modal Cambiar Estado */}
            <ConfirmDialog isOpen={modalEstado} onClose={() => setModalEstado(false)} onConfirm={handleCambiarEstado}
                title="Cambiar Estado del Proyecto" message="Selecciona el nuevo estado." confirmText="Actualizar Estado" isLoading={cambiandoEstado}>
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Nuevo Estado</label>
                        <select className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)}>
                            <option value="">— Seleccionar —</option>
                            {transiciones.map(e => <option key={e} value={e}>{getStateLabel(e)}</option>)}
                        </select>
                    </div>
                    {['cancelado', 'pausado'].includes(nuevoEstado) && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Razón <span className="text-rose-500">*</span></label>
                            <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                rows="3" placeholder="Especifique la razón del cambio..." value={razonEstado} onChange={(e) => setRazonEstado(e.target.value)} />
                        </div>
                    )}
                </div>
            </ConfirmDialog>

            {/* Modal Eliminar */}
            <ConfirmDialog isOpen={modalEliminar} onClose={() => setModalEliminar(false)} onConfirm={handleEliminar}
                title="Eliminar Proyecto" message={`¿Estás seguro de eliminar "${proyecto.nombre}"? Esta acción es destructiva y requiere una razón justificada.`}
                confirmText="Sí, Eliminar Proyecto" confirmVariant="danger" isLoading={eliminando}>
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Razón de la Eliminación <span className="text-rose-500">*</span></label>
                    <textarea className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        rows="3" placeholder="Ej: Duplicado, error de registro, cancelación..." value={razonEliminar} onChange={(e) => setRazonEliminar(e.target.value)} />
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default DetalleProyecto;
