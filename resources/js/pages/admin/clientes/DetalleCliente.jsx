import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { 
    Briefcase, Users, Building, MapPin, Mail, Phone, 
    Calendar, History, Shield, MoreVertical, Edit, Link2
} from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Avatar from '../../../components/ui/Avatar';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Tooltip from '../../../components/ui/Tooltip';
import Dropdown from '../../../components/ui/Dropdown';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import clienteService from '../../../services/clienteService';

const DetalleCliente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [cliente, setCliente] = useState(null);
    const [referidos, setReferidos] = useState([]);
    const [auditoria, setAuditoria] = useState([]);
    const [estadisticas, setEstadisticas] = useState({});
    const [cargando, setCargando] = useState(true);

    // Estado para modales
    const [modalEstado, setModalEstado] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [razonEstado, setRazonEstado] = useState('');
    const [cambiandoEstado, setCambiandoEstado] = useState(false);

    const [modalEliminar, setModalEliminar] = useState(false);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    // Notas
    const [notas, setNotas] = useState('');
    const [guardandoNotas, setGuardandoNotas] = useState(false);
    const [timeoutId, setTimeoutId] = useState(null);

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const data = await clienteService.obtener(id);
            setCliente(data.cliente);
            setReferidos(data.referidos);
            setAuditoria(data.auditoria);
            setEstadisticas(data.estadisticas);
            setNotas(data.cliente.notas || '');
        } catch (error) {
            toast.error("Error al cargar detalles del cliente");
            navigate('/dashboard/clientes');
        } finally {
            setCargando(false);
        }
    };

    const handleNotasChange = (e) => {
        const val = e.target.value;
        setNotas(val);
        
        if (timeoutId) clearTimeout(timeoutId);
        
        const newTimeoutId = setTimeout(async () => {
            setGuardandoNotas(true);
            try {
                await clienteService.actualizar(id, { ...cliente, notas: val });
                toast.success("Notas guardadas");
                setCliente(prev => ({...prev, notas: val}));
            } catch (error) {
                toast.error("Error al guardar las notas");
            } finally {
                setGuardandoNotas(false);
            }
        }, 2000); // Auto-save after 2s
        
        setTimeoutId(newTimeoutId);
    };

    const handleCambiarEstado = async () => {
        if (nuevoEstado === 'bloqueado' && !razonEstado.trim()) {
            toast.error("Razón obligatoria al bloquear un cliente");
            return;
        }

        try {
            setCambiandoEstado(true);
            await clienteService.cambiarEstado(id, nuevoEstado, razonEstado);
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
            await clienteService.eliminar(id, razonEliminar);
            toast.success("Cliente eliminado exitosamente");
            navigate('/dashboard/clientes');
        } catch (error) {
            toast.error(error.message || "Error al eliminar el cliente");
        } finally {
            setEliminando(false);
            setModalEliminar(false);
        }
    };

    const getStateColor = (estado) => {
        const colors = { 'activo': 'success', 'inactivo': 'secondary', 'potencial': 'warning', 'bloqueado': 'danger' };
        return colors[estado] || 'primary';
    };

    if (cargando) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (!cliente) return null;

    const tabs = [
        { id: 'informacion', label: 'Información General' },
        { id: 'proyectos', label: `Proyectos (${estadisticas.cantidad_proyectos})` },
        { id: 'referencias', label: `Referencias (${referidos.length})` },
        { id: 'notas', label: 'Notas' },
        { id: 'auditoria', label: 'Auditoría' },
    ];

    const tabContent = {
        informacion: (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-5">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-white">Identificación</h3>
                        {hasPermission('clientes.editar') && (
                            <Button variant="ghost" size="sm" icon={Edit} onClick={() => navigate(`/dashboard/clientes/${id}/editar`)}>Editar</Button>
                        )}
                    </div>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Tipo:</span>
                            <span className="col-span-2 text-slate-300 capitalize flex items-center gap-2">
                                {cliente.tipo === 'empresa' ? <Building size={16} className="text-blue-400" /> : <Users size={16} className="text-emerald-400" />}
                                {cliente.tipo.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Documento:</span>
                            <span className="col-span-2 text-white font-medium uppercase">
                                {cliente.documento_tipo} {cliente.documento_completo}
                            </span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Nombre Completo:</span>
                            <span className="col-span-2 text-white">{cliente.nombre_completo}</span>
                        </div>
                        {cliente.tipo === 'empresa' && (
                            <div className="grid grid-cols-3">
                                <span className="text-slate-500">N. Comercial:</span>
                                <span className="col-span-2 text-white">{cliente.nombre_comercial || '-'}</span>
                            </div>
                        )}
                    </div>
                </Card>

                <Card className="p-5">
                    <h3 className="text-lg font-medium text-white mb-4">Contacto y Ubicación</h3>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><Mail size={14}/> Email:</span>
                            <span className="col-span-2 text-blue-400">{cliente.email || 'No registrado'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><Phone size={14}/> Teléfono:</span>
                            <span className="col-span-2 text-slate-300">{cliente.telefono_principal || '-'} {cliente.telefono_alternativo ? `/ ${cliente.telefono_alternativo}` : ''}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500 flex items-center gap-1"><MapPin size={14}/> Zona:</span>
                            <span className="col-span-2 text-emerald-400">{cliente.zona?.nombre || 'No asignada'}</span>
                        </div>
                        <div className="grid grid-cols-3">
                            <span className="text-slate-500">Dirección:</span>
                            <span className="col-span-2 text-slate-300">{cliente.direccion || 'No registrada'}</span>
                        </div>
                    </div>
                </Card>

                {cliente.tipo === 'empresa' && (
                    <Card className="p-5 md:col-span-2">
                        <h3 className="text-lg font-medium text-white mb-4">Información Corporativa</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="grid grid-cols-3">
                                <span className="text-slate-500">Rep. Legal:</span>
                                <span className="col-span-2 text-white">{cliente.representante_legal}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-slate-500">Cargo:</span>
                                <span className="col-span-2 text-slate-300">{cliente.cargo_representante || '-'}</span>
                            </div>
                            <div className="grid grid-cols-3">
                                <span className="text-slate-500">Sector:</span>
                                <span className="col-span-2 text-slate-300">{cliente.sector || '-'}</span>
                            </div>
                        </div>
                    </Card>
                )}

                <Card className="p-5 md:col-span-2">
                    <h3 className="text-lg font-medium text-white mb-4">Registro en Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">Origen</span>
                            <Badge variant="outline" className="capitalize border-slate-600 text-slate-300">{cliente.origen.replace('_', ' ')}</Badge>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Registrado por</span>
                            <span className="text-slate-300 flex items-center gap-2">
                                <Avatar name={cliente.creador?.email || 'Sistema'} size="sm" />
                                {cliente.creador?.email || 'Sistema'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Fecha de Ingreso</span>
                            <span className="text-slate-300 flex items-center gap-1">
                                <Calendar size={14} /> {new Date(cliente.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
        ),
        proyectos: (
            <Card className="p-8">
                <EmptyState
                    icon={Building}
                    title="Módulo en desarrollo"
                    description="Cuando el módulo de Proyectos Privados esté activo, aquí verás el historial completo de obras y contratos vinculados a este cliente."
                />
            </Card>
        ),
        referencias: (
            <div className="space-y-6">
                {cliente.referidoPor && (
                    <div>
                        <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Referido Por</h3>
                        <Card className="p-4 flex items-center justify-between border-emerald-500/30 bg-emerald-500/5">
                            <div className="flex items-center gap-4">
                                <Avatar name={cliente.referidoPor.nombre_visible} icon={Users} />
                                <div>
                                    <p className="text-white font-medium">{cliente.referidoPor.nombre_visible}</p>
                                    <p className="text-slate-400 text-sm capitalize">{cliente.referidoPor.tipo.replace('_', ' ')}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/clientes/${cliente.referidoPor.id}`)}>Ver Perfil</Button>
                        </Card>
                    </div>
                )}

                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Clientes a los que refirió ({referidos.length})</h3>
                    {referidos.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {referidos.map(ref => (
                                <Card key={ref.id} className="p-4 flex items-center justify-between hover:border-slate-600">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={ref.nombre_visible} size="sm" icon={ref.tipo === 'empresa' ? Building : Users} />
                                        <div>
                                            <p className="text-slate-200 text-sm font-medium">{ref.nombre_visible}</p>
                                            <p className="text-slate-500 text-xs">{new Date(ref.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => navigate(`/dashboard/clientes/${ref.id}`)} className="text-slate-400 hover:text-emerald-400">
                                        <Link2 size={16} />
                                    </button>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card className="p-6 text-center text-slate-500 text-sm">
                            Este cliente no ha referido a nadie aún.
                        </Card>
                    )}
                </div>
            </div>
        ),
        notas: (
            <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">Notas Internas</h3>
                    {guardandoNotas && <span className="text-xs text-emerald-400 animate-pulse flex items-center gap-1"><History size={12}/> Guardando...</span>}
                </div>
                <textarea
                    value={notas}
                    onChange={handleNotasChange}
                    placeholder="Escribe observaciones, acuerdos o recordatorios sobre el cliente. Se guarda automáticamente."
                    className="w-full h-64 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none transition-colors"
                    disabled={!hasPermission('clientes.editar')}
                />
            </Card>
        ),
        auditoria: (
            <Card className="p-6">
                <h3 className="text-lg font-medium text-white mb-6">Historial de Cambios</h3>
                {auditoria.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No hay registros de auditoría recientes.</p>
                ) : (
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent">
                        {auditoria.map((evento, idx) => (
                            <div key={evento.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-800 text-slate-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                    <Shield size={16} />
                                </div>
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-medium text-slate-300 text-sm">{evento.evento}</span>
                                        <span className="text-xs text-slate-500">{new Date(evento.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-2">Por: {evento.actor?.email || 'Sistema'}</p>
                                    
                                    {/* Muestra un extracto si hay datos nuevos */}
                                    {evento.datos_nuevos && (
                                        <details className="text-xs group/details mt-2">
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
        {
            label: 'Editar Información',
            icon: Edit,
            onClick: () => navigate(`/dashboard/clientes/${id}/editar`),
            show: hasPermission('clientes.editar')
        },
        {
            label: 'Cambiar Estado',
            icon: Shield,
            onClick: () => { setNuevoEstado(cliente.estado); setModalEstado(true); },
            show: hasPermission('clientes.editar')
        },
        {
            label: 'Eliminar Cliente',
            icon: MoreVertical,
            onClick: () => setModalEliminar(true),
            show: hasPermission('clientes.eliminar'),
            danger: true
        }
    ].filter(a => a.show);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <div className="flex items-center gap-5">
                    <Avatar 
                        name={cliente.nombre_visible} 
                        size="xl" 
                        icon={cliente.tipo === 'empresa' ? Building : Users}
                        className="shadow-xl"
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-3">
                            {cliente.nombre_visible}
                            <Badge variant={getStateColor(cliente.estado)}>
                                {cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)}
                            </Badge>
                        </h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <span className="uppercase text-xs font-semibold px-2 py-0.5 bg-slate-700 rounded text-slate-300">
                                {cliente.documento_tipo}
                            </span>
                            {cliente.documento_completo}
                            <span className="text-slate-600">•</span>
                            <span className="capitalize">{cliente.tipo.replace('_', ' ')}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button variant="ghost" icon={Briefcase} onClick={() => navigate('/dashboard/clientes')}>
                        Volver a Lista
                    </Button>
                    {accionesDropdown.length > 0 && (
                        <Dropdown trigger={<Button variant="secondary" icon={MoreVertical} />}>
                            {accionesDropdown.map((acc, i) => (
                                <button
                                    key={i}
                                    onClick={acc.onClick}
                                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors
                                        ${acc.danger ? 'text-rose-400 hover:bg-rose-500/10' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                                >
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

            {/* Modal Cambiar Estado */}
            <ConfirmDialog
                isOpen={modalEstado}
                onClose={() => setModalEstado(false)}
                onConfirm={handleCambiarEstado}
                title="Cambiar Estado del Cliente"
                message="Selecciona el nuevo estado."
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
                            <option value="activo">Activo (Vigente)</option>
                            <option value="potencial">Potencial (Prospecto)</option>
                            <option value="inactivo">Inactivo (Histórico)</option>
                            <option value="bloqueado">Bloqueado (Problemas/Mora)</option>
                        </select>
                    </div>

                    {nuevoEstado === 'bloqueado' && (
                        <div className="animate-fade-in">
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Razón del Bloqueo <span className="text-rose-500">*</span>
                            </label>
                            <textarea
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                rows="3"
                                placeholder="Especifique por qué se está bloqueando al cliente..."
                                value={razonEstado}
                                onChange={(e) => setRazonEstado(e.target.value)}
                            />
                        </div>
                    )}
                </div>
            </ConfirmDialog>

            {/* Modal Eliminar */}
            <ConfirmDialog
                isOpen={modalEliminar}
                onClose={() => setModalEliminar(false)}
                onConfirm={handleEliminar}
                title="Eliminar Cliente"
                message={`¿Estás seguro de eliminar a ${cliente.nombre_visible}? Esta acción es destructiva y requiere una razón justificada.`}
                confirmText="Sí, Eliminar Cliente"
                confirmVariant="danger"
                isLoading={eliminando}
            >
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                        Razón de la Eliminación <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        rows="3"
                        placeholder="Ej: Duplicado, error de registro, solicitud del cliente..."
                        value={razonEliminar}
                        onChange={(e) => setRazonEliminar(e.target.value)}
                    />
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default DetalleCliente;
