import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import rolService from '../../../services/rolService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { CheckCircle, Briefcase, UserPlus, FileText, ChevronRight, ChevronLeft } from '../../../components/icons/Icons';

const TIPOS_PERSONAL = [
    { id: 'tecnico', label: 'Técnico' }, { id: 'obrero', label: 'Obrero' },
    { id: 'trabajadora_social', label: 'Trabajadora Social' }, { id: 'administrativo', label: 'Administrativo' },
    { id: 'gerente', label: 'Gerente' }, { id: 'encargado_almacen', label: 'Encargado de Almacén' },
    { id: 'encargado_finanzas', label: 'Encargado de Finanzas' }
];

const TIPOS_CONTRATO = [
    { id: 'indefinido', label: 'Indefinido', desc: 'Contrato sin límite de tiempo' },
    { id: 'plazo_fijo', label: 'Plazo Fijo', desc: 'Contrato por tiempo definido' },
    { id: 'obra', label: 'Por Obra', desc: 'Contrato atado a proyecto' },
    { id: 'consultoria', label: 'Consultoría', desc: 'Servicios profesionales externos' }
];

const CrearPersonal = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [roles, setRoles] = useState([]);
    
    const [formData, setFormData] = useState({
        // Paso 1
        codigo_empleado: '', nombre: '', apellido_paterno: '', apellido_materno: '', 
        ci: '', ci_complemento: '', fecha_nacimiento: '', telefono: '', direccion: '',
        // Paso 2
        tipo: 'obrero', especialidad: '', categoria: '', fecha_contratacion: new Date().toISOString().split('T')[0],
        tipo_contrato: 'indefinido', estado_laboral: 'activo',
        // Paso 3
        salario_base: '', frecuencia_pago: 'mensual', banco: '', numero_cuenta: '', tipo_cuenta: '',
        // Paso 4
        crear_usuario_vinculado: false, email: '', rol_id: ''
    });

    const [errores, setErrores] = useState({});

    useEffect(() => {
        const init = async () => {
            try {
                const [codRes, rolesRes] = await Promise.all([
                    personalService.siguienteCodigo(),
                    rolService.listarTodos()
                ]);
                setFormData(p => ({ ...p, codigo_empleado: codRes.data.codigo }));
                // Filtrar roles según permisos (gerente puede todo, admin no puede crear gerente)
                const isGerente = user?.rol?.nombre === 'gerente';
                setRoles(rolesRes.data.filter(r => isGerente || r.nombre !== 'gerente'));
            } catch (e) {
                toast.error('Error al inicializar formulario');
            }
        };
        init();
    }, [user]);

    // Generar email sugerido cuando se activa crear usuario
    useEffect(() => {
        if (formData.crear_usuario_vinculado && !formData.email && formData.nombre && formData.apellido_paterno) {
            const nom = formData.nombre.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            const ape = formData.apellido_paterno.toLowerCase().replace(/[^a-z]/g, '');
            setFormData(p => ({ ...p, email: `${nom}.${ape}@cakanagf.com` }));
        }
    }, [formData.crear_usuario_vinculado, formData.nombre, formData.apellido_paterno, formData.email]);

    const handleInput = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleCheck = (e) => setFormData({ ...formData, [e.target.name]: e.target.checked });

    const validarPaso = (pasoActual) => {
        const err = {};
        if (pasoActual === 1) {
            if (!formData.nombre) err.nombre = 'Obligatorio';
            if (!formData.apellido_paterno) err.apellido_paterno = 'Obligatorio';
            if (!formData.ci) err.ci = 'Obligatorio';
        } else if (pasoActual === 2) {
            if (!formData.fecha_contratacion) err.fecha_contratacion = 'Obligatorio';
        } else if (pasoActual === 3) {
            if (!formData.salario_base || isNaN(formData.salario_base) || Number(formData.salario_base) < 0) err.salario_base = 'Monto inválido';
        } else if (pasoActual === 4 && formData.crear_usuario_vinculado) {
            if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) err.email = 'Email inválido';
            if (!formData.rol_id) err.rol_id = 'Debe seleccionar un rol';
        }
        setErrores(err);
        return Object.keys(err).length === 0;
    };

    const siguiente = () => {
        if (validarPaso(step)) setStep(s => Math.min(s + 1, 4));
        else toast.error('Por favor completa los campos obligatorios correctamente');
    };
    
    const anterior = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!validarPaso(4)) return toast.error('Corrige los errores antes de enviar');
        
        try {
            setLoading(true);
            const payload = { ...formData };
            if (payload.crear_usuario_vinculado) {
                payload.usuario_data = { email: payload.email, rol_id: payload.rol_id };
            }
            const res = await personalService.crear(payload);
            toast.success('Personal creado exitosamente');
            if (payload.crear_usuario_vinculado) toast.success('Credenciales enviadas por correo');
            navigate(`/dashboard/personal/${res.data.id}`);
        } catch (e) {
            if (e.response?.status === 422) {
                const serverErrors = e.response.data.errors || {};
                const flatErrors = {};
                Object.keys(serverErrors).forEach(key => flatErrors[key] = serverErrors[key][0]);
                setErrores(flatErrors);
                toast.error('Errores de validación');
                // Auto-navegar al paso con el error
                if (flatErrors.ci || flatErrors.nombre) setStep(1);
                else if (flatErrors.fecha_contratacion) setStep(2);
                else if (flatErrors.salario_base) setStep(3);
                else if (flatErrors['usuario_data.email']) { flatErrors.email = flatErrors['usuario_data.email']; setStep(4); }
            } else {
                toast.error(e.response?.data?.message || 'Error al crear personal');
            }
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { num: 1, label: 'Datos Personales', desc: 'Info básica e identidad' },
        { num: 2, label: 'Info Laboral', desc: 'Contrato y cargo' },
        { num: 3, label: 'Compensación', desc: 'Salario y banco' },
        { num: 4, label: 'Acceso Sistema', desc: 'Cuenta de usuario' }
    ];

    return (
        <div className="animate-fade-in pb-12 max-w-4xl mx-auto">
            <PageHeader title="Nuevo Personal" subtitle="Registra un nuevo trabajador en el sistema"
                icon={<UserPlus size={24} className="text-emerald-600 dark:text-emerald-400" />} />

            {/* Stepper Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center relative">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full z-0"></div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
                    {steps.map(s => (
                        <div key={s.num} className="relative z-10 flex flex-col items-center gap-2">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step >= s.num ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-2 border-slate-200 dark:border-slate-700'}`}>
                                {step > s.num ? <CheckCircle size={18} /> : s.num}
                            </div>
                            <div className="text-center hidden sm:block absolute top-12 w-28">
                                <p className={`text-xs font-bold ${step >= s.num ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{s.label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900/50 rounded-3xl p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/50 shadow-sm sm:mt-12">
                {/* PASO 1 */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400"><FileText size={20} /></div>
                            <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Datos Personales</h3><p className="text-sm text-slate-500 dark:text-slate-400">Identidad y contacto</p></div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Código de empleado autogenerado</p>
                            <p className="text-xl font-mono text-slate-900 dark:text-white">{formData.codigo_empleado || 'Cargando...'}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <FloatingInput label="Nombre" name="nombre" value={formData.nombre} onChange={handleInput} error={errores.nombre} />
                            <FloatingInput label="Apellido Paterno" name="apellido_paterno" value={formData.apellido_paterno} onChange={handleInput} error={errores.apellido_paterno} />
                            <FloatingInput label="Apellido Materno" name="apellido_materno" value={formData.apellido_materno} onChange={handleInput} />
                            
                            <div className="flex gap-2">
                                <div className="flex-1"><FloatingInput label="C.I." name="ci" value={formData.ci} onChange={handleInput} error={errores.ci} /></div>
                                <div className="w-20"><FloatingInput label="Ext." name="ci_complemento" value={formData.ci_complemento} onChange={handleInput} placeholder="1A" /></div>
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
                )}

                {/* PASO 2 */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400"><Briefcase size={20} /></div>
                            <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Información Laboral</h3><p className="text-sm text-slate-500 dark:text-slate-400">Contrato y cargo en la empresa</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Tipo de Personal</label>
                                <select name="tipo" value={formData.tipo} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none">
                                    {TIPOS_PERSONAL.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                                </select>
                            </div>
                            <FloatingInput label="Especialidad (Ej: Obra gruesa, Frontend)" name="especialidad" value={formData.especialidad} onChange={handleInput} />
                            <FloatingInput label="Categoría (Opcional)" name="categoria" value={formData.categoria} onChange={handleInput} placeholder="Senior, Junior, Cat A..." />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Fecha de Contratación</label>
                                <input type="date" name="fecha_contratacion" value={formData.fecha_contratacion} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none" />
                                {errores.fecha_contratacion && <span className="text-xs text-red-500 ml-1">{errores.fecha_contratacion}</span>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1 block mb-3">Tipo de Contrato</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {TIPOS_CONTRATO.map(t => (
                                    <label key={t.id} className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${formData.tipo_contrato === t.id ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 dark:border-emerald-500/50 ring-1 ring-emerald-500' : 'border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                                        <input type="radio" name="tipo_contrato" value={t.id} checked={formData.tipo_contrato === t.id} onChange={handleInput} className="mt-1 w-4 h-4 text-emerald-600" />
                                        <div><p className="text-sm font-bold text-slate-900 dark:text-white">{t.label}</p><p className="text-xs text-slate-500 dark:text-slate-400">{t.desc}</p></div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* PASO 3 */}
                {step === 3 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400"><FileText size={20} /></div>
                            <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Compensación</h3><p className="text-sm text-slate-500 dark:text-slate-400">Salario y datos bancarios</p></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <FloatingInput label="Salario Base (Bs.)" name="salario_base" type="number" value={formData.salario_base} onChange={handleInput} error={errores.salario_base} placeholder="0.00" />
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Frecuencia de Pago</label>
                                <select name="frecuencia_pago" value={formData.frecuencia_pago} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none">
                                    <option value="mensual">Mensual</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="semanal">Semanal</option>
                                </select>
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/50">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Datos Bancarios (Opcional)</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Banco</label>
                                    <select name="banco" value={formData.banco} onChange={handleInput} className="h-[46px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none">
                                        <option value="">Ninguno / Efectivo</option>
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
                    </div>
                )}

                {/* PASO 4 */}
                {step === 4 && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400"><Shield size={20} /></div>
                            <div><h3 className="text-lg font-bold text-slate-900 dark:text-white">Acceso al Sistema</h3><p className="text-sm text-slate-500 dark:text-slate-400">Crear cuenta de usuario vinculada</p></div>
                        </div>
                        
                        <label className="flex items-start gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                            <input type="checkbox" name="crear_usuario_vinculado" checked={formData.crear_usuario_vinculado} onChange={handleCheck} className="mt-1 w-5 h-5 rounded text-emerald-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" />
                            <div>
                                <p className="text-base font-bold text-slate-900 dark:text-white">Crear cuenta de sistema para este trabajador</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Si marcas esta opción, se creará un usuario con sus datos y se le enviará un correo con credenciales temporales.</p>
                            </div>
                        </label>

                        {formData.crear_usuario_vinculado && (
                            <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 p-6 animate-fade-in space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FloatingInput label="Correo electrónico (Login)" name="email" type="email" value={formData.email} onChange={handleInput} error={errores.email} />
                                    <div className="flex flex-col gap-1">
                                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">Rol en el sistema</label>
                                        <select name="rol_id" value={formData.rol_id} onChange={handleInput} className={`h-[46px] px-3 bg-white dark:bg-slate-900/50 border ${errores.rol_id ? 'border-red-500' : 'border-slate-200 dark:border-slate-700/50'} rounded-xl text-sm text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-emerald-600/50 outline-none`}>
                                            <option value="">Seleccione un rol...</option>
                                            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre_visible}</option>)}
                                        </select>
                                        {errores.rol_id && <span className="text-xs text-red-500 ml-1">{errores.rol_id}</span>}
                                    </div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-3 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                                    <strong>Importante:</strong> La contraseña temporal será enviada al correo ingresado mediante Brevo. Asegúrate de que sea un correo válido.
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Controles Stepper */}
                <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100 dark:border-slate-800/50">
                    <Button variant="ghost" onClick={step === 1 ? () => navigate('/dashboard/personal') : anterior} leftIcon={<ChevronLeft size={18} />}>
                        {step === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    {step < 4 ? (
                        <Button onClick={siguiente} rightIcon={<ChevronRight size={18} />}>Siguiente</Button>
                    ) : (
                        <Button onClick={handleSubmit} loading={loading} leftIcon={<CheckCircle size={18} />}>Crear Personal</Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CrearPersonal;
