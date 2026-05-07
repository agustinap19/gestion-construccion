import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import FloatingInput from '../../../components/ui/FloatingInput';
import { Shield, ArrowLeft, Check, AlertTriangle, Key } from '../../../components/icons/Icons';

const PERMISOS_CRITICOS = ['roles.crear', 'roles.eliminar', 'usuarios.crear', 'usuarios.eliminar'];

const CrearRol = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [paso, setPaso] = useState(1);

    // Paso 1 — Info básica
    const [form, setForm] = useState({
        nombre: '',
        nombre_visible: '',
        descripcion: '',
    });
    const [errores, setErrores] = useState({});

    // Paso 2 — Permisos
    const [todosPermisos, setTodosPermisos] = useState({});
    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [permisoIds, setPermisoIds] = useState([]);
    const [copiaDeRolId, setCopiaDeRolId] = useState('');
    const [busquedaPermisos, setBusquedaPermisos] = useState('');
    const [modulosAbiertos, setModulosAbiertos] = useState({});

    // General
    const [guardando, setGuardando] = useState(false);

    const esGerente = user?.rol?.nombre === 'gerente';

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                const [permisosRes, rolesRes] = await Promise.all([
                    rolService.obtenerPermisosAgrupados(),
                    rolService.listar()
                ]);
                setTodosPermisos(permisosRes.data || {});
                setRolesDisponibles(rolesRes.data || []);
                // Abrir todos los módulos
                const modulos = {};
                Object.keys(permisosRes.data || {}).forEach(m => modulos[m] = true);
                setModulosAbiertos(modulos);
            } catch (err) {
                toast.error('Error al cargar datos');
            }
        };
        cargarDatos();
    }, []);

    // Validaciones paso 1
    const validarPaso1 = () => {
        const err = {};
        if (!form.nombre) err.nombre = 'El nombre interno es obligatorio';
        else if (!/^[a-z_]+$/.test(form.nombre)) err.nombre = 'Solo letras minúsculas y guiones bajos';
        else if (form.nombre.length > 50) err.nombre = 'Máximo 50 caracteres';

        if (!form.nombre_visible) err.nombre_visible = 'El nombre visible es obligatorio';
        else if (form.nombre_visible.length > 80) err.nombre_visible = 'Máximo 80 caracteres';

        if (form.descripcion && form.descripcion.length > 500) err.descripcion = 'Máximo 500 caracteres';

        setErrores(err);
        return Object.keys(err).length === 0;
    };

    const irPaso2 = () => {
        if (validarPaso1()) setPaso(2);
    };

    const irPaso3 = () => {
        if (permisoIds.length === 0) {
            toast.error('Selecciona al menos un permiso');
            return;
        }
        setPaso(3);
    };

    // Copiar permisos de otro rol
    const handleCopiarRol = (rolId) => {
        setCopiaDeRolId(rolId);
        if (!rolId) return;
        const rolSeleccionado = rolesDisponibles.find(r => r.id === parseInt(rolId));
        if (rolSeleccionado?.permisos) {
            setPermisoIds(rolSeleccionado.permisos.map(p => p.id));
        }
    };

    const togglePermiso = (id) => {
        setPermisoIds(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleModulo = (permisos) => {
        const ids = permisos.map(p => p.id);
        const todosSeleccionados = ids.every(id => permisoIds.includes(id));
        if (todosSeleccionados) {
            setPermisoIds(prev => prev.filter(id => !ids.includes(id)));
        } else {
            setPermisoIds(prev => [...new Set([...prev, ...ids])]);
        }
    };

    const toggleModuloAbierto = (modulo) => {
        setModulosAbiertos(prev => ({ ...prev, [modulo]: !prev[modulo] }));
    };

    // Verificar permisos críticos seleccionados
    const tienePermisosCriticos = () => {
        const todosPermisosFlat = Object.values(todosPermisos).flat();
        return permisoIds.some(id => {
            const p = todosPermisosFlat.find(perm => perm.id === id);
            return p && PERMISOS_CRITICOS.includes(p.codigo);
        });
    };

    const permisosFiltrados = (permisos) => {
        if (!busquedaPermisos) return permisos;
        const b = busquedaPermisos.toLowerCase();
        return permisos.filter(p =>
            p.nombre_visible.toLowerCase().includes(b) ||
            p.codigo.toLowerCase().includes(b)
        );
    };

    const handleCrear = async () => {
        try {
            setGuardando(true);
            await rolService.crear({
                nombre: form.nombre,
                nombre_visible: form.nombre_visible,
                descripcion: form.descripcion || null,
                permiso_ids: permisoIds,
                copia_de_rol_id: copiaDeRolId ? parseInt(copiaDeRolId) : null,
            });
            toast.success('Rol creado exitosamente');
            navigate('/dashboard/roles');
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al crear el rol';
            toast.error(msg);
            // Si hay errores de validación
            if (err.response?.data?.errors) {
                setErrores(err.response.data.errors);
                setPaso(1);
            }
        } finally {
            setGuardando(false);
        }
    };

    // Resumen para paso 3
    const getResumen = () => {
        const todosPermisosFlat = Object.values(todosPermisos).flat();
        const seleccionados = todosPermisosFlat.filter(p => permisoIds.includes(p.id));
        const modulosCount = {};
        seleccionados.forEach(p => {
            modulosCount[p.modulo] = (modulosCount[p.modulo] || 0) + 1;
        });
        return { total: seleccionados.length, modulos: Object.entries(modulosCount).sort((a, b) => b[1] - a[1]) };
    };

    return (
        <div className="animate-fade-in">
            {/* Back */}
            <button
                onClick={() => navigate('/dashboard/roles')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"
            >
                <ArrowLeft size={16} />
                Volver a roles
            </button>

            <PageHeader
                title="Crear Nuevo Rol"
                subtitle="Define un rol personalizado con los permisos que necesites"
                icon={<Shield size={24} className="text-emerald-600 dark:text-emerald-400" />}
            />

            {/* Stepper */}
            <div className="flex items-center justify-center mb-8">
                {[
                    { num: 1, label: 'Información' },
                    { num: 2, label: 'Permisos' },
                    { num: 3, label: 'Revisión' },
                ].map((step, idx) => (
                    <React.Fragment key={step.num}>
                        <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                                paso > step.num
                                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#050505] shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                                    : paso === step.num
                                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#050505] ring-4 ring-emerald-100 dark:ring-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}>
                                {paso > step.num ? <Check size={18} /> : step.num}
                            </div>
                            <span className={`text-xs mt-2 font-medium transition-colors ${
                                paso >= step.num ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
                            }`}>
                                {step.label}
                            </span>
                        </div>
                        {idx < 2 && (
                            <div className={`w-20 sm:w-32 h-[2px] mx-2 mt-[-1rem] rounded-full transition-colors duration-500 ${
                                paso > step.num ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-200 dark:bg-slate-800'
                            }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Paso 1 — Información básica */}
            {paso === 1 && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <Card title="Datos del rol" subtitle="Información básica del nuevo rol">
                        <div className="space-y-1">
                            <div>
                                <FloatingInput
                                    label="Nombre interno (ej: asistente_obra)"
                                    name="nombre"
                                    value={form.nombre}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z_]/g, '');
                                        setForm(prev => ({ ...prev, nombre: val }));
                                    }}
                                    error={!!errores.nombre}
                                />
                                {errores.nombre && <p className="text-xs text-red-500 -mt-3 mb-3 pl-1">{errores.nombre}</p>}
                                {form.nombre && !errores.nombre && (
                                    <p className="text-xs text-emerald-500 -mt-3 mb-3 pl-1 font-mono">→ {form.nombre}</p>
                                )}
                            </div>

                            <div>
                                <FloatingInput
                                    label="Nombre visible"
                                    name="nombre_visible"
                                    value={form.nombre_visible}
                                    onChange={(e) => setForm(prev => ({ ...prev, nombre_visible: e.target.value }))}
                                    error={!!errores.nombre_visible}
                                />
                                {errores.nombre_visible && <p className="text-xs text-red-500 -mt-3 mb-3 pl-1">{errores.nombre_visible}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    Descripción <span className="text-slate-400">(opcional)</span>
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Describe las responsabilidades de este rol..."
                                    rows={3}
                                    maxLength={500}
                                    className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-600 dark:focus:border-purple-500 focus:shadow-[0_0_15px_rgba(5,150,105,0.3)] dark:focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] transition-all resize-none"
                                />
                                <p className="text-xs text-slate-400 text-right mt-1">{form.descripcion.length}/500</p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button onClick={irPaso2}>
                                Siguiente
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Paso 2 — Permisos */}
            {paso === 2 && (
                <div className="max-w-4xl mx-auto animate-fade-in">
                    <Card title="Selecciona los permisos" subtitle="Define qué puede hacer un usuario con este rol">
                        {/* Copiar de otro rol */}
                        <div className="mb-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/50">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                ¿Quieres copiar permisos de un rol existente?
                            </p>
                            <select
                                value={copiaDeRolId}
                                onChange={(e) => handleCopiarRol(e.target.value)}
                                className="w-full sm:w-72 h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all"
                            >
                                <option value="">No copiar — empezar desde cero</option>
                                {rolesDisponibles.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.nombre_visible} ({r.permisos?.length || 0} permisos)
                                    </option>
                                ))}
                            </select>
                        </div>

                        <SearchInput
                            value={busquedaPermisos}
                            onChange={setBusquedaPermisos}
                            placeholder="Buscar permisos..."
                            className="mb-4"
                        />

                        {/* Advertencia permisos críticos */}
                        {tienePermisosCriticos() && !esGerente && (
                            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    <strong>Atención:</strong> Has seleccionado permisos administrativos críticos. Solo el Gerente puede asignar estos permisos.
                                </p>
                            </div>
                        )}

                        {/* Contador */}
                        <div className="mb-4 flex items-center gap-2">
                            <Badge variant="success">
                                <Key size={12} className="mr-1" />
                                {permisoIds.length} permisos seleccionados
                            </Badge>
                        </div>

                        {/* Permisos por módulo */}
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                            {Object.entries(todosPermisos).map(([modulo, permisos]) => {
                                const filtrados = permisosFiltrados(permisos);
                                if (filtrados.length === 0) return null;
                                const ids = permisos.map(p => p.id);
                                const todosCheck = ids.every(id => permisoIds.includes(id));
                                const algunosCheck = ids.some(id => permisoIds.includes(id)) && !todosCheck;

                                return (
                                    <div key={modulo} className="border border-slate-200 dark:border-slate-800/50 rounded-xl overflow-hidden">
                                        <button
                                            onClick={() => toggleModuloAbierto(modulo)}
                                            className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={todosCheck}
                                                    ref={el => { if (el) el.indeterminate = algunosCheck; }}
                                                    onChange={() => toggleModulo(permisos)}
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

                                        {modulosAbiertos[modulo] && (
                                            <div className="p-3 space-y-1">
                                                {filtrados.map(p => {
                                                    const esCritico = PERMISOS_CRITICOS.includes(p.codigo);
                                                    return (
                                                        <label
                                                            key={p.id}
                                                            className={`flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${
                                                                esCritico ? 'border-l-2 border-amber-400 pl-3' : ''
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={permisoIds.includes(p.id)}
                                                                onChange={() => togglePermiso(p.id)}
                                                                className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                            />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm text-slate-700 dark:text-slate-300">{p.nombre_visible}</p>
                                                                    {esCritico && <Badge variant="warning">Crítico</Badge>}
                                                                </div>
                                                                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{p.codigo}</p>
                                                            </div>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-between mt-6">
                            <Button variant="secondary" onClick={() => setPaso(1)}>
                                Anterior
                            </Button>
                            <Button onClick={irPaso3}>
                                Siguiente
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Paso 3 — Revisión */}
            {paso === 3 && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <Card title="Revisión y Confirmación" subtitle="Verifica que todo esté correcto antes de crear el rol">
                        <div className="space-y-5">
                            {/* Resumen Info */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/50 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Información del Rol</h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Nombre interno</span>
                                        <p className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{form.nombre}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500 dark:text-slate-400">Nombre visible</span>
                                        <p className="text-slate-900 dark:text-white font-medium">{form.nombre_visible}</p>
                                    </div>
                                </div>
                                {form.descripcion && (
                                    <div className="text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Descripción</span>
                                        <p className="text-slate-700 dark:text-slate-300">{form.descripcion}</p>
                                    </div>
                                )}
                            </div>

                            {/* Resumen Permisos */}
                            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Permisos Seleccionados</h4>
                                    <Badge variant="success">{getResumen().total} permisos</Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {getResumen().modulos.map(([modulo, count]) => (
                                        <div key={modulo} className="flex items-center gap-2 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span className="capitalize text-slate-700 dark:text-slate-300">{modulo}</span>
                                            <span className="text-slate-400">({count})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Advertencia permisos críticos */}
                            {tienePermisosCriticos() && (
                                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 flex items-start gap-3">
                                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-700 dark:text-amber-400">
                                        Este rol incluye permisos administrativos críticos. {esGerente ? 'Se creará con estos permisos.' : 'Solo el Gerente puede crear roles con estos permisos.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-8">
                            <Button variant="secondary" onClick={() => setPaso(2)}>
                                Anterior
                            </Button>
                            <Button
                                onClick={handleCrear}
                                loading={guardando}
                                disabled={tienePermisosCriticos() && !esGerente}
                            >
                                Crear rol
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CrearRol;
