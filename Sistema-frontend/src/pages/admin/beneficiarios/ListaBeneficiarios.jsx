import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import SelectorProyectoSocial from '../../../components/beneficiarios/SelectorProyectoSocial';
import EstadoBeneficiarioBadge from '../../../components/beneficiarios/EstadoBeneficiarioBadge';
import Card from '../../../components/ui/Card';
import { Users, Check, Home, X, UserPlus, LogOut, MoreVertical, Search, Filter, Plus, Edit, Eye, MapPin } from '../../../components/icons/Icons';
import Button from '../../../components/ui/Button';
import SearchInput from '../../../components/ui/SearchInput';
import Dropdown from '../../../components/ui/Dropdown';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import beneficiarioService from '../../../services/beneficiarioService';

const ListaBeneficiarios = () => {
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    
    const [proyectoId, setProyectoId] = useState('');
    const [beneficiarios, setBeneficiarios] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [estadoSeleccionado, setEstadoSeleccionado] = useState('todos');
    const [vistaMapa, setVistaMapa] = useState(false);

    // Estados para eliminación
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [beneficiarioToDelete, setBeneficiarioToDelete] = useState(null);
    const [razonEliminacion, setRazonEliminacion] = useState('');

    useEffect(() => {
        cargarDatos();
    }, [proyectoId, estadoSeleccionado]);

    // Búsqueda con debounce local para evitar useEffect en cada tipeo
    useEffect(() => {
        const timer = setTimeout(() => {
            cargarDatos();
        }, 500);
        return () => clearTimeout(timer);
    }, [busqueda]);

    const cargarDatos = async () => {
        setLoading(true);
        try {
            const filtros = {
                busqueda,
                proyecto_id: proyectoId,
                estado_seleccion: estadoSeleccionado
            };
            const response = await beneficiarioService.getAll(filtros);
            setBeneficiarios(response.data?.data || []);

            if (proyectoId) {
                const statsResponse = await beneficiarioService.obtenerEstadisticasProyecto(proyectoId);
                setStats(statsResponse);
            } else {
                setStats(null);
            }
        } catch (error) {
            console.error("Error al cargar beneficiarios:", error);
            toast.error("No se pudieron cargar los beneficiarios");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!razonEliminacion.trim()) {
            toast.error("La razón es obligatoria");
            return;
        }

        try {
            await beneficiarioService.delete(beneficiarioToDelete.id, razonEliminacion);
            toast.success("Beneficiario eliminado correctamente");
            setIsDeleteModalOpen(false);
            setBeneficiarioToDelete(null);
            setRazonEliminacion('');
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar el beneficiario");
        }
    };

    const confirmDelete = (beneficiario) => {
        setBeneficiarioToDelete(beneficiario);
        setRazonEliminacion('');
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <PageHeader 
                title="Beneficiarios" 
                subtitle="Gestión de familias beneficiarias en proyectos sociales"
                icon={<Users className="w-8 h-8" />}
                action={
                    hasPermission('beneficiarios.crear') && (
                        <Button variant="primary" onClick={() => navigate('/dashboard/beneficiarios/crear')}>
                            <Plus className="w-5 h-5 mr-2" />
                            Nuevo Beneficiario
                        </Button>
                    )
                }
            />

            {/* Top Selector y Stats */}
            <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row md:items-end gap-6 relative z-10">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-400 mb-2">Filtrar por Proyecto Social</label>
                            <SelectorProyectoSocial 
                                value={proyectoId} 
                                onChange={setProyectoId} 
                                placeholder="Todos los proyectos sociales"
                                className="w-full max-w-md"
                            />
                        </div>
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card className="p-4 border-slate-700/50 bg-slate-800/50 hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-slate-400 text-sm">Candidatos</p>
                                    <p className="text-2xl font-bold text-slate-200 mt-1">{stats.por_estado.candidato}</p>
                                </div>
                                <div className="p-2 bg-slate-700/50 rounded-lg"><UserPlus className="w-5 h-5 text-slate-400" /></div>
                            </div>
                        </Card>
                        <Card className="p-4 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-400/80 text-sm">Aceptados</p>
                                    <p className="text-2xl font-bold text-blue-400 mt-1">{stats.por_estado.aceptado}</p>
                                </div>
                                <div className="p-2 bg-blue-500/20 rounded-lg"><Check className="w-5 h-5 text-blue-400" /></div>
                            </div>
                        </Card>
                        <Card className="p-4 border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-yellow-400/80 text-sm">En Construcción</p>
                                    <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.por_estado.en_construccion}</p>
                                </div>
                                <div className="p-2 bg-yellow-500/20 rounded-lg"><Home className="w-5 h-5 text-yellow-400" /></div>
                            </div>
                        </Card>
                        <Card className="p-4 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-emerald-400/80 text-sm">Entregadas</p>
                                    <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.por_estado.vivienda_entregada}</p>
                                </div>
                                <div className="p-2 bg-emerald-500/20 rounded-lg"><Home className="w-5 h-5 text-emerald-400" /></div>
                            </div>
                        </Card>
                        <Card className="p-4 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-orange-400/80 text-sm">Retirados</p>
                                    <p className="text-2xl font-bold text-orange-400 mt-1">{stats.por_estado.retirado}</p>
                                </div>
                                <div className="p-2 bg-orange-500/20 rounded-lg"><LogOut className="w-5 h-5 text-orange-400" /></div>
                            </div>
                        </Card>
                        <Card className="p-4 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-red-400/80 text-sm">Rechazados</p>
                                    <p className="text-2xl font-bold text-red-400 mt-1">{stats.por_estado.rechazado}</p>
                                </div>
                                <div className="p-2 bg-red-500/20 rounded-lg"><X className="w-5 h-5 text-red-400" /></div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Filtros de la lista */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-96">
                    <SearchInput 
                        placeholder="Buscar por nombre, CI, código..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)} 
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select 
                        value={estadoSeleccionado}
                        onChange={(e) => setEstadoSeleccionado(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-emerald-500/50"
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="candidato">Candidato</option>
                        <option value="aceptado">Aceptado</option>
                        <option value="en_construccion">En Construcción</option>
                        <option value="vivienda_entregada">Vivienda Entregada</option>
                        <option value="retirado">Retirado</option>
                        <option value="rechazado">Rechazado</option>
                    </select>
                    <Button variant="secondary" onClick={() => setVistaMapa(!vistaMapa)}>
                        {vistaMapa ? <span className="flex items-center"><Filter className="w-4 h-4 mr-2"/> Vista Lista</span> : <span className="flex items-center"><MapPin className="w-4 h-4 mr-2"/> Vista Mapa</span>}
                    </Button>
                </div>
            </div>

            {vistaMapa ? (
                <Card className="h-96 flex flex-col items-center justify-center p-8 text-center bg-slate-900 border-dashed border-2 border-slate-700">
                    <MapPin className="w-16 h-16 text-slate-600 mb-4" />
                    <h3 className="text-xl font-medium text-slate-300 mb-2">Vista de Mapa (Próximamente)</h3>
                    <p className="text-slate-500 max-w-md">
                        Aquí se visualizarán los terrenos de las familias beneficiarias usando Leaflet, coloreados según su estado actual.
                    </p>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-800/50 border-b border-slate-700/50">
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Código</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Beneficiario</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Proyecto</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Estado</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo Vivienda</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">Familiares</th>
                                    <th className="py-4 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-slate-500">Cargando beneficiarios...</td>
                                    </tr>
                                ) : beneficiarios.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-slate-500">No se encontraron beneficiarios con los filtros aplicados.</td>
                                    </tr>
                                ) : (
                                    beneficiarios.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="py-3 px-6 font-mono text-sm text-slate-300">
                                                {b.codigo_beneficiario}
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-emerald-500 font-bold overflow-hidden">
                                                        {b.foto_titular_url ? (
                                                            <img src={b.foto_titular_url} alt={b.nombre} className="w-full h-full object-cover" />
                                                        ) : (
                                                            b.nombre.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-200">{b.nombre_completo}</div>
                                                        <div className="text-xs text-slate-500">CI: {b.ci_completo}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="text-sm text-slate-300 max-w-[200px] truncate" title={b.proyecto?.nombre}>
                                                    {b.proyecto?.nombre}
                                                </div>
                                                <div className="text-xs text-slate-500">{b.proyecto?.entidad_estatal?.sigla}</div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <EstadoBeneficiarioBadge estado={b.estado_seleccion} />
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-400">
                                                {b.tipo_vivienda ? b.tipo_vivienda.nombre : <span className="text-slate-600 italic">No asignada</span>}
                                            </td>
                                            <td className="py-3 px-6 text-sm text-slate-400">
                                                {b.cantidad_familiares} pers.
                                            </td>
                                            <td className="py-3 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/beneficiarios/${b.id}`)}>
                                                        <Eye className="w-4 h-4 text-blue-400" />
                                                    </Button>
                                                    {hasPermission('beneficiarios.editar') && (
                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/beneficiarios/${b.id}/editar`)}>
                                                            <Edit className="w-4 h-4 text-slate-400" />
                                                        </Button>
                                                    )}
                                                    {hasPermission('beneficiarios.eliminar') && (
                                                        <Dropdown
                                                            trigger={
                                                                <Button variant="ghost" size="sm">
                                                                    <MoreVertical className="w-4 h-4 text-slate-400" />
                                                                </Button>
                                                            }
                                                            items={[
                                                                { 
                                                                    label: 'Eliminar', 
                                                                    onClick: () => confirmDelete(b),
                                                                    danger: true 
                                                                }
                                                            ]}
                                                        />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Modal de Eliminación */}
            <ConfirmDialog
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar Beneficiario"
                message={<>
                    <p className="mb-4">¿Estás seguro de que deseas eliminar al beneficiario <strong>{beneficiarioToDelete?.nombre_completo}</strong>?</p>
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

export default ListaBeneficiarios;
