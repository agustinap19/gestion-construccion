import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import Modal from '../../../components/ui/Modal';
import Tabs from '../../../components/ui/Tabs';
import Skeleton from '../../../components/ui/Skeleton';
import Avatar from '../../../components/ui/Avatar';
import SearchInput from '../../../components/ui/SearchInput';
import Tooltip from '../../../components/ui/Tooltip';
import EmptyState from '../../../components/ui/EmptyState';
import { Shield, Edit, Trash, ArrowLeft, Users, Key, History, Check, Info, ShieldCheck, Eye } from '../../../components/icons/Icons';

const DetalleRol = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('info');

    // Modal editar permisos
    const [modalPermisos, setModalPermisos] = useState(false);
    const [todosPermisos, setTodosPermisos] = useState({});
    const [permisosSeleccionados, setPermisosSeleccionados] = useState([]);
    const [busquedaPermisos, setBusquedaPermisos] = useState('');
    const [razonCambio, setRazonCambio] = useState('');
    const [guardandoPermisos, setGuardandoPermisos] = useState(false);
    const [modulosAbiertos, setModulosAbiertos] = useState({});

    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            const res = await rolService.obtener(id);
            setData(res.data);
        } catch (err) {
            toast.error('Error al cargar el rol');
            navigate('/dashboard/roles');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    const abrirModalPermisos = async () => {
        try {
            const res = await rolService.obtenerPermisosAgrupados();
            setTodosPermisos(res.data || {});
            // Pre-seleccionar permisos actuales
            const idsActuales = data.rol.permisos.map(p => p.id);
            setPermisosSeleccionados(idsActuales);
            // Abrir todos los módulos
            const modulos = {};
            Object.keys(res.data || {}).forEach(m => modulos[m] = true);
            setModulosAbiertos(modulos);
            setModalPermisos(true);
        } catch (err) {
            toast.error('Error al cargar permisos');
        }
    };

    const togglePermiso = (id) => {
        setPermisosSeleccionados(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleModulo = (modulo, permisos) => {
        const ids = permisos.map(p => p.id);
        const todosSeleccionados = ids.every(id => permisosSeleccionados.includes(id));
        if (todosSeleccionados) {
            setPermisosSeleccionados(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setPermisosSeleccionados(prev => [...new Set([...prev, ...ids])]);
        }
    };

    const toggleModuloAbierto = (modulo) => {
        setModulosAbiertos(prev => ({ ...prev, [modulo]: !prev[modulo] }));
    };

    const guardarPermisos = async () => {
        try {
            setGuardandoPermisos(true);
            await rolService.actualizarPermisos(id, permisosSeleccionados, razonCambio || null);
            toast.success('Permisos actualizados exitosamente');
            setModalPermisos(false);
            setRazonCambio('');
            cargarDatos();
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar permisos';
            toast.error(msg);
        } finally {
            setGuardandoPermisos(false);
        }
    };

    const permisosFiltrados = (permisos) => {
        if (!busquedaPermisos) return permisos;
        const b = busquedaPermisos.toLowerCase();
        return permisos.filter(p =>
            p.nombre_visible.toLowerCase().includes(b) ||
            p.codigo.toLowerCase().includes(b) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(b))
        );
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton width="48px" height="48px" />
                    <div className="space-y-2">
                        <Skeleton width="300px" height="1.75rem" />
                        <Skeleton width="200px" height="1rem" />
                    </div>
                </div>
                <Skeleton width="100%" height="3rem" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton width="100%" height="200px" />
                    <Skeleton width="100%" height="200px" />
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { rol, permisos_agrupados, usuarios, auditoria } = data;

    const tabs = [
        { key: 'info', label: 'Información', icon: <Info size={16} /> },
        { key: 'permisos', label: 'Permisos', icon: <Key size={16} />, badge: <Badge variant="neutral">{rol.permisos?.length || 0}</Badge> },
        { key: 'usuarios', label: 'Usuarios', icon: <Users size={16} />, badge: <Badge variant="neutral">{rol.usuarios_count || 0}</Badge> },
        { key: 'auditoria', label: 'Auditoría', icon: <History size={16} /> },
    ];

    const formatFecha = (fecha) => {
        if (!fecha) return '—';
        return new Date(fecha).toLocaleDateString('es-BO', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-2">
                <button
                    onClick={() => navigate('/dashboard/roles')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"
                >
                    <ArrowLeft size={16} />
                    Volver a roles
                </button>
            </div>

            <PageHeader
                title={rol.nombre_visible}
                subtitle={
                    <span className="flex items-center gap-3">
                        <span className="font-mono text-slate-400">{rol.nombre}</span>
                        <Badge variant={rol.es_sistema ? 'info' : 'tech'}>
                            {rol.es_sistema ? 'Sistema' : 'Personalizado'}
                        </Badge>
                        <Badge variant={rol.estado === 'activo' ? 'success' : 'danger'}>
                            {rol.estado}
                        </Badge>
                    </span>
                }
                icon={<ShieldCheck size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" leftIcon={<Edit size={16} />} onClick={() => navigate(`/dashboard/roles/${id}/editar`)}>
                            Editar
                        </Button>
                        {!rol.es_sistema && (
                            <Button variant="danger" leftIcon={<Trash size={16} />} size="md" onClick={() => navigate('/dashboard/roles')}>
                                Eliminar
                            </Button>
                        )}
                    </div>
                }
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            <div className="mt-6">
                {/* TAB: Información */}
                {activeTab === 'info' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        <Card title="Datos del Rol">
                            <div className="space-y-4">
                                <InfoRow label="Nombre visible" value={rol.nombre_visible} />
                                <InfoRow label="Nombre interno" value={<span className="font-mono text-emerald-600 dark:text-emerald-400">{rol.nombre}</span>} />
                                <InfoRow label="Tipo" value={
                                    <Badge variant={rol.es_sistema ? 'info' : 'tech'}>
                                        {rol.es_sistema ? 'Rol del sistema' : 'Rol personalizado'}
                                    </Badge>
                                } />
                                <InfoRow label="Estado" value={
                                    <Badge variant={rol.estado === 'activo' ? 'success' : 'danger'}>
                                        {rol.estado}
                                    </Badge>
                                } />
                                <InfoRow label="Descripción" value={rol.descripcion || 'Sin descripción'} />
                            </div>
                        </Card>

                        <Card title="Estadísticas">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center">
                                            <Key size={20} className="text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Permisos asignados</span>
                                    </div>
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{rol.permisos?.length || 0}</span>
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                                            <Users size={20} className="text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usuarios asignados</span>
                                    </div>
                                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{rol.usuarios_count || 0}</span>
                                </div>

                                <InfoRow label="Fecha de creación" value={formatFecha(rol.created_at)} />
                                <InfoRow label="Última modificación" value={formatFecha(rol.updated_at)} />
                            </div>
                        </Card>
                    </div>
                )}

                {/* TAB: Permisos */}
                {activeTab === 'permisos' && (
                    <div className="animate-fade-in">
                        <div className="flex justify-between items-center mb-5">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Este rol tiene <strong className="text-slate-700 dark:text-slate-200">{rol.permisos?.length || 0} permisos</strong> asignados.
                            </p>
                            <Button leftIcon={<Edit size={16} />} onClick={abrirModalPermisos}>
                                Editar Permisos
                            </Button>
                        </div>

                        {Object.keys(permisos_agrupados).length === 0 ? (
                            <EmptyState
                                icon={<Key size={32} />}
                                title="Sin permisos asignados"
                                description="Este rol no tiene permisos asignados."
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(permisos_agrupados).map(([modulo, permisos]) => (
                                    <Card key={modulo} padding="p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                                                <Shield size={16} className="text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{modulo}</h4>
                                            <Badge variant="neutral">{permisos.length}</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {permisos.map(p => (
                                                <div key={p.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <Check size={14} className="text-emerald-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-sm text-slate-700 dark:text-slate-300">{p.nombre_visible}</span>
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-2 font-mono">{p.codigo}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Usuarios */}
                {activeTab === 'usuarios' && (
                    <div className="animate-fade-in">
                        {usuarios.length === 0 ? (
                            <EmptyState
                                icon={<Users size={32} />}
                                title="Sin usuarios asignados"
                                description="No hay usuarios con este rol asignado."
                            />
                        ) : (
                            <Card>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                    {usuarios.map(u => (
                                        <div
                                            key={u.id}
                                            className="flex items-center gap-4 py-3 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-lg transition-colors cursor-pointer"
                                            onClick={() => navigate(`/dashboard/usuarios/${u.id}`)}
                                        >
                                            <Avatar name={u.nombre_completo} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                                    {u.nombre_completo}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                    {u.ultimo_acceso ? `Último acceso: ${formatFecha(u.ultimo_acceso)}` : 'Sin acceso'}
                                                </p>
                                            </div>
                                            <Eye size={16} className="text-slate-400 shrink-0" />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* TAB: Auditoría */}
                {activeTab === 'auditoria' && (
                    <div className="animate-fade-in">
                        {(!auditoria || auditoria.length === 0) ? (
                            <EmptyState
                                icon={<History size={32} />}
                                title="Sin historial"
                                description="No hay eventos de auditoría registrados para este rol."
                            />
                        ) : (
                            <Card>
                                <div className="relative">
                                    {/* Timeline line */}
                                    <div className="absolute left-[19px] top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-800" />

                                    <div className="space-y-6">
                                        {auditoria.map((evento, idx) => (
                                            <div key={evento.id || idx} className="relative flex gap-4 pl-2">
                                                {/* Dot */}
                                                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                                    evento.evento.includes('eliminado')
                                                        ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30'
                                                        : evento.evento.includes('creado') || evento.evento.includes('duplicado')
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                                                        : 'bg-blue-50 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30'
                                                }`}>
                                                    <History size={14} className={
                                                        evento.evento.includes('eliminado')
                                                            ? 'text-red-500'
                                                            : evento.evento.includes('creado') || evento.evento.includes('duplicado')
                                                            ? 'text-emerald-500'
                                                            : 'text-blue-500'
                                                    } />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {evento.actor
                                                                ? `${evento.actor.nombre} ${evento.actor.apellido_paterno}`
                                                                : 'Sistema'}
                                                        </span>
                                                        <Badge variant={
                                                            evento.evento.includes('eliminado') ? 'danger'
                                                                : evento.evento.includes('creado') || evento.evento.includes('duplicado') ? 'success'
                                                                : 'info'
                                                        }>
                                                            {evento.evento.replace('rol.', '').replace(/_/g, ' ')}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                                        {formatFecha(evento.created_at)}
                                                    </p>

                                                    {/* Datos del cambio */}
                                                    {(evento.datos_anteriores || evento.datos_nuevos) && (
                                                        <div className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/50 text-xs">
                                                            {evento.datos_nuevos?.agregados && evento.datos_nuevos.agregados.length > 0 && (
                                                                <div className="mb-1">
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">+ Agregados: </span>
                                                                    <span className="text-slate-600 dark:text-slate-300">{evento.datos_nuevos.agregados.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {evento.datos_nuevos?.eliminados && evento.datos_nuevos.eliminados.length > 0 && (
                                                                <div className="mb-1">
                                                                    <span className="text-red-500 font-medium">− Removidos: </span>
                                                                    <span className="text-slate-600 dark:text-slate-300">{evento.datos_nuevos.eliminados.join(', ')}</span>
                                                                </div>
                                                            )}
                                                            {evento.datos_anteriores && !evento.datos_nuevos?.agregados && (
                                                                <pre className="text-slate-500 dark:text-slate-400 whitespace-pre-wrap font-mono">
                                                                    {JSON.stringify(evento.datos_anteriores, null, 2)}
                                                                </pre>
                                                            )}
                                                        </div>
                                                    )}

                                                    {evento.razon && (
                                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                                                            Razón: "{evento.razon}"
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Modal Edición de Permisos */}
            <Modal
                open={modalPermisos}
                onClose={() => setModalPermisos(false)}
                title={`Editar permisos de ${rol.nombre_visible}`}
                size="xl"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            <strong className="text-emerald-600 dark:text-emerald-400">{permisosSeleccionados.length}</strong> permisos seleccionados
                        </span>
                        <div className="flex gap-3">
                            <Button variant="secondary" onClick={() => setModalPermisos(false)} disabled={guardandoPermisos}>
                                Cancelar
                            </Button>
                            <Button onClick={guardarPermisos} loading={guardandoPermisos}>
                                Guardar cambios
                            </Button>
                        </div>
                    </div>
                }
            >
                <div className="space-y-4">
                    <SearchInput
                        value={busquedaPermisos}
                        onChange={setBusquedaPermisos}
                        placeholder="Buscar permisos..."
                    />

                    <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                        {Object.entries(todosPermisos).map(([modulo, permisos]) => {
                            const filtrados = permisosFiltrados(permisos);
                            if (filtrados.length === 0) return null;
                            const ids = permisos.map(p => p.id);
                            const todosCheck = ids.every(id => permisosSeleccionados.includes(id));
                            const algunosCheck = ids.some(id => permisosSeleccionados.includes(id)) && !todosCheck;

                            return (
                                <div key={modulo} className="border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                                    {/* Módulo Header */}
                                    <button
                                        onClick={() => toggleModuloAbierto(modulo)}
                                        className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={todosCheck}
                                                ref={el => { if (el) el.indeterminate = algunosCheck; }}
                                                onChange={() => toggleModulo(modulo, permisos)}
                                                onClick={e => e.stopPropagation()}
                                                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                            />
                                            <span className="text-sm font-bold text-slate-900 dark:text-white capitalize">{modulo}</span>
                                            <Badge variant="neutral">{permisos.length}</Badge>
                                        </div>
                                        <svg className={`w-4 h-4 text-slate-400 transition-transform ${modulosAbiertos[modulo] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <polyline points="6 9 12 15 18 9" />
                                        </svg>
                                    </button>

                                    {/* Permisos del módulo */}
                                    {modulosAbiertos[modulo] && (
                                        <div className="p-3 space-y-1">
                                            {filtrados.map(p => (
                                                <label
                                                    key={p.id}
                                                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={permisosSeleccionados.includes(p.id)}
                                                        onChange={() => togglePermiso(p.id)}
                                                        className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                    <div>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300">{p.nombre_visible}</p>
                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{p.codigo}</p>
                                                        {p.descripcion && (
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{p.descripcion}</p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Razón del cambio */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Razón del cambio <span className="text-slate-400">(opcional)</span>
                        </label>
                        <textarea
                            value={razonCambio}
                            onChange={e => setRazonCambio(e.target.value)}
                            placeholder="Describe el motivo del cambio de permisos..."
                            rows={2}
                            maxLength={500}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-emerald-600/50 focus:border-emerald-600/50 outline-none transition-all resize-none"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// Componente auxiliar para filas de información
const InfoRow = ({ label, value }) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
        <span className="text-sm text-slate-500 dark:text-slate-400 sm:w-40 shrink-0">{label}</span>
        <span className="text-sm text-slate-900 dark:text-white font-medium">{value}</span>
    </div>
);

export default DetalleRol;
