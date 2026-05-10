import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { ArrowLeft, Users, Building, MapPin, Briefcase, Check, Calendar } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { toast } from 'react-hot-toast';
import proyectoService from '../../../services/proyectoService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';
import api from '../../../services/api';

const CrearProyecto = () => {
    const navigate = useNavigate();
    
    const [paso, setPaso] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [zonas, setZonas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [usuarios, setUsuarios] = useState([]);

    const [datos, setDatos] = useState({
        categoria: 'social',
        nombre: '',
        descripcion: '',
        prioridad: 'media',
        cliente_id: '',
        entidad_estatal_id: '',
        zona_id: '',
        administrador_id: '',
        presupuesto_total: '',
        monto_garantia: '',
        fecha_inicio_planificada: '',
        fecha_fin_planificada: '',
        direccion_obra: '',
        observaciones: '',
    });

    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        try {
            const [zonasRes, clientesRes, entidadesRes, usuariosRes] = await Promise.all([
                zonaGeograficaService.listar(),
                api.get('/clientes', { params: { estado: 'activo', per_page: 200 } }).catch(() => ({ data: { data: [] } })),
                api.get('/entidades-estatales', { params: { estado: 'activa', per_page: 200 } }).catch(() => ({ data: { data: [] } })),
                api.get('/usuarios', { params: { estado: 'activo', per_page: 200 } }).catch(() => ({ data: { data: [] } })),
            ]);
            setZonas(zonasRes || []);
            setClientes(clientesRes.data?.data?.data || clientesRes.data?.data || []);
            setEntidades(entidadesRes.data?.data?.data || entidadesRes.data?.data || []);
            setUsuarios(usuariosRes.data?.data?.data || usuariosRes.data?.data || []);
        } catch (error) {
            console.error("Error cargando catálogos", error);
            toast.error("Error al cargar datos iniciales");
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        
        // Limpiar error del campo
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: null }));
        }

        // Lógica cruzada: limpiar contraparte al cambiar categoría
        if (name === 'categoria') {
            setDatos(prev => ({ ...prev, cliente_id: '', entidad_estatal_id: '', monto_garantia: '' }));
        }
    };

    const validarPaso1 = () => {
        const errs = {};
        if (!datos.nombre) errs.nombre = "El nombre del proyecto es obligatorio";
        if (datos.categoria === 'social' && !datos.entidad_estatal_id) errs.entidad_estatal_id = "Selecciona la entidad estatal";
        if (datos.categoria === 'privado' && !datos.cliente_id) errs.cliente_id = "Selecciona el cliente";
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const validarPaso2 = () => {
        const errs = {};
        if (!datos.presupuesto_total || parseFloat(datos.presupuesto_total) <= 0) {
            errs.presupuesto_total = "El presupuesto es obligatorio";
        }
        if (!datos.fecha_inicio_planificada) errs.fecha_inicio_planificada = "Fecha de inicio obligatoria";
        if (!datos.fecha_fin_planificada) errs.fecha_fin_planificada = "Fecha de fin obligatoria";
        if (datos.fecha_inicio_planificada && datos.fecha_fin_planificada && datos.fecha_inicio_planificada >= datos.fecha_fin_planificada) {
            errs.fecha_fin_planificada = "La fecha de fin debe ser posterior al inicio";
        }
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const nextPaso = () => {
        if (paso === 1 && !validarPaso1()) return;
        if (paso === 2 && !validarPaso2()) return;
        setPaso(p => p + 1);
    };

    const prevPaso = () => setPaso(p => p - 1);

    const handleSubmit = async () => {
        if (!validarPaso2()) {
            setPaso(2);
            return;
        }

        try {
            setGuardando(true);
            const payload = { ...datos };
            // Limpiar campos no relevantes según categoría
            if (datos.categoria === 'social') delete payload.cliente_id;
            if (datos.categoria === 'privado') { delete payload.entidad_estatal_id; delete payload.monto_garantia; }
            // Limpiar vacíos
            Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

            const res = await proyectoService.crear(payload);
            toast.success("Proyecto creado exitosamente");
            navigate(`/dashboard/proyectos/${res.data.id}`);
        } catch (error) {
            toast.error(error.message || "Ocurrió un error al crear el proyecto");
            if (error.errors) {
                setErrores(error.errors);
                // Navegar al paso con error
                if (error.errors.nombre || error.errors.entidad_estatal_id || error.errors.cliente_id) setPaso(1);
                else if (error.errors.presupuesto_total || error.errors.fecha_inicio_planificada) setPaso(2);
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title="Nuevo Proyecto"
                subtitle="Registra un nuevo proyecto de construcción en el sistema"
                icon={<Briefcase className="text-emerald-500" size={24} />}
            />

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 rounded-full transition-all duration-500"
                    style={{ width: `${((paso - 1) / 2) * 100}%` }}
                ></div>
                
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 border-white dark:border-slate-950 transition-colors duration-300
                            ${paso === step ? 'bg-emerald-500 text-white' : 
                              paso > step ? 'bg-emerald-600 text-white' : 
                              'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
                        >
                            {paso > step ? <Check size={18} /> : step}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${paso >= step ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {step === 1 ? 'Identidad' : step === 2 ? 'Planificación' : 'Resumen'}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="p-6 relative overflow-hidden">
                {/* Paso 1: Tipo e Identidad */}
                {paso === 1 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Briefcase className="text-emerald-500" /> 1. Tipo e Identidad
                        </h3>
                        
                        {/* Selector de Categoría */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div 
                                onClick={() => handleChange({target:{name:'categoria', value:'social'}})}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2
                                    ${datos.categoria === 'social' 
                                        ? 'border-cyan-500 bg-cyan-500/10' 
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <Users size={32} className={datos.categoria === 'social' ? 'text-cyan-500' : 'text-slate-400'} />
                                <span className={`font-medium ${datos.categoria === 'social' ? 'text-cyan-500' : 'text-slate-700 dark:text-slate-300'}`}>Proyecto Social</span>
                                <span className="text-xs text-slate-500 text-center">Viviendas + Entidad Estatal</span>
                            </div>
                            <div 
                                onClick={() => handleChange({target:{name:'categoria', value:'privado'}})}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2
                                    ${datos.categoria === 'privado' 
                                        ? 'border-violet-500 bg-violet-500/10' 
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'}`}
                            >
                                <Building size={32} className={datos.categoria === 'privado' ? 'text-violet-500' : 'text-slate-400'} />
                                <span className={`font-medium ${datos.categoria === 'privado' ? 'text-violet-500' : 'text-slate-700 dark:text-slate-300'}`}>Proyecto Privado</span>
                                <span className="text-xs text-slate-500 text-center">Fases + Cliente Privado</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FloatingInput
                                    label="Nombre del Proyecto *"
                                    name="nombre"
                                    value={datos.nombre}
                                    onChange={handleChange}
                                    error={errores.nombre}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción</label>
                                <textarea
                                    name="descripcion"
                                    value={datos.descripcion}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    placeholder="Descripción detallada del proyecto..."
                                />
                            </div>

                            {datos.categoria === 'social' ? (
                                <div className="md:col-span-2 animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Entidad Estatal *</label>
                                    <select
                                        name="entidad_estatal_id"
                                        value={datos.entidad_estatal_id}
                                        onChange={handleChange}
                                        className={`w-full bg-white dark:bg-slate-900 border rounded-lg p-3 text-slate-900 dark:text-white focus:ring-1 transition-colors
                                            ${errores.entidad_estatal_id ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'}`}
                                    >
                                        <option value="">Seleccione una entidad estatal...</option>
                                        {entidades.map(e => (
                                            <option key={e.id} value={e.id}>{e.nombre} {e.sigla ? `(${e.sigla})` : ''}</option>
                                        ))}
                                    </select>
                                    {errores.entidad_estatal_id && <p className="text-rose-500 text-xs mt-1">{errores.entidad_estatal_id}</p>}
                                </div>
                            ) : (
                                <div className="md:col-span-2 animate-fade-in">
                                    <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Cliente Privado *</label>
                                    <select
                                        name="cliente_id"
                                        value={datos.cliente_id}
                                        onChange={handleChange}
                                        className={`w-full bg-white dark:bg-slate-900 border rounded-lg p-3 text-slate-900 dark:text-white focus:ring-1 transition-colors
                                            ${errores.cliente_id ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'}`}
                                    >
                                        <option value="">Seleccione un cliente...</option>
                                        {clientes.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre_visible} ({c.documento_completo})</option>
                                        ))}
                                    </select>
                                    {errores.cliente_id && <p className="text-rose-500 text-xs mt-1">{errores.cliente_id}</p>}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Zona Geográfica</label>
                                <select
                                    name="zona_id"
                                    value={datos.zona_id}
                                    onChange={handleChange}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                >
                                    <option value="">Seleccione una zona (opcional)</option>
                                    {zonas.map(z => (
                                        <option key={z.id} value={z.id}>{z.nombre} ({z.departamento})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Administrador de Proyecto</label>
                                <select
                                    name="administrador_id"
                                    value={datos.administrador_id}
                                    onChange={handleChange}
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                >
                                    <option value="">Seleccione (opcional)</option>
                                    {usuarios.map(u => (
                                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido_paterno} ({u.rol?.nombre_visible || u.rol?.nombre || 'Sin rol'})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Paso 2: Planificación */}
                {paso === 2 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Calendar className="text-emerald-500" /> 2. Planificación y Presupuesto
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FloatingInput
                                label="Presupuesto Total (Bs.) *"
                                name="presupuesto_total"
                                type="number"
                                value={datos.presupuesto_total}
                                onChange={handleChange}
                                error={errores.presupuesto_total}
                            />

                            {datos.categoria === 'social' && (
                                <div className="animate-fade-in">
                                    <FloatingInput
                                        label="Monto Garantía (Bs.)"
                                        name="monto_garantia"
                                        type="number"
                                        value={datos.monto_garantia}
                                        onChange={handleChange}
                                    />
                                </div>
                            )}

                            <FloatingInput
                                label="Fecha Inicio Planificada *"
                                name="fecha_inicio_planificada"
                                type="date"
                                value={datos.fecha_inicio_planificada}
                                onChange={handleChange}
                                error={errores.fecha_inicio_planificada}
                            />
                            <FloatingInput
                                label="Fecha Fin Planificada *"
                                name="fecha_fin_planificada"
                                type="date"
                                value={datos.fecha_fin_planificada}
                                onChange={handleChange}
                                error={errores.fecha_fin_planificada}
                            />

                            <div className="md:col-span-2">
                                <FloatingInput
                                    label="Dirección de Obra"
                                    name="direccion_obra"
                                    value={datos.direccion_obra}
                                    onChange={handleChange}
                                    icon={<MapPin size={18} />}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Prioridad</label>
                                <div className="flex gap-3">
                                    {[
                                        { val: 'baja', label: 'Baja', active: 'border-slate-400 bg-slate-400/10 text-slate-300' },
                                        { val: 'media', label: 'Media', active: 'border-blue-500 bg-blue-500/10 text-blue-400' },
                                        { val: 'alta', label: 'Alta', active: 'border-amber-500 bg-amber-500/10 text-amber-400' },
                                        { val: 'critica', label: 'Crítica', active: 'border-rose-500 bg-rose-500/10 text-rose-400' },
                                    ].map(p => (
                                        <label key={p.val} className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                                            ${datos.prioridad === p.val ? p.active : 'border-slate-700 text-slate-400'}`}>
                                            <input type="radio" name="prioridad" value={p.val} checked={datos.prioridad === p.val} onChange={handleChange} className="hidden" />
                                            {p.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Observaciones</label>
                                <textarea
                                    name="observaciones"
                                    value={datos.observaciones}
                                    onChange={handleChange}
                                    rows="3"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    placeholder="Información adicional relevante..."
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Paso 3: Resumen */}
                {paso === 3 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Check className="text-emerald-500" /> 3. Resumen del Proyecto
                        </h3>

                        {/* Card Resumen */}
                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <h4 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
                                <Check size={18} className="text-emerald-500" /> Datos del Proyecto
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs">Nombre</span>
                                    <span className="text-white font-medium">{datos.nombre}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Categoría</span>
                                    <span className={`font-medium capitalize ${datos.categoria === 'social' ? 'text-cyan-400' : 'text-violet-400'}`}>
                                        {datos.categoria}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Presupuesto</span>
                                    <span className="text-white font-medium">
                                        Bs. {parseFloat(datos.presupuesto_total || 0).toLocaleString('es-BO')}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Prioridad</span>
                                    <span className="text-emerald-400 font-medium capitalize">{datos.prioridad}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs">Contraparte</span>
                                    <span className="text-white font-medium">
                                        {datos.categoria === 'social' 
                                            ? entidades.find(e => e.id == datos.entidad_estatal_id)?.nombre || '—'
                                            : clientes.find(c => c.id == datos.cliente_id)?.nombre_visible || '—'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Zona</span>
                                    <span className="text-white">{zonas.find(z => z.id == datos.zona_id)?.nombre || 'Sin zona'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Inicio</span>
                                    <span className="text-white">{datos.fecha_inicio_planificada || '—'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Fin</span>
                                    <span className="text-white">{datos.fecha_fin_planificada || '—'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navegación Stepper */}
                <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <Button 
                        variant="ghost" 
                        onClick={paso === 1 ? () => navigate('/dashboard/proyectos') : prevPaso}
                        leftIcon={<ArrowLeft size={18} />}
                        disabled={guardando}
                    >
                        {paso === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    
                    {paso < 3 ? (
                        <Button variant="primary" onClick={nextPaso}>
                            Siguiente Paso
                        </Button>
                    ) : (
                        <Button 
                            variant="primary" 
                            onClick={handleSubmit}
                            isLoading={guardando}
                            className="bg-emerald-600 hover:bg-emerald-500"
                            leftIcon={<Check size={18} />}
                        >
                            Finalizar y Crear
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CrearProyecto;
