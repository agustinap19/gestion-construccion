import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import Modal from '../../../components/ui/Modal';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import Tooltip from '../../../components/ui/Tooltip';
import FloatingInput from '../../../components/ui/FloatingInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import { Shield, Plus, Eye, Edit, Copy, Trash, Users, Key } from '../../../components/icons/Icons';
import BotonExportar from '../../../components/ui/BotonExportar';

/* ─────────── RolCard ─────────── */
const RolCard = ({ rol, onDetalle, onEditar, onDuplicar, onEliminar, onToggleEstado, estadoLoading }) => {
    const esCritico = ['gerente', 'super_admin', 'encargado_finanzas'].includes(rol.nombre);

    const getModulosResumen = () => {
        if (!rol.permisos?.length) return [];
        const map = {};
        rol.permisos.forEach(p => { map[p.modulo] = (map[p.modulo] || 0) + 1; });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 3);
    };

    return (
        <article
            onClick={() => onDetalle(rol.id)}
            className={[
                'group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer',
                'border transition-all duration-300',
                'hover:-translate-y-1 hover:shadow-xl',
                // Glass base
                'bg-white/80 dark:bg-white/[0.03]',
                'backdrop-blur-xl',
                esCritico
                    ? 'border-emerald-200/80 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/35 hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/10'
                    : 'border-slate-200/70 dark:border-white/[0.06] hover:border-slate-300/80 dark:hover:border-white/[0.1]',
            ].join(' ')}
            style={{
                boxShadow: '0 2px 12px oklch(0% 0 0 / 0.05)',
            }}
        >
            {/* Línea acento top para críticos */}
            {esCritico && (
                <div className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: 'linear-gradient(90deg, transparent, oklch(62% 0.2 145 / 0.7), transparent)' }} />
            )}

            {/* Gradiente hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                style={{ background: 'linear-gradient(135deg, oklch(62% 0.2 145 / 0.03) 0%, transparent 60%)' }} />

            <div className="relative z-10 p-5 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-[15px] leading-tight truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                            {rol.nombre_visible}
                        </h3>
                        <code className="text-[11px] text-slate-400 dark:text-slate-600 font-mono mt-0.5 block">
                            {rol.nombre}
                        </code>
                    </div>
                    <Badge variant={rol.es_sistema ? 'info' : 'tech'} className="shrink-0 text-[10px]">
                        {rol.es_sistema ? 'Sistema' : 'Custom'}
                    </Badge>
                </div>

                {/* Descripción */}
                <p className="text-[13px] text-slate-500 dark:text-slate-500 line-clamp-2 mb-4 min-h-[2.5rem] leading-relaxed">
                    {rol.descripcion || <span className="italic">Sin descripción</span>}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-3 text-[12px] text-slate-500 dark:text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <Key size={12} className="text-emerald-500" />
                        <strong className="text-slate-700 dark:text-slate-300">{rol.permisos?.length || 0}</strong>
                        permisos
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Users size={12} className="text-blue-500" />
                        <strong className="text-slate-700 dark:text-slate-300">{rol.usuarios_count || 0}</strong>
                        usuarios
                    </span>
                </div>

                {/* Módulos chips */}
                <div className="flex flex-wrap gap-1.5 mb-4 min-h-[22px]">
                    {getModulosResumen().map(([mod, cnt]) => (
                        <span key={mod}
                            className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/[0.05]">
                            <span className="w-1 h-1 rounded-full bg-emerald-500/60 shrink-0" />
                            {mod} · {cnt}
                        </span>
                    ))}
                    {!rol.permisos?.length && (
                        <span className="text-[11px] text-slate-400 dark:text-slate-600 italic">Sin permisos</span>
                    )}
                </div>

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-slate-100 dark:border-white/[0.05] flex items-center justify-between">
                    {/* Estado — clickeable (solo personalizados) */}
                    <Tooltip content={rol.es_sistema ? 'Los roles del sistema no se pueden desactivar' : `Clic para ${rol.estado === 'activo' ? 'desactivar' : 'activar'}`}>
                        <button
                            onClick={e => { e.stopPropagation(); onToggleEstado(e, rol); }}
                            disabled={rol.es_sistema || estadoLoading}
                            className={`transition-all duration-200 ${!rol.es_sistema ? 'hover:scale-105 cursor-pointer' : 'cursor-default'}`}
                        >
                            <Badge variant={rol.estado === 'activo' ? 'success' : 'danger'}>
                                {estadoLoading ? '···' : (rol.estado === 'activo' ? 'Activo' : 'Inactivo')}
                            </Badge>
                        </button>
                    </Tooltip>

                    {/* Acciones */}
                    <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        {[
                            { icon: Eye, label: 'Ver detalle', color: 'emerald', action: () => onDetalle(rol.id) },
                            { icon: Edit, label: 'Editar', color: 'blue', action: () => onEditar(rol.id) },
                            { icon: Copy, label: 'Duplicar', color: 'purple', action: () => onDuplicar(rol) },
                        ].map(({ icon: Icon, label, color, action }) => (
                            <Tooltip key={label} content={label}>
                                <button
                                    onClick={action}
                                    className={`p-1.5 rounded-lg text-slate-400 transition-colors hover:text-${color}-500 hover:bg-${color}-50 dark:hover:bg-${color}-500/10`}
                                >
                                    <Icon size={15} />
                                </button>
                            </Tooltip>
                        ))}
                        {rol.es_sistema ? (
                            <Tooltip content="No se puede eliminar un rol del sistema">
                                <span className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed">
                                    <Trash size={15} />
                                </span>
                            </Tooltip>
                        ) : (
                            <Tooltip content="Eliminar">
                                <button
                                    onClick={() => onEliminar(rol)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                >
                                    <Trash size={15} />
                                </button>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
};

/* ─────────── ListaRoles ─────────── */
const ListaRoles = () => {
    const navigate = useNavigate();
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({ busqueda: '', estado: 'todos' });
    const [busquedaLocal, setBusquedaLocal] = useState('');

    const [modalDuplicar, setModalDuplicar] = useState({ open: false, rol: null });
    const [duplicarForm, setDuplicarForm] = useState({ nombre_visible: '' });
    const [duplicarLoading, setDuplicarLoading] = useState(false);

    const [modalEliminar, setModalEliminar] = useState({ open: false, rol: null });
    const [eliminarLoading, setEliminarLoading] = useState(false);

    const [estadoLoading, setEstadoLoading] = useState(new Set());

    const cargarRoles = useCallback(async () => {
        try {
            setLoading(true);
            const res = await rolService.listar(filtros);
            setRoles(res.data?.data || []);
        } catch {
            toast.error('Error al cargar los roles');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => { cargarRoles(); }, [cargarRoles]);

    useEffect(() => {
        const t = setTimeout(() => setFiltros(p => ({ ...p, busqueda: busquedaLocal })), 380);
        return () => clearTimeout(t);
    }, [busquedaLocal]);

    const handleToggleEstado = async (e, rol) => {
        e.stopPropagation();
        if (rol.es_sistema) return;
        setEstadoLoading(p => new Set([...p, rol.id]));
        try {
            await rolService.cambiarEstado(rol.id);
            toast.success(`Rol ${rol.estado === 'activo' ? 'desactivado' : 'activado'}`);
            cargarRoles();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al cambiar estado');
        } finally {
            setEstadoLoading(p => { const s = new Set(p); s.delete(rol.id); return s; });
        }
    };

    const handleDuplicar = async () => {
        if (!duplicarForm.nombre_visible) {
            toast.error('Ingresa un nombre para el rol');
            return;
        }
        try {
            setDuplicarLoading(true);
            await rolService.duplicar(modalDuplicar.rol.id, duplicarForm);
            toast.success('Rol duplicado');
            setModalDuplicar({ open: false, rol: null });
            setDuplicarForm({ nombre_visible: '' });
            cargarRoles();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al duplicar');
        } finally {
            setDuplicarLoading(false);
        }
    };

    const handleEliminar = async () => {
        try {
            setEliminarLoading(true);
            await rolService.eliminar(modalEliminar.rol.id);
            toast.success('Rol eliminado');
            setModalEliminar({ open: false, rol: null });
            cargarRoles();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Error al eliminar');
        } finally {
            setEliminarLoading(false);
        }
    };

    const limpiarFiltros = () => {
        setBusquedaLocal('');
        setFiltros({ busqueda: '', estado: 'todos' });
    };

    const hayFiltros = filtros.busqueda || filtros.estado !== 'todos';

    const renderSkeletons = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200/60 dark:border-white/[0.06] bg-white/80 dark:bg-white/[0.02] p-5 space-y-3">
                    <div className="flex justify-between">
                        <Skeleton width="55%" height="1.1rem" />
                        <Skeleton width="60px" height="1rem" />
                    </div>
                    <Skeleton width="35%" height="0.75rem" />
                    <Skeleton width="100%" height="0.85rem" />
                    <Skeleton width="75%" height="0.85rem" />
                    <div className="flex gap-2 pt-1">
                        <Skeleton width="70px" height="1.5rem" />
                        <Skeleton width="70px" height="1.5rem" />
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                        <Skeleton width="60px" height="1.5rem" />
                        <div className="flex gap-1">
                            {[...Array(4)].map((_, j) => <Skeleton key={j} width="28px" height="28px" />)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Roles y Permisos"
                subtitle="Gestiona los roles del sistema y sus permisos asociados"
                icon={<Shield size={22} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <div className="flex items-center gap-2">
                        <BotonExportar
                            url="/exportar/roles/matriz"
                            formatos={[{ tipo: 'pdf', label: 'Matriz PDF' }]}
                            label="Matriz PDF"
                        />
                        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/dashboard/roles/crear')}>
                            Nuevo Rol
                        </Button>
                    </div>
                }
            />

            {/* Barra filtros */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
                <SearchInput
                    value={busquedaLocal}
                    onChange={setBusquedaLocal}
                    placeholder="Buscar rol..."
                    className="w-full sm:w-64"
                />
                <CustomSelect
                    value={filtros.estado}
                    onChange={v => setFiltros(p => ({ ...p, estado: v }))}
                    options={[
                        { value: 'todos', label: 'Todos los estados' },
                        { value: 'activo', label: 'Activo' },
                        { value: 'inactivo', label: 'Inactivo' },
                    ]}
                    className="w-full sm:w-44"
                />
                {hayFiltros && (
                    <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Grid */}
            {loading ? renderSkeletons() : roles.length === 0 ? (
                <EmptyState
                    icon={<Shield size={32} />}
                    title="No se encontraron roles"
                    description={hayFiltros ? 'Prueba cambiando los filtros.' : 'Crea el primer rol del sistema.'}
                    action={hayFiltros && <Button variant="outline" onClick={limpiarFiltros}>Limpiar filtros</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {roles.map(rol => (
                        <RolCard
                            key={rol.id}
                            rol={rol}
                            onDetalle={id => navigate(`/dashboard/roles/${id}`)}
                            onEditar={id => navigate(`/dashboard/roles/${id}/editar`)}
                            onDuplicar={r => {
                                setModalDuplicar({ open: true, rol: r });
                                setDuplicarForm({ nombre_visible: `${r.nombre_visible} (Copia)` });
                            }}
                            onEliminar={r => setModalEliminar({ open: true, rol: r })}
                            onToggleEstado={handleToggleEstado}
                            estadoLoading={estadoLoading.has(rol.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal Duplicar */}
            <Modal
                open={modalDuplicar.open}
                onClose={() => setModalDuplicar({ open: false, rol: null })}
                title={`Duplicar "${modalDuplicar.rol?.nombre_visible || ''}"`}
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
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Se copiará el rol <strong className="text-slate-700 dark:text-slate-200">{modalDuplicar.rol?.nombre_visible}</strong> con todos sus permisos.
                    </p>
                    <FloatingInput
                        label="Nombre del nuevo rol"
                        value={duplicarForm.nombre_visible}
                        onChange={e => setDuplicarForm(p => ({ ...p, nombre_visible: e.target.value }))}
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
                    modalEliminar.rol?.usuarios_count > 0
                        ? <span>El rol <strong>{modalEliminar.rol?.nombre_visible}</strong> tiene <strong className="text-red-500">{modalEliminar.rol.usuarios_count} usuarios</strong> asignados. Reasígnalos primero.</span>
                        : <span>¿Eliminar <strong>{modalEliminar.rol?.nombre_visible}</strong>? Esta acción no se puede deshacer.</span>
                }
                confirmText={modalEliminar.rol?.usuarios_count > 0 ? 'No se puede eliminar' : 'Eliminar'}
                danger
                loading={eliminarLoading}
            />
        </div>
    );
};

export default ListaRoles;
