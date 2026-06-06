import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { 
    Users, Briefcase, CheckCircle, TrendingUp, Pause, Ban,
    Search, Filter, Plus, MoreVertical, MapPin, Building,
    ChevronDown, Edit, Trash, Eye
} from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import Avatar from '../../../components/ui/Avatar';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import Tooltip from '../../../components/ui/Tooltip';
import Dropdown from '../../../components/ui/Dropdown';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import clienteService from '../../../services/clienteService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const ListaClientes = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    // Estados
    const [clientes, setClientes] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [zonas, setZonas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoStats, setCargandoStats] = useState(true);
    
    // Paginación y Filtros
    const [filtros, setFiltros] = useState({
        busqueda: '',
        tipo: 'todos',
        estado: 'todos',
        documento_tipo: 'todos',
        zona_id: '',
        origen: 'todos'
    });
    const [vista, setVista] = useState('tabla'); // tabla | grid
    const [paginaInfo, setPaginaInfo] = useState({
        actual: 1,
        total: 1,
        porPagina: 20,
        totalRegistros: 0
    });
    
    // Drawer y Modales
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [clienteAEliminar, setClienteAEliminar] = useState(null);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    // Carga inicial
    useEffect(() => {
        cargarEstadisticas();
        cargarZonas();
    }, []);

    useEffect(() => {
        cargarClientes();
    }, [filtros, paginaInfo.actual]);

    const cargarEstadisticas = async () => {
        try {
            setCargandoStats(true);
            const stats = await clienteService.obtenerEstadisticas();
            setEstadisticas(stats);
        } catch (error) {
            console.error("Error al cargar estadísticas:", error);
        } finally {
            setCargandoStats(false);
        }
    };

    const cargarZonas = async () => {
        try {
            const data = await zonaGeograficaService.listar();
            setZonas(data || []);
        } catch (error) {
            console.error("Error al cargar zonas:", error);
        }
    };

    const cargarClientes = async () => {
        try {
            setCargando(true);
            const data = await clienteService.listar(filtros, paginaInfo.actual, paginaInfo.porPagina);
            setClientes(data.data);
            setPaginaInfo(prev => ({
                ...prev,
                actual: data.current_page,
                total: data.last_page,
                totalRegistros: data.total
            }));
        } catch (error) {
            toast.error("Error al cargar los clientes");
        } finally {
            setCargando(false);
        }
    };

    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({ ...prev, [key]: value }));
        setPaginaInfo(prev => ({ ...prev, actual: 1 }));
    };

    const handleEliminarCliente = async () => {
        if (!razonEliminar.trim()) {
            toast.error("Debes ingresar una razón para eliminar al cliente");
            return;
        }

        try {
            setEliminando(true);
            await clienteService.eliminar(clienteAEliminar.id, razonEliminar);
            toast.success("Cliente eliminado exitosamente");
            setClienteAEliminar(null);
            setRazonEliminar('');
            cargarClientes();
            cargarEstadisticas();
        } catch (error) {
            toast.error(error.message || "Error al eliminar el cliente");
        } finally {
            setEliminando(false);
        }
    };

    const getStateColor = (estado) => {
        const colors = {
            'activo': 'success',
            'inactivo': 'secondary',
            'potencial': 'warning',
            'bloqueado': 'danger'
        };
        return colors[estado] || 'primary';
    };

    const getOrigenBadge = (origen) => {
        const bgColors = {
            'directo': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'referido': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'sitio_web': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
            'licitacion': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            'otro': 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium border rounded-md ${bgColors[origen] || bgColors.otro}`}>
                {origen.replace('_', ' ').charAt(0).toUpperCase() + origen.replace('_', ' ').slice(1)}
            </span>
        );
    };

    // Render de Cards
    const renderStatCards = () => {
        if (cargandoStats) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            );
        }

        const stats = [
            { title: 'Activos', value: estadisticas?.total_activos || 0, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { title: 'Potenciales', value: estadisticas?.total_potenciales || 0, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { title: 'Inactivos', value: estadisticas?.total_inactivos || 0, icon: Pause, color: 'text-slate-400', bg: 'bg-slate-400/10' },
            { title: 'Bloqueados', value: estadisticas?.total_bloqueados || 0, icon: Ban, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-4 flex items-center justify-between hover:border-slate-700/50 transition-colors">
                        <div>
                            <p className="text-sm font-medium text-slate-400 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                    </Card>
                ))}
            </div>
        );
    };

    // Render Tabla
    const renderTabla = () => (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Cliente</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Zona</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Origen</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {clientes.map(cliente => (
                        <tr key={cliente.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors group">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar 
                                        name={cliente.nombre_visible} 
                                        size="sm" 
                                        icon={cliente.tipo === 'empresa' ? Building : Users} 
                                    />
                                    <div>
                                        <p className="font-medium text-white truncate max-w-[200px]">
                                            {cliente.nombre_visible}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate max-w-[200px]">
                                            {cliente.email || 'Sin correo'}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {cliente.tipo === 'empresa' ? (
                                    <span className="flex items-center gap-1 text-xs text-blue-400">
                                        <Building size={14} /> Empresa
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                                        <Users size={14} /> Persona
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="text-sm">
                                    <span className="text-slate-400 uppercase text-xs mr-1">{cliente.documento_tipo}</span>
                                    {cliente.documento_completo}
                                </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 text-xs">
                                {cliente.zona?.nombre || 'No asignada'}
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant={getStateColor(cliente.estado)} size="sm">
                                    {cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)}
                                </Badge>
                            </td>
                            <td className="px-4 py-3">
                                {getOrigenBadge(cliente.origen)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip text="Ver detalle">
                                        <button 
                                            onClick={() => navigate(`/dashboard/clientes/${cliente.id}`)}
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </Tooltip>
                                    
                                    {hasPermission('clientes.editar') && (
                                        <Tooltip text="Editar">
                                            <button 
                                                onClick={() => navigate(`/dashboard/clientes/${cliente.id}/editar`)}
                                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-md transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </Tooltip>
                                    )}

                                    {hasPermission('clientes.eliminar') && (
                                        <Tooltip text="Eliminar">
                                            <button 
                                                onClick={() => setClienteAEliminar(cliente)}
                                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition-colors"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Render Grid
    const renderGrid = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {clientes.map(cliente => (
                <Card key={cliente.id} className="p-4 hover:border-slate-600 transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/clientes/${cliente.id}`)}>
                    <div className="flex justify-between items-start mb-4">
                        <Avatar 
                            name={cliente.nombre_visible} 
                            size="md" 
                            icon={cliente.tipo === 'empresa' ? Building : Users} 
                        />
                        <Badge variant={getStateColor(cliente.estado)} size="sm">
                            {cliente.estado.charAt(0).toUpperCase() + cliente.estado.slice(1)}
                        </Badge>
                    </div>
                    
                    <h4 className="text-white font-medium text-lg mb-1 truncate" title={cliente.nombre_visible}>
                        {cliente.nombre_visible}
                    </h4>
                    
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
                        <span className="uppercase text-xs font-semibold">{cliente.documento_tipo}</span>
                        <span>{cliente.documento_completo}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                        {cliente.email && (
                            <div className="text-xs text-slate-400 truncate">
                                ✉️ {cliente.email}
                            </div>
                        )}
                        {cliente.telefono_principal && (
                            <div className="text-xs text-slate-400 truncate">
                                📞 {cliente.telefono_principal}
                            </div>
                        )}
                        <div className="text-xs text-slate-400 truncate flex items-center gap-1">
                            <MapPin size={12} /> {cliente.zona?.nombre || 'Sin zona'}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center">
                        {getOrigenBadge(cliente.origen)}
                        
                        <div className="flex gap-1">
                            {cliente.tipo === 'empresa' ? (
                                <Tooltip text="Empresa">
                                    <Building size={16} className="text-blue-400" />
                                </Tooltip>
                            ) : (
                                <Tooltip text="Persona Natural">
                                    <Users size={16} className="text-emerald-400" />
                                </Tooltip>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Clientes"
                subtitle="Gestiona los clientes privados de la empresa"
                icon={Briefcase}
                action={
                    hasPermission('clientes.crear') && (
                        <Button 
                            variant="primary" 
                            icon={Plus} 
                            onClick={() => navigate('/dashboard/clientes/crear')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            Nuevo Cliente
                        </Button>
                    )
                }
            />

            {renderStatCards()}

            {/* Barra de Herramientas */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 w-full flex items-center gap-3">
                        <SearchInput
                            value={filtros.busqueda}
                            onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                            placeholder="Buscar por nombre, documento, email..."
                            className="max-w-md"
                        />
                        
                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.tipo}
                            onChange={(e) => handleFiltroChange('tipo', e.target.value)}
                        >
                            <option value="todos">Todos los tipos</option>
                            <option value="persona_natural">Persona Natural</option>
                            <option value="empresa">Empresa</option>
                        </select>

                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.estado}
                            onChange={(e) => handleFiltroChange('estado', e.target.value)}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="potencial">Potenciales</option>
                            <option value="inactivo">Inactivos</option>
                            <option value="bloqueado">Bloqueados</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            icon={Filter}
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={mostrarFiltros ? 'bg-slate-700' : ''}
                        >
                            Más filtros
                        </Button>

                        <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                            <button
                                onClick={() => setVista('tabla')}
                                className={`p-1.5 rounded-md transition-colors ${vista === 'tabla' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </button>
                            <button
                                onClick={() => setVista('grid')}
                                className={`p-1.5 rounded-md transition-colors ${vista === 'grid' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Drawer de Filtros Avanzados (simplificado como un panel expandible) */}
                {mostrarFiltros && (
                    <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-down">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Zona Geográfica</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5"
                                value={filtros.zona_id}
                                onChange={(e) => handleFiltroChange('zona_id', e.target.value)}
                            >
                                <option value="">Todas las zonas</option>
                                {zonas.map(z => (
                                    <option key={z.id} value={z.id}>{z.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Origen</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5"
                                value={filtros.origen}
                                onChange={(e) => handleFiltroChange('origen', e.target.value)}
                            >
                                <option value="todos">Cualquier origen</option>
                                <option value="directo">Directo</option>
                                <option value="referido">Referido</option>
                                <option value="sitio_web">Sitio Web</option>
                                <option value="licitacion">Licitación</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Tipo Documento</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 text-white text-sm rounded-lg p-2.5"
                                value={filtros.documento_tipo}
                                onChange={(e) => handleFiltroChange('documento_tipo', e.target.value)}
                            >
                                <option value="todos">Todos</option>
                                <option value="ci">C.I.</option>
                                <option value="nit">NIT</option>
                                <option value="pasaporte">Pasaporte</option>
                            </select>
                        </div>
                        <div className="flex items-end justify-end">
                            <Button 
                                variant="outline" 
                                onClick={() => setFiltros({
                                    busqueda: '', tipo: 'todos', estado: 'todos', documento_tipo: 'todos', zona_id: '', origen: 'todos'
                                })}
                            >
                                Limpiar filtros
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Contenido */}
            <Card className="p-0 overflow-hidden">
                {cargando ? (
                    <div className="p-8 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 animate-pulse">Cargando clientes...</p>
                    </div>
                ) : clientes.length === 0 ? (
                    <div className="p-12">
                        <EmptyState
                            icon={Briefcase}
                            title="No se encontraron clientes"
                            description="Ajusta los filtros o crea un nuevo cliente para comenzar."
                            action={
                                hasPermission('clientes.crear') ? (
                                    <Button variant="primary" onClick={() => navigate('/dashboard/clientes/crear')}>
                                        Crear Cliente
                                    </Button>
                                ) : null
                            }
                        />
                    </div>
                ) : (
                    <div className={vista === 'grid' ? 'p-4' : ''}>
                        {vista === 'tabla' ? renderTabla() : renderGrid()}
                    </div>
                )}

                {/* Paginación simple */}
                {!cargando && paginaInfo.total > 1 && (
                    <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            Mostrando página {paginaInfo.actual} de {paginaInfo.total} ({paginaInfo.totalRegistros} en total)
                        </span>
                        <div className="flex gap-2">
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                disabled={paginaInfo.actual === 1}
                                onClick={() => setPaginaInfo(prev => ({...prev, actual: prev.actual - 1}))}
                            >
                                Anterior
                            </Button>
                            <Button 
                                variant="secondary" 
                                size="sm"
                                disabled={paginaInfo.actual === paginaInfo.total}
                                onClick={() => setPaginaInfo(prev => ({...prev, actual: prev.actual + 1}))}
                            >
                                Siguiente
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Modal Confirmar Eliminación */}
            <ConfirmDialog
                isOpen={!!clienteAEliminar}
                onClose={() => {
                    setClienteAEliminar(null);
                    setRazonEliminar('');
                }}
                onConfirm={handleEliminarCliente}
                title="Eliminar Cliente"
                message={`¿Estás seguro de que deseas eliminar al cliente "${clienteAEliminar?.nombre_visible}"? Esta acción no se puede deshacer y requiere una razón.`}
                confirmText="Eliminar Cliente"
                confirmVariant="danger"
                isLoading={eliminando}
            >
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        Razón de la eliminación <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                        rows="3"
                        placeholder="Ej: Cliente solicitó remoción de datos, Duplicado, etc."
                        value={razonEliminar}
                        onChange={(e) => setRazonEliminar(e.target.value)}
                    ></textarea>
                </div>
            </ConfirmDialog>

        </div>
    );
};

export default ListaClientes;
