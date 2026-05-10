import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import Skeleton from '../../../components/ui/Skeleton';
import { CheckCircle, Briefcase, FileText, ChevronLeft, Shield } from '../../../components/icons/Icons';

const TIPOS_PERSONAL = [
    { id: 'tecnico', label: 'Técnico' }, { id: 'obrero', label: 'Obrero' },
    { id: 'trabajadora_social', label: 'Trabajadora Social' }, { id: 'administrativo', label: 'Administrativo' },
    { id: 'gerente', label: 'Gerente' }, { id: 'encargado_almacen', label: 'Encargado de Almacén' },
    { id: 'encargado_finanzas', label: 'Encargado de Finanzas' }
];

const TIPOS_CONTRATO = [
    { id: 'indefinido', label: 'Indefinido' }, { id: 'plazo_fijo', label: 'Plazo Fijo' },
    { id: 'obra', label: 'Por Obra' }, { id: 'consultoria', label: 'Consultoría' }
];

const EditarPersonal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [errores, setErrores] = useState({});
    
    const isGerenteOrFinanzas = user?.rol?.nombre === 'gerente' || user?.rol?.nombre === 'encargado_finanzas';

    const [formData, setFormData] = useState({
        nombre: '', apellido_paterno: '', apellido_materno: '', 
        ci: '', ci_complemento: '', fecha_nacimiento: '', telefono: '', direccion: '',
        tipo: '', especialidad: '', categoria: '', fecha_contratacion: '',
        tipo_contrato: '', salario_base: '', frecuencia_pago: '', banco: '', numero_cuenta: '', tipo_cuenta: ''
    });
    const [codigoEmpleado, setCodigoEmpleado] = useState('');

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const res = await personalService.obtener(id);
            const p = res.data.personal;
            setCodigoEmpleado(p.codigo_empleado);
            setFormData({
                nombre: p.nombre, apellido_paterno: p.apellido_paterno, apellido_materno: p.apellido_materno || '',
                ci: p.ci, ci_complemento: p.ci_complemento || '', fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : '',
                telefono: p.telefono || '', direccion: p.direccion || '',
                tipo: p.tipo, especialidad: p.especialidad || '', categoria: p.categoria || '',
                fecha_contratacion: p.fecha_contratacion ? p.fecha_contratacion.substring(0, 10) : '',
                tipo_contrato: p.tipo_contrato, salario_base: p.salario_base, frecuencia_pago: p.frecuencia_pago,
                banco: p.banco || '', numero_cuenta: p.numero_cuenta || '', tipo_cuenta: p.tipo_cuenta || ''
            });
        } catch (e) {
            toast.error('Error al cargar personal');
            navigate('/dashboard/personal');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async () => {
        setErrores({});
        
        // Validación básica
        const err = {};
        if (!formData.nombre) err.nombre = 'Obligatorio';
        if (!formData.apellido_paterno) err.apellido_paterno = 'Obligatorio';
        if (!formData.ci) err.ci = 'Obligatorio';
        if (!formData.fecha_contratacion) err.fecha_contratacion = 'Obligatorio';
        if (isGerenteOrFinanzas && (!formData.salario_base || formData.salario_base < 0)) err.salario_base = 'Monto inválido';
        
        if (Object.keys(err).length > 0) {
            setErrores(err);
            return toast.error('Revisa los campos con errores');
        }

        try {
            setSaving(true);
            // Solo enviar salario/banco si tiene permisos
            const payload = { ...formData };
            if (!isGerenteOrFinanzas) {
                delete payload.salario_base;
                delete payload.frecuencia_pago;
                delete payload.banco;
                delete payload.numero_cuenta;
                delete payload.tipo_cuenta;
            }

            await personalService.actualizar(id, payload);
            toast.success('Personal actualizado exitosamente');
            navigate(`/dashboard/personal/${id}`);
        } catch (e) {
            if (e.response?.status === 422) {
                const serverErrors = e.response.data.errors || {};
                const flatErrors = {};
                Object.keys(serverErrors).forEach(key => flatErrors[key] = serverErrors[key][0]);
                setErrores(flatErrors);
                toast.error('Errores de validación');
            } else {
                toast.error(e.response?.data?.message || 'Error al actualizar');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Skeleton height="60px" />
                <Skeleton height="300px" className="rounded-3xl" />
                <Skeleton height="300px" className="rounded-3xl" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12 max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/personal/${id}`)} className="mb-2" leftIcon={<ChevronLeft size={16} />}>Volver al detalle</Button>
            
            <PageHeader title="Editar Personal" subtitle={`Actualizando datos de ${codigoEmpleado}`}
                icon={<Briefcase size={24} className="text-emerald-600 dark:text-emerald-400" />} />

            {/* Datos Personales */}
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><FileText size={20} /></div>
                    <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Datos Personales</h3></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FloatingInput label="Nombre" name="nombre" value={formData.nombre} onChange={handleInput} error={errores.nombre} />
                    <FloatingInput label="Apellido Paterno" name="apellido_paterno" value={formData.apellido_paterno} onChange={handleInput} error={errores.apellido_paterno} />
                    <FloatingInput label="Apellido Materno" name="apellido_materno" value={formData.apellido_materno} onChange={handleInput} />
                    
                    <div className="flex gap-2">
                        <div className="flex-1"><FloatingInput label="C.I." name="ci" value={formData.ci} onChange={handleInput} error={errores.ci} /></div>
                        <div className="w-20"><FloatingInput label="Ext." name="ci_complemento" value={formData.ci_complemento} onChange={handleInput} /></div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Fecha de Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none transition-all" />
                    </div>
                    <FloatingInput label="Teléfono" name="telefono" value={formData.telefono} onChange={handleInput} />
                    
                    <div className="lg:col-span-3">
                        <FloatingInput label="Dirección de domicilio" name="direccion" value={formData.direccion} onChange={handleInput} />
                    </div>
                </div>
            </div>

            {/* Info Laboral */}
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400"><Briefcase size={20} /></div>
                    <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Información Laboral</h3></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Tipo de Personal</label>
                        <select name="tipo" value={formData.tipo} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none">
                            {TIPOS_PERSONAL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                    <FloatingInput label="Especialidad" name="especialidad" value={formData.especialidad} onChange={handleInput} />
                    
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Fecha de Contratación</label>
                        <input type="date" name="fecha_contratacion" value={formData.fecha_contratacion} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none" />
                        {errores.fecha_contratacion && <span className="text-xs text-red-500 ml-1">{errores.fecha_contratacion}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Tipo de Contrato</label>
                        <select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none">
                            {TIPOS_CONTRATO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                        </select>
                    </div>
                    <FloatingInput label="Categoría" name="categoria" value={formData.categoria} onChange={handleInput} />
                </div>
            </div>

            {/* Compensación (Solo gerentes y finanzas) */}
            {isGerenteOrFinanzas ? (
                <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400"><FileText size={20} /></div>
                        <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Compensación</h3></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <FloatingInput label="Salario Base (Bs.)" name="salario_base" type="number" value={formData.salario_base} onChange={handleInput} error={errores.salario_base} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Frecuencia de Pago</label>
                            <select name="frecuencia_pago" value={formData.frecuencia_pago} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                <option value="mensual">Mensual</option>
                                <option value="quincenal">Quincenal</option>
                                <option value="semanal">Semanal</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Banco</label>
                            <select name="banco" value={formData.banco} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                <option value="">Ninguno</option>
                                <option value="BNB">BNB</option>
                                <option value="Mercantil Santa Cruz">Mercantil Santa Cruz</option>
                                <option value="BCP">BCP</option>
                                <option value="Fassil">Fassil</option>
                                <option value="Económico">Económico</option>
                                <option value="Nacional de Bolivia">Nacional de Bolivia</option>
                            </select>
                        </div>
                        <FloatingInput label="Nº de Cuenta" name="numero_cuenta" value={formData.numero_cuenta} onChange={handleInput} disabled={!formData.banco} />
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Tipo de Cuenta</label>
                            <select name="tipo_cuenta" value={formData.tipo_cuenta} onChange={handleInput} disabled={!formData.banco} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                <option value="">Seleccionar...</option>
                                <option value="ahorro">Caja de Ahorro</option>
                                <option value="corriente">Cuenta Corriente</option>
                            </select>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
                    <Shield size={24} className="text-slate-400 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Sección restringida</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">No tienes permisos para ver ni editar la información salarial.</p>
                    </div>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => navigate(`/dashboard/personal/${id}`)}>Cancelar</Button>
                <Button onClick={handleSubmit} loading={saving} leftIcon={<CheckCircle size={18} />}>Guardar Cambios</Button>
            </div>
        </div>
    );
};

export default EditarPersonal;
