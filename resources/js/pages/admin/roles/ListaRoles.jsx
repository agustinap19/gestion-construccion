import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Tooltip from '../../../components/ui/Tooltip';
import FloatingInput from '../../../components/ui/FloatingInput';
import { Shield, Plus, Eye, Edit, Copy, Trash, Users, Key, Search } from '../../../components/icons/Icons';

const ListaRoles = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', tipo: 'todos', estado: 'todos' });
    const [busquedaLocal, setBusquedaLocal] = useState('');

    // Modal duplicar
    const [modalDuplicar, setModalDuplicar] = useState({ open: false, rol: null });
    const [duplicarForm, setDuplicarForm] = useState({ nombre: '', nombre_visible: '' });
    const [duplicarLoading, setDuplicarLoading] = useState(false);

    // Modal eliminar
    const [modalEliminar, setModalEliminar] = useState({ open: false, rol: null });
    const [eliminarLoading, setEliminarLoading] = useState(false);

    const cargarRoles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await rolService.listar(filtros);
            setRoles(res.data || []);
        } catch (err) {
            toast.error('Error al cargar los roles');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        cargarRoles();
    }, [cargarRoles]);

    // Debounce para búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setFiltros(prev => ({ ...prev, busqueda: busquedaLocal }));
        }, 400);
        return () => clearTimeout(timer);
    }, [busquedaLocal]);

    const handleDuplicar = async () => {
        if (!duplicarForm.nombre || !duplicarForm.nombre_visible) {
            toast.error('Completa todos los campos');
            return;
        }
        try {
            setDuplicarLoading(true);
            await rolService.duplicar(modalDuplicar.rol.id, duplicarForm);
            toast.success('Rol duplicado exitosamente');
            setModalDuplicar({ open: false, rol: null });
            setDuplicarForm({ nombre: '', nombre_visible: '' });
            cargarRoles();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al duplicar el rol';
            toast.error(msg);
        } finally {
            setDuplicarLoading(false);
        }
    };

    const handleEliminar = async () => {
        try {
            setEliminarLoading(true);
            await rolService.eliminar(modalEliminar.rol.id);
            toast.success('Rol eliminado exitosamente');
            setModalEliminar({ open: false, rol: null });
            cargarRoles();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al eliminar el rol';
            toast.error(msg);
        } finally {
            setEliminarLoading(false);
        }
    };

    const limpiarFiltros = () => {
        setBusquedaLocal('');
        setFiltros({ busqueda: '', tipo: 'todos', estado: 'todos' });
    };

    const esRolCritico = (nombre) => ['gerente', 'encargado_finanzas'].includes(nombre);

    const getModulosResumen = (permisos) => {
        if (!permisos || permisos.length === 0) return [];
        const agrupados = {};
        permisos.forEach(p => {
            if (!agrupados[p.modulo]) agrupados[p.modulo] = 0;
            agrupados[p.modulo]++;
        });
        return Object.entries(agrupados)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([modulo, count]) => ({ modulo, count }));
    };

    // Skeletons
    const renderSkeletons = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton width="60%" height="1.5rem" />
                        <Skeleton width="80px" height="1.25rem" />
                    </div>
                    <Skeleton width="100%" height="0.875rem" />
                    <Skeleton width="80%" height="0.875rem" />
                    <div className="flex gap-4 pt-2">
                        <Skeleton width="100px" height="0.875rem" />
                        <Skeleton width="100px" height="0.875rem" />
                    </div>
                    <div className="flex gap-2 pt-3">
                        <Skeleton width="60px" height="2rem" />
                        <Skeleton width="60px" height="2rem" />
                        <Skeleton width="60px" height="2rem" />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Roles y Permisos"
                subtitle="Gestiona los roles del sistema y los permisos asociados"
                icon={<Shield size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <Button
                        leftIcon={<Plus size={18} />}
                        onClick={() => navigate('/dashboard/roles/crear')}
                    >
                        Nuevo Rol
                    </Button>
                }
            />

            {/* Barra de filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <SearchInput
                    value={busquedaLocal}
                    onChange={setBusquedaLocal}
                    placeholder="Buscar rol..."
                    className="w-full sm:w-72"
                />

                <select
                    value={filtros.tipo}
                    onChange={e => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 dark:focus:ring-emerald-500/50 focus:border-emerald-600/50 dark:focus:border-emerald-500/50 outline-none transition-all"
                >
                    <option value="todos">Todos los tipos</option>
                    <option value="sistema">Sistema</option>
                    <option value="personalizado">Personalizado</option>
                </select>

                <select
                    value={filtros.estado}
                    onChange={e => setFiltros(prev => ({ ...prev, estado: e.target.value }))}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 dark:focus:ring-emerald-500/50 focus:border-emerald-600/50 dark:focus:border-emerald-500/50 outline-none transition-all"
                >
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                </select>

                {(filtros.busqueda || filtros.tipo !== 'todos' || filtros.estado !== 'todos') && (
                    <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                        Limpiar filtros
                    </Button>
                )}
            </div>

            {/* Contenido */}
            {loading ? renderSkeletons() : roles.length === 0 ? (
                <EmptyState
                    icon={<Shield size={32} />}
                    title="No se encontraron roles"
                    description="No hay roles que coincidan con los filtros seleccionados."
                    action={
                        <Button variant="outline" onClick={limpiarFiltros}>
                            Limpiar filtros
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {roles.map(rol => (
                        <div
                            key={rol.id}
                            onClick={() => navigate(`/dashboard/roles/${rol.id}`)}
                            className={`group bg-white dark:bg-slate-900/40 backdrop-blur-xl rounded-2xl overflow-hidden relative shadow-sm dark:shadow-none border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer ${
                                esRolCritico(rol.nombre)
                                    ? 'border-emerald-200 dark:border-emerald-500/30 hover:shadow-emerald-500/10'
                                    : 'border-slate-200/60 dark:border-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                        >
                            {/* Línea de acento superior para roles críticos */}
                            {esRolCritico(rol.nombre) && (
                                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60" />
                            )}

                            <div className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {rol.nombre_visible}
                                        </h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                            {rol.nombre}
                                        </p>
                                    </div>
                                    <Badge variant={rol.es_sistema ? 'info' : 'tech'}>
                                        {rol.es_sistema ? 'Sistema' : 'Personalizado'}
                                    </Badge>
                                </div>

                                {/* Descripción */}
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                                    {rol.descripcion || 'Sin descripción'}
                                </p>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mb-4 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Key size={14} className="text-emerald-500" />
                                        <span className="font-medium">{rol.permisos?.length || 0}</span>
                                        <span>permisos</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Users size={14} className="text-blue-500" />
                                        <span className="font-medium">{rol.usuarios_count || 0}</span>
                                        <span>usuarios</span>
                                    </div>
                                </div>

                                {/* Módulos resumen */}
                                <div className="space-y-1 mb-4 min-h-[3.5rem]">
                                    {getModulosResumen(rol.permisos).map(({ modulo, count }) => (
                                        <div key={modulo} className="flex items-center gap-2 text-xs">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                                            <span className="text-slate-600 dark:text-slate-300 capitalize">{modulo}</span>
                                            <span className="text-slate-400 dark:text-slate-500">·</span>
                                            <span className="text-slate-400 dark:text-slate-500">{count} {count === 1 ? 'permiso' : 'permisos'}</span>
                                        </div>
                                    ))}
                                    {(!rol.permisos || rol.permisos.length === 0) && (
                                        <span className="text-xs text-slate-400 italic">Sin permisos asignados</span>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                    <Badge variant={rol.estado === 'activo' ? 'success' : 'danger'}>
                                        {rol.estado === 'activo' ? 'Activo' : 'Inactivo'}
                                    </Badge>

                                    <div className="flex items-center gap-1">
                                        <Tooltip content="Ver detalle">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/roles/${rol.id}`); }}
                                                className="p-2 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Editar">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/roles/${rol.id}/editar`); }}
                                                className="p-2 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip content="Duplicar">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setModalDuplicar({ open: true, rol });
                                                    setDuplicarForm({ nombre: `${rol.nombre}_copia`, nombre_visible: `${rol.nombre_visible} (Copia)` });
                                                }}
                                                className="p-2 rounded-lg text-slate-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors"
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </Tooltip>
                                        {rol.es_sistema ? (
                                            <Tooltip content="No se puede eliminar un rol del sistema">
                                                <button
                                                    disabled
                                                    className="p-2 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </Tooltip>
                                        ) : (
                                            <Tooltip content="Eliminar">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setModalEliminar({ open: true, rol }); }}
                                                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Duplicar */}
            <Modal
                open={modalDuplicar.open}
                onClose={() => setModalDuplicar({ open: false, rol: null })}
                title={`Duplicar rol "${modalDuplicar.rol?.nombre_visible || ''}"`}
                size="md"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setModalDuplicar({ open: false, rol: null })} disabled={duplicarLoading}>
                            Cancelar
                        </Button>
                        <Button onClick={handleDuplicar} loading={duplicarLoading}>
                            Duplicar rol
                        </Button>
                    </>
                }
            >
                <div className="space-y-1">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                        Se creará un nuevo rol con los mismos permisos que <strong className="text-slate-700 dark:text-slate-200">{modalDuplicar.rol?.nombre_visible}</strong>.
                    </p>
                    <FloatingInput
                        label="Nombre interno (solo minúsculas y _)"
                        name="nombre"
                        value={duplicarForm.nombre}
                        onChange={(e) => setDuplicarForm(prev => ({ ...prev, nombre: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') }))}
                    />
                    <FloatingInput
                        label="Nombre visible"
                        name="nombre_visible"
                        value={duplicarForm.nombre_visible}
                        onChange={(e) => setDuplicarForm(prev => ({ ...prev, nombre_visible: e.target.value }))}
                    />
                </div>
            </Modal>

            {/* Dialog Eliminar */}
            <ConfirmDialog
                open={modalEliminar.open}
                onCancel={() => setModalEliminar({ open: false, rol: null })}
                onConfirm={handleEliminar}
                title="Eliminar rol"
                message={
                    modalEliminar.rol?.usuarios_count > 0 ? (
                        <span>
                            El rol <strong>{modalEliminar.rol?.nombre_visible}</strong> tiene <strong className="text-red-500">{modalEliminar.rol?.usuarios_count} usuarios asignados</strong>. 
                            Reasígnalos a otro rol antes de poder eliminarlo.
                        </span>
                    ) : (
                        <span>
                            ¿Estás seguro de que deseas eliminar el rol <strong>{modalEliminar.rol?.nombre_visible}</strong>? Esta acción no se puede deshacer.
                        </span>
                    )
                }
                confirmText={modalEliminar.rol?.usuarios_count > 0 ? 'No se puede eliminar' : 'Eliminar rol'}
                danger
                loading={eliminarLoading}
            />
        </div>
    );
};

export default ListaRoles;
