import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import FloatingInput from '../../../components/ui/FloatingInput';
import Skeleton from '../../../components/ui/Skeleton';
import Tooltip from '../../../components/ui/Tooltip';
import { Shield, ArrowLeft, Check, Lock, Info } from '../../../components/icons/Icons';

const EditarRol = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [rol, setRol] = useState(null);
    const [paso, setPaso] = useState(1);
    const [form, setForm] = useState({
        nombre_visible: '',
        descripcion: '',
        estado: 'activo',
    });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);

    const cargarRol = useCallback(async () => {
        try {
            setLoading(true);
            const res = await rolService.obtener(id);
            const r = res.data.rol;
            setRol(r);
            setForm({
                nombre_visible: r.nombre_visible,
                descripcion: r.descripcion || '',
                estado: r.estado,
            });
        } catch (err) {
            toast.error('Error al cargar el rol');
            navigate('/dashboard/roles');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        cargarRol();
    }, [cargarRol]);

    const validarPaso1 = () => {
        const err = {};
        if (!form.nombre_visible) err.nombre_visible = 'El nombre visible es obligatorio';
        else if (form.nombre_visible.length > 80) err.nombre_visible = 'Máximo 80 caracteres';

        if (form.descripcion && form.descripcion.length > 500) err.descripcion = 'Máximo 500 caracteres';

        if (!form.estado) err.estado = 'El estado es obligatorio';

        setErrores(err);
        return Object.keys(err).length === 0;
    };

    const irPaso2 = () => {
        if (validarPaso1()) setPaso(2);
    };

    const handleGuardar = async () => {
        try {
            setGuardando(true);
            await rolService.actualizar(id, form);
            toast.success('Rol actualizado exitosamente');
            navigate(`/dashboard/roles/${id}`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar el rol';
            toast.error(msg);
            if (err.response?.data?.errors) {
                setErrores(err.response.data.errors);
                setPaso(1);
            }
        } finally {
            setGuardando(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-6">
                <Skeleton width="200px" height="1rem" />
                <div className="flex items-center gap-4">
                    <Skeleton width="48px" height="48px" />
                    <Skeleton width="300px" height="1.75rem" />
                </div>
                <Skeleton width="100%" height="300px" />
            </div>
        );
    }

    if (!rol) return null;

    return (
        <div className="animate-fade-in">
            {/* Back */}
            <button
                onClick={() => navigate(`/dashboard/roles/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"
            >
                <ArrowLeft size={16} />
                Volver al detalle
            </button>

            <PageHeader
                title={`Editar: ${rol.nombre_visible}`}
                subtitle={
                    <span className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">{rol.nombre}</span>
                        <Badge variant={rol.es_sistema ? 'info' : 'tech'}>
                            {rol.es_sistema ? 'Sistema' : 'Personalizado'}
                        </Badge>
                    </span>
                }
                icon={<Shield size={24} className="text-emerald-600 dark:text-emerald-400" />}
            />

            {/* Stepper de 2 pasos */}
            <div className="flex items-center justify-center mb-8">
                {[
                    { num: 1, label: 'Información' },
                    { num: 2, label: 'Revisión' },
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
                        {idx < 1 && (
                            <div className={`w-24 sm:w-40 h-[2px] mx-3 mt-[-1rem] rounded-full transition-colors duration-500 ${
                                paso > step.num ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-slate-200 dark:bg-slate-800'
                            }`} />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Paso 1 — Editar información */}
            {paso === 1 && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <Card title="Datos del rol" subtitle="Modifica la información del rol">
                        <div className="space-y-1">
                            {/* Nombre interno (solo lectura si es sistema) */}
                            <div className="mb-5">
                                <Tooltip content={rol.es_sistema ? 'No se puede modificar el nombre de un rol del sistema' : 'El nombre interno no se puede cambiar después de creado'} position="top">
                                    <div className="relative">
                                        <FloatingInput
                                            label="Nombre interno"
                                            name="nombre"
                                            value={rol.nombre}
                                            disabled={true}
                                            icon={<Lock size={16} />}
                                        />
                                    </div>
                                </Tooltip>
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

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Estado</label>
                                <select
                                    value={form.estado}
                                    onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value }))}
                                    className="w-full h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all"
                                >
                                    <option value="activo">Activo</option>
                                    <option value="inactivo">Inactivo</option>
                                </select>
                            </div>

                            {rol.es_sistema && (
                                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 flex items-start gap-3 mt-4">
                                    <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700 dark:text-blue-400">
                                        Este es un rol del sistema. Solo puedes modificar el nombre visible, la descripción y el estado. Para editar permisos, ve al detalle del rol.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end mt-6">
                            <Button onClick={irPaso2}>
                                Siguiente
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Paso 2 — Revisión */}
            {paso === 2 && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <Card title="Revisión y Confirmación" subtitle="Verifica los cambios antes de guardar">
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800/50 space-y-3">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Cambios a aplicar</h4>

                                <div className="space-y-2">
                                    {form.nombre_visible !== rol.nombre_visible && (
                                        <div className="text-sm">
                                            <span className="text-slate-500">Nombre visible: </span>
                                            <span className="line-through text-red-400 mr-2">{rol.nombre_visible}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">→ {form.nombre_visible}</span>
                                        </div>
                                    )}
                                    {form.descripcion !== (rol.descripcion || '') && (
                                        <div className="text-sm">
                                            <span className="text-slate-500">Descripción: </span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Actualizada</span>
                                        </div>
                                    )}
                                    {form.estado !== rol.estado && (
                                        <div className="text-sm">
                                            <span className="text-slate-500">Estado: </span>
                                            <Badge variant={rol.estado === 'activo' ? 'success' : 'danger'}>{rol.estado}</Badge>
                                            <span className="mx-2 text-slate-400">→</span>
                                            <Badge variant={form.estado === 'activo' ? 'success' : 'danger'}>{form.estado}</Badge>
                                        </div>
                                    )}
                                    {form.nombre_visible === rol.nombre_visible && form.descripcion === (rol.descripcion || '') && form.estado === rol.estado && (
                                        <p className="text-sm text-slate-400 italic">No hay cambios para guardar.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between mt-8">
                            <Button variant="secondary" onClick={() => setPaso(1)}>
                                Anterior
                            </Button>
                            <Button onClick={handleGuardar} loading={guardando}>
                                Guardar cambios
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default EditarRol;
