import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { 
    Briefcase, CheckCircle, TrendingUp, Pause, Ban,
    Search, Filter, Plus, MapPin, Building,
    Edit, Trash, Eye, Activity, Users
} from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import Avatar from '../../../components/ui/Avatar';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton from '../../../components/ui/Skeleton';
import Tooltip from '../../../components/ui/Tooltip';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import BarraProgresoProyecto from '../../../components/proyectos/BarraProgresoProyecto';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import proyectoService from '../../../services/proyectoService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const ListaProyectos = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    // Estados
    const [proyectos, setProyectos] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [zonas, setZonas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoStats, setCargandoStats] = useState(true);
    
    // Paginación y Filtros
    const [filtros, setFiltros] = useState({
        busqueda: '',
        categoria: 'todos',
        estado: 'todos',
        prioridad: 'todos',
        zona_id: '',
    });
    const [vista, setVista] = useState('tabla'); // tabla | grid
    const [paginaInfo, setPaginaInfo] = useState({
        actual: 1,
        total: 1,
        porPagina: 20,
        totalRegistros: 0
    });
    
    // Modales
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [proyectoAEliminar, setProyectoAEliminar] = useState(null);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    // Carga inicial
    useEffect(() => {
        cargarEstadisticas();
        cargarZonas();
    }, []);

    useEffect(() => {
        cargarProyectos();
    }, [filtros, paginaInfo.actual]);

    const cargarEstadisticas = async () => {
        try {
            setCargandoStats(true);
            const stats = await proyectoService.obtenerEstadisticas();
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

    const cargarProyectos = async () => {
        try {
            setCargando(true);
            const data = await proyectoService.listar(filtros, paginaInfo.actual, paginaInfo.porPagina);
            setProyectos(data.data);
            setPaginaInfo(prev => ({
                ...prev,
                actual: data.current_page,
                total: data.last_page,
                totalRegistros: data.total
            }));
        } catch (error) {
            toast.error("Error al cargar los proyectos");
        } finally {
            setCargando(false);
        }
    };

    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({ ...prev, [key]: value }));
        setPaginaInfo(prev => ({ ...prev, actual: 1 }));
    };

    const handleEliminarProyecto = async () => {
        if (!razonEliminar.trim()) {
            toast.error("Debes ingresar una razón para eliminar el proyecto");
            return;
        }

        try {
            setEliminando(true);
            await proyectoService.eliminar(proyectoAEliminar.id, razonEliminar);
            toast.success("Proyecto eliminado exitosamente");
            setProyectoAEliminar(null);
            setRazonEliminar('');
            cargarProyectos();
            cargarEstadisticas();
        } catch (error) {
            toast.error(error.message || "Error al eliminar el proyecto");
        } finally {
            setEliminando(false);
        }
    };

    const getStateColor = (estado) => {
        const colors = {
            'borrador': 'secondary',
            'planificacion': 'info',
            'en_ejecucion': 'success',
            'pausado': 'warning',
            'finalizado': 'primary',
            'cancelado': 'danger'
        };
        return colors[estado] || 'secondary';
    };

    const getStateLabel = (estado) => {
        const labels = {
            'borrador': 'Borrador',
            'planificacion': 'Planificación',
            'en_ejecucion': 'En Ejecución',
            'pausado': 'Pausado',
            'finalizado': 'Finalizado',
            'cancelado': 'Cancelado'
        };
        return labels[estado] || estado;
    };

    const getCategoriaBadge = (categoria) => {
        const bgColors = {
            'social': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
            'privado': 'bg-violet-500/10 text-violet-500 border-violet-500/20',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium border rounded-md ${bgColors[categoria] || bgColors.privado}`}>
                {categoria === 'social' ? 'Social' : 'Privado'}
            </span>
        );
    };

    const getPrioridadBadge = (prioridad) => {
        const config = {
            'baja': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            'media': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            'alta': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            'critica': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium border rounded-md capitalize ${config[prioridad] || config.media}`}>
                {prioridad || 'media'}
            </span>
        );
    };

    // Render de Stats
    const renderStatCards = () => {
        if (cargandoStats) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                </div>
            );
        }

        const stats = [
            { title: 'En Ejecución', value: estadisticas?.por_estado?.en_ejecucion || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { title: 'Sociales', value: estadisticas?.por_categoria?.social || 0, icon: Users, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
            { title: 'Privados', value: estadisticas?.por_categoria?.privado || 0, icon: Building, color: 'text-violet-500', bg: 'bg-violet-500/10' },
            { title: 'Avance Prom.', value: (estadisticas?.avance_promedio || 0) + '%', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ];

        return (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="p-4 flex items-center justify-between hover:border-slate-700/50 transition-colors">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
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
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                    <tr>
                        <th className="px-4 py-3 rounded-tl-lg">Proyecto</th>
                        <th className="px-4 py-3">Categoría</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Avance</th>
                        <th className="px-4 py-3">Presupuesto</th>
                        <th className="px-4 py-3">Prioridad</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {proyectos.map(proyecto => (
                        <tr key={proyecto.id} className="border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <Avatar 
                                        name={proyecto.nombre} 
                                        size="sm" 
                                        icon={proyecto.categoria === 'social' ? Users : Building} 
                                    />
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white truncate max-w-[220px]">
                                            {proyecto.nombre}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                            {proyecto.codigo}
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                {getCategoriaBadge(proyecto.categoria)}
                            </td>
                            <td className="px-4 py-3">
                                <Badge variant={getStateColor(proyecto.estado)} size="sm">
                                    {getStateLabel(proyecto.estado)}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 min-w-[140px]">
                                <BarraProgresoProyecto porcentaje={parseFloat(proyecto.porcentaje_avance)} size="sm" />
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">
                                Bs. {parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3">
                                {getPrioridadBadge(proyecto.prioridad)}
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip text="Ver detalle">
                                        <button 
                                            onClick={() => navigate(`/dashboard/proyectos/${proyecto.id}`)}
                                            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                        >
                                            <Eye size={16} />
                                        </button>
                                    </Tooltip>
                                    
                                    {hasPermission('proyectos.editar') && (
                                        <Tooltip text="Editar">
                                            <button 
                                                onClick={() => navigate(`/dashboard/proyectos/${proyecto.id}/editar`)}
                                                className="p-1.5 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </Tooltip>
                                    )}

                                    {hasPermission('proyectos.eliminar') && (
                                        <Tooltip text="Eliminar">
                                            <button 
                                                onClick={() => setProyectoAEliminar(proyecto)}
                                                className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
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
            {proyectos.map(proyecto => (
                <Card key={proyecto.id} className="p-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group" onClick={() => navigate(`/dashboard/proyectos/${proyecto.id}`)}>
                    <div className="flex justify-between items-start mb-4">
                        <Avatar 
                            name={proyecto.nombre} 
                            size="md" 
                            icon={proyecto.categoria === 'social' ? Users : Building} 
                        />
                        <Badge variant={getStateColor(proyecto.estado)} size="sm">
                            {getStateLabel(proyecto.estado)}
                        </Badge>
                    </div>
                    
                    <h4 className="text-slate-900 dark:text-white font-medium text-lg mb-1 truncate" title={proyecto.nombre}>
                        {proyecto.nombre}
                    </h4>
                    
                    <div className="flex items-center gap-2 mb-3 text-sm text-slate-500 dark:text-slate-400">
                        <span className="text-xs font-mono">{proyecto.codigo}</span>
                    </div>

                    <div className="space-y-2 mb-4">
                        <BarraProgresoProyecto porcentaje={parseFloat(proyecto.porcentaje_avance)} size="sm" />
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            💰 Bs. {parseFloat(proyecto.presupuesto_total || 0).toLocaleString('es-BO')}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                            <MapPin size={12} /> {proyecto.zona?.nombre || 'Sin zona'}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/50 flex justify-between items-center">
                        {getCategoriaBadge(proyecto.categoria)}
                        {getPrioridadBadge(proyecto.prioridad)}
                    </div>
                </Card>
            ))}
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Proyectos"
                subtitle="Gestiona los proyectos de construcción sociales y privados"
                icon={Briefcase}
                actions={
                    hasPermission('proyectos.crear') && (
                        <Button 
                            variant="primary" 
                            leftIcon={<Plus size={18} />}
                            onClick={() => navigate('/dashboard/proyectos/crear')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            Nuevo Proyecto
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
                            placeholder="Buscar por código, nombre..."
                            className="max-w-md"
                        />
                        
                        <select
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.categoria}
                            onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                        >
                            <option value="todos">Todas las categorías</option>
                            <option value="social">Social</option>
                            <option value="privado">Privado</option>
                        </select>

                        <select
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.estado}
                            onChange={(e) => handleFiltroChange('estado', e.target.value)}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="borrador">Borrador</option>
                            <option value="planificacion">Planificación</option>
                            <option value="en_ejecucion">En Ejecución</option>
                            <option value="pausado">Pausado</option>
                            <option value="finalizado">Finalizado</option>
                            <option value="cancelado">Cancelado</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            leftIcon={<Filter size={18} />}
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={mostrarFiltros ? 'bg-slate-200 dark:bg-slate-700' : ''}
                        >
                            Más filtros
                        </Button>

                        <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={() => setVista('tabla')}
                                className={`p-1.5 rounded-md transition-colors ${vista === 'tabla' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                            </button>
                            <button
                                onClick={() => setVista('grid')}
                                className={`p-1.5 rounded-md transition-colors ${vista === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Panel de Filtros Avanzados */}
                {mostrarFiltros && (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-down">
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Prioridad</label>
                            <select
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg p-2.5"
                                value={filtros.prioridad}
                                onChange={(e) => handleFiltroChange('prioridad', e.target.value)}
                            >
                                <option value="todos">Todas las prioridades</option>
                                <option value="baja">Baja</option>
                                <option value="media">Media</option>
                                <option value="alta">Alta</option>
                                <option value="critica">Crítica</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Zona Geográfica</label>
                            <select
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg p-2.5"
                                value={filtros.zona_id}
                                onChange={(e) => handleFiltroChange('zona_id', e.target.value)}
                            >
                                <option value="">Todas las zonas</option>
                                {zonas.map(z => (
                                    <option key={z.id} value={z.id}>{z.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div></div>
                        <div className="flex items-end justify-end">
                            <Button 
                                variant="outline" 
                                onClick={() => setFiltros({
                                    busqueda: '', categoria: 'todos', estado: 'todos', prioridad: 'todos', zona_id: ''
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
                        <p className="text-slate-500 dark:text-slate-400 animate-pulse">Cargando proyectos...</p>
                    </div>
                ) : proyectos.length === 0 ? (
                    <div className="p-12">
                        <EmptyState
                            icon={<Briefcase size={32} />}
                            title="No se encontraron proyectos"
                            description="Ajusta los filtros o crea un nuevo proyecto para comenzar."
                            action={
                                hasPermission('proyectos.crear') ? (
                                    <Button variant="primary" onClick={() => navigate('/dashboard/proyectos/crear')}>
                                        Crear Proyecto
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

                {/* Paginación */}
                {!cargando && paginaInfo.total > 1 && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
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
                isOpen={!!proyectoAEliminar}
                onClose={() => {
                    setProyectoAEliminar(null);
                    setRazonEliminar('');
                }}
                onConfirm={handleEliminarProyecto}
                title="Eliminar Proyecto"
                message={`¿Estás seguro de que deseas eliminar el proyecto "${proyectoAEliminar?.nombre}"? Esta acción no se puede deshacer y requiere una razón.`}
                confirmText="Eliminar Proyecto"
                confirmVariant="danger"
                isLoading={eliminando}
            >
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Razón de la eliminación <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                        rows="3"
                        placeholder="Ej: Proyecto cancelado por el cliente, Duplicado, etc."
                        value={razonEliminar}
                        onChange={(e) => setRazonEliminar(e.target.value)}
                    ></textarea>
                </div>
            </ConfirmDialog>

        </div>
    );
};

export default ListaProyectos;
