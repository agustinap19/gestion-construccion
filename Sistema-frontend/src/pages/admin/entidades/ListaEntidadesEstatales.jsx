import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { 
    Building, CheckCircle, Pause, AlertTriangle,
    Search, Filter, Plus, MoreVertical, MapPin, Eye, Edit, Trash
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
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import entidadEstatalService from '../../../services/entidadEstatalService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const ListaEntidadesEstatales = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [entidades, setEntidades] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [zonas, setZonas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cargandoStats, setCargandoStats] = useState(true);
    
    const [filtros, setFiltros] = useState({
        busqueda: '',
        nivel: 'todos',
        estado: 'todos',
        zona_id: ''
    });
    const [paginaInfo, setPaginaInfo] = useState({ actual: 1, total: 1, porPagina: 20, totalRegistros: 0 });
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    
    // Eliminación
    const [entidadAEliminar, setEntidadAEliminar] = useState(null);
    const [razonEliminar, setRazonEliminar] = useState('');
    const [eliminando, setEliminando] = useState(false);

    useEffect(() => {
        cargarEstadisticas();
        cargarZonas();
    }, []);

    useEffect(() => {
        cargarEntidades();
    }, [filtros, paginaInfo.actual]);

    const cargarEstadisticas = async () => {
        try {
            setCargandoStats(true);
            const stats = await entidadEstatalService.obtenerEstadisticas();
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

    const cargarEntidades = async () => {
        try {
            setCargando(true);
            const data = await entidadEstatalService.listar(filtros, paginaInfo.actual, paginaInfo.porPagina);
            setEntidades(data.data);
            setPaginaInfo(prev => ({
                ...prev,
                actual: data.current_page,
                total: data.last_page,
                totalRegistros: data.total
            }));
        } catch (error) {
            toast.error("Error al cargar las entidades estatales");
        } finally {
            setCargando(false);
        }
    };

    const handleFiltroChange = (key, value) => {
        setFiltros(prev => ({ ...prev, [key]: value }));
        setPaginaInfo(prev => ({ ...prev, actual: 1 }));
    };

    const handleEliminar = async () => {
        if (!razonEliminar.trim()) {
            toast.error("Debes ingresar una razón");
            return;
        }

        try {
            setEliminando(true);
            await entidadEstatalService.eliminar(entidadAEliminar.id, razonEliminar);
            toast.success("Entidad eliminada exitosamente");
            setEntidadAEliminar(null);
            setRazonEliminar('');
            cargarEntidades();
            cargarEstadisticas();
        } catch (error) {
            toast.error(error.message || "Error al eliminar");
        } finally {
            setEliminando(false);
        }
    };

    const getStateBadge = (estado) => {
        const config = {
            'activa': { color: 'success', label: 'Activa' },
            'inactiva': { color: 'secondary', label: 'Inactiva' },
            'en_disputa': { color: 'warning', label: 'En Disputa' },
        };
        const c = config[estado] || { color: 'primary', label: estado };
        return <Badge variant={c.color} size="sm">{c.label}</Badge>;
    };

    const getNivelBadge = (nivel) => {
        return (
            <span className="px-2 py-1 text-xs font-medium border border-blue-500/20 bg-blue-500/10 text-blue-400 rounded-md capitalize">
                {nivel}
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <PageHeader
                title="Entidades Estatales"
                subtitle="Gestión de instituciones gubernamentales para proyectos sociales"
                icon={Building}
                action={
                    hasPermission('entidades.crear') && (
                        <Button 
                            variant="primary" 
                            icon={Plus} 
                            onClick={() => navigate('/dashboard/entidades-estatales/crear')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                        >
                            Nueva Entidad
                        </Button>
                    )
                }
            />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {cargandoStats ? (
                    [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
                ) : (
                    <>
                        <Card className="p-4 flex items-center justify-between hover:border-emerald-500/30 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Entidades Activas</p>
                                <h3 className="text-2xl font-bold text-white">{estadisticas?.total_activas || 0}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-500/10"><CheckCircle className="w-6 h-6 text-emerald-500" /></div>
                        </Card>
                        <Card className="p-4 flex items-center justify-between hover:border-amber-500/30 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">En Disputa Legal</p>
                                <h3 className="text-2xl font-bold text-white">{estadisticas?.total_disputa || 0}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-amber-500/10"><AlertTriangle className="w-6 h-6 text-amber-500" /></div>
                        </Card>
                        <Card className="p-4 flex items-center justify-between hover:border-slate-500/30 transition-colors">
                            <div>
                                <p className="text-sm font-medium text-slate-400 mb-1">Inactivas</p>
                                <h3 className="text-2xl font-bold text-white">{estadisticas?.total_inactivas || 0}</h3>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-500/10"><Pause className="w-6 h-6 text-slate-400" /></div>
                        </Card>
                    </>
                )}
            </div>

            {/* Barra de Herramientas */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex-1 w-full flex items-center gap-3">
                        <SearchInput
                            value={filtros.busqueda}
                            onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                            placeholder="Buscar por nombre, sigla, NIT..."
                            className="max-w-md"
                        />
                        
                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.nivel}
                            onChange={(e) => handleFiltroChange('nivel', e.target.value)}
                        >
                            <option value="todos">Todos los niveles</option>
                            <option value="nacional">Nacional</option>
                            <option value="departamental">Departamental</option>
                            <option value="municipal">Municipal</option>
                            <option value="descentralizado">Descentralizado</option>
                            <option value="autonomo">Autónomo</option>
                        </select>

                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            value={filtros.estado}
                            onChange={(e) => handleFiltroChange('estado', e.target.value)}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="activa">Activas</option>
                            <option value="en_disputa">En Disputa</option>
                            <option value="inactiva">Inactivas</option>
                        </select>

                        <select
                            className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 max-w-[200px] truncate"
                            value={filtros.zona_id}
                            onChange={(e) => handleFiltroChange('zona_id', e.target.value)}
                        >
                            <option value="">Todas las zonas</option>
                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            {/* Contenido Tabla */}
            <Card className="p-0 overflow-hidden">
                {cargando ? (
                    <div className="p-8 flex flex-col items-center justify-center space-y-4">
                        <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        <p className="text-slate-400 animate-pulse">Cargando entidades...</p>
                    </div>
                ) : entidades.length === 0 ? (
                    <div className="p-12">
                        <EmptyState
                            icon={Building}
                            title="No se encontraron entidades"
                            description="Ajusta los filtros o crea una nueva entidad estatal."
                            action={
                                hasPermission('entidades.crear') ? (
                                    <Button variant="primary" onClick={() => navigate('/dashboard/entidades-estatales/crear')}>
                                        Nueva Entidad
                                    </Button>
                                ) : null
                            }
                        />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="text-xs uppercase bg-slate-800/50 text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Institución</th>
                                    <th className="px-4 py-3">NIT</th>
                                    <th className="px-4 py-3">Nivel</th>
                                    <th className="px-4 py-3">Zona</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entidades.map(entidad => (
                                    <tr key={entidad.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                                                    <Building size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white truncate max-w-[250px]" title={entidad.nombre}>
                                                        {entidad.nombre}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                        {entidad.sigla || 'Sin Sigla'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-slate-300">{entidad.nit}</td>
                                        <td className="px-4 py-3">{getNivelBadge(entidad.nivel)}</td>
                                        <td className="px-4 py-3 text-slate-400 text-xs flex items-center gap-1 mt-2">
                                            <MapPin size={12}/> {entidad.zona?.nombre || '-'}
                                        </td>
                                        <td className="px-4 py-3">{getStateBadge(entidad.estado)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip text="Ver detalle">
                                                    <button onClick={() => navigate(`/dashboard/entidades-estatales/${entidad.id}`)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
                                                        <Eye size={16} />
                                                    </button>
                                                </Tooltip>
                                                {hasPermission('entidades.editar') && (
                                                    <Tooltip text="Editar">
                                                        <button onClick={() => navigate(`/dashboard/entidades-estatales/${entidad.id}/editar`)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-md transition-colors">
                                                            <Edit size={16} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                                {hasPermission('entidades.eliminar') && (
                                                    <Tooltip text="Eliminar">
                                                        <button onClick={() => setEntidadAEliminar(entidad)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition-colors">
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
                )}

                {/* Paginación simple */}
                {!cargando && paginaInfo.total > 1 && (
                    <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
                        <span className="text-sm text-slate-400">
                            Mostrando página {paginaInfo.actual} de {paginaInfo.total}
                        </span>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" disabled={paginaInfo.actual === 1} onClick={() => setPaginaInfo(p => ({...p, actual: p.actual - 1}))}>Anterior</Button>
                            <Button variant="secondary" size="sm" disabled={paginaInfo.actual === paginaInfo.total} onClick={() => setPaginaInfo(p => ({...p, actual: p.actual + 1}))}>Siguiente</Button>
                        </div>
                    </div>
                )}
            </Card>

            <ConfirmDialog
                isOpen={!!entidadAEliminar}
                onClose={() => { setEntidadAEliminar(null); setRazonEliminar(''); }}
                onConfirm={handleEliminar}
                title="Eliminar Entidad Estatal"
                message={`¿Eliminar a "${entidadAEliminar?.nombre}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar Entidad"
                confirmVariant="danger"
                isLoading={eliminando}
            >
                <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Razón <span className="text-rose-500">*</span></label>
                    <textarea
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        rows="2"
                        value={razonEliminar}
                        onChange={(e) => setRazonEliminar(e.target.value)}
                    ></textarea>
                </div>
            </ConfirmDialog>
        </div>
    );
};

export default ListaEntidadesEstatales;
