import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { ArrowLeft, Users, Building, MapPin, Mail, Briefcase, Check } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { toast } from 'react-hot-toast';
import clienteService from '../../../services/clienteService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const CrearCliente = () => {
    const navigate = useNavigate();
    
    const [paso, setPaso] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [zonas, setZonas] = useState([]);
    const [clientesReferentes, setClientesReferentes] = useState([]);

    const [datos, setDatos] = useState({
        tipo: 'persona_natural',
        nombre_completo: '',
        nombre_comercial: '',
        documento_tipo: 'ci',
        documento_numero: '',
        documento_complemento: '',
        email: '',
        telefono_principal: '',
        telefono_alternativo: '',
        direccion: '',
        zona_id: '',
        representante_legal: '',
        cargo_representante: '',
        sector: '',
        origen: 'directo',
        cliente_referido_por: '',
        estado: 'activo',
        notas: ''
    });

    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        try {
            const [zonasRes, clientesRes] = await Promise.all([
                zonaGeograficaService.listar(),
                clienteService.listar({ estado: 'activo' }, 1, 100) // Obtener posibles referentes
            ]);
            setZonas(zonasRes || []);
            setClientesReferentes(clientesRes?.data || []);
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

        // Lógica cruzada automática
        if (name === 'tipo') {
            if (value === 'empresa') {
                setDatos(prev => ({ ...prev, documento_tipo: 'nit' }));
            } else {
                setDatos(prev => ({ ...prev, documento_tipo: 'ci' }));
            }
        }
    };

    const validarPaso1 = () => {
        const errs = {};
        if (!datos.nombre_completo) errs.nombre_completo = "El nombre es obligatorio";
        if (datos.tipo === 'empresa' && !datos.nombre_comercial) errs.nombre_comercial = "Nombre comercial obligatorio";
        if (!datos.documento_numero) errs.documento_numero = "Número de documento obligatorio";
        
        if (datos.tipo === 'empresa' && datos.documento_tipo !== 'nit') {
            errs.documento_tipo = "Las empresas deben usar NIT";
        }
        if (datos.tipo === 'persona_natural' && datos.documento_tipo === 'nit') {
            errs.documento_tipo = "Personas naturales no pueden usar NIT";
        }

        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const validarPaso2 = () => {
        const errs = {};
        if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
            errs.email = "Correo electrónico inválido";
        }
        if (datos.tipo === 'empresa' && !datos.representante_legal) {
            errs.representante_legal = "Representante legal obligatorio para empresas";
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
            const res = await clienteService.crear(datos);
            toast.success("Cliente creado exitosamente");
            navigate(`/dashboard/clientes/${res.data.id}`);
        } catch (error) {
            toast.error(error.message || "Ocurrió un error al crear el cliente");
            if (error.message.includes('documento')) {
                setPaso(1);
                setErrores({ documento_numero: error.message });
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title="Nuevo Cliente"
                subtitle="Registra un nuevo cliente privado en el sistema"
                icon={Briefcase}
                backTo="/dashboard/clientes"
            />

            {/* Stepper Header */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-10 rounded-full"></div>
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 -z-10 rounded-full transition-all duration-500"
                    style={{ width: `${((paso - 1) / 2) * 100}%` }}
                ></div>
                
                {[1, 2, 3].map((step) => (
                    <div key={step} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-4 border-slate-950 transition-colors duration-300
                            ${paso === step ? 'bg-emerald-500 text-white' : 
                              paso > step ? 'bg-emerald-600 text-white' : 
                              'bg-slate-800 text-slate-500'}`}
                        >
                            {paso > step ? <Check size={18} /> : step}
                        </div>
                        <span className={`text-xs mt-2 font-medium ${paso >= step ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {step === 1 ? 'Identidad' : step === 2 ? 'Contacto' : 'Origen'}
                        </span>
                    </div>
                ))}
            </div>

            <Card className="p-6 relative overflow-hidden">
                {/* Paso 1: Identidad */}
                {paso === 1 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Users className="text-emerald-500" /> 1. Tipo e Identidad
                        </h3>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div 
                                onClick={() => handleChange({target:{name:'tipo', value:'persona_natural'}})}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2
                                    ${datos.tipo === 'persona_natural' 
                                        ? 'border-emerald-500 bg-emerald-500/10' 
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                            >
                                <Users size={32} className={datos.tipo === 'persona_natural' ? 'text-emerald-500' : 'text-slate-400'} />
                                <span className={`font-medium ${datos.tipo === 'persona_natural' ? 'text-emerald-500' : 'text-slate-300'}`}>Persona Natural</span>
                            </div>
                            <div 
                                onClick={() => handleChange({target:{name:'tipo', value:'empresa'}})}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center gap-2
                                    ${datos.tipo === 'empresa' 
                                        ? 'border-blue-500 bg-blue-500/10' 
                                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'}`}
                            >
                                <Building size={32} className={datos.tipo === 'empresa' ? 'text-blue-500' : 'text-slate-400'} />
                                <span className={`font-medium ${datos.tipo === 'empresa' ? 'text-blue-500' : 'text-slate-300'}`}>Empresa</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FloatingInput
                                    label={datos.tipo === 'empresa' ? 'Razón Social *' : 'Nombre Completo *'}
                                    name="nombre_completo"
                                    value={datos.nombre_completo}
                                    onChange={handleChange}
                                    error={errores.nombre_completo}
                                />
                            </div>

                            {datos.tipo === 'empresa' && (
                                <div className="md:col-span-2 animate-fade-in">
                                    <FloatingInput
                                        label="Nombre Comercial *"
                                        name="nombre_comercial"
                                        value={datos.nombre_comercial}
                                        onChange={handleChange}
                                        error={errores.nombre_comercial}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Documento *</label>
                                <select
                                    name="documento_tipo"
                                    value={datos.documento_tipo}
                                    onChange={handleChange}
                                    className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:ring-1 transition-colors
                                        ${errores.documento_tipo ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:border-emerald-500 focus:ring-emerald-500'}`}
                                >
                                    {datos.tipo === 'persona_natural' ? (
                                        <>
                                            <option value="ci">Carnet de Identidad (C.I.)</option>
                                            <option value="pasaporte">Pasaporte</option>
                                            <option value="rut_extranjero">RUT / Doc Extranjero</option>
                                        </>
                                    ) : (
                                        <option value="nit">NIT (Número de Identificación Tributaria)</option>
                                    )}
                                </select>
                                {errores.documento_tipo && <p className="text-rose-500 text-xs mt-1">{errores.documento_tipo}</p>}
                            </div>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <FloatingInput
                                        label="Número de Documento *"
                                        name="documento_numero"
                                        value={datos.documento_numero}
                                        onChange={handleChange}
                                        error={errores.documento_numero}
                                    />
                                </div>
                                {datos.documento_tipo === 'ci' && (
                                    <div className="w-24">
                                        <FloatingInput
                                            label="Ext."
                                            name="documento_complemento"
                                            value={datos.documento_complemento}
                                            onChange={handleChange}
                                            placeholder="LP"
                                            maxLength={5}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Paso 2: Contacto y Ubicación */}
                {paso === 2 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <MapPin className="text-emerald-500" /> 2. Contacto y Ubicación
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FloatingInput
                                label="Correo Electrónico"
                                name="email"
                                type="email"
                                value={datos.email}
                                onChange={handleChange}
                                error={errores.email}
                                icon={<Mail size={18} />}
                            />
                            
                            <div className="flex gap-4">
                                <FloatingInput
                                    label="Teléfono Principal"
                                    name="telefono_principal"
                                    value={datos.telefono_principal}
                                    onChange={handleChange}
                                    className="flex-1"
                                />
                                <FloatingInput
                                    label="Tel. Alternativo"
                                    name="telefono_alternativo"
                                    value={datos.telefono_alternativo}
                                    onChange={handleChange}
                                    className="flex-1"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Zona Geográfica</label>
                                <select
                                    name="zona_id"
                                    value={datos.zona_id}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                >
                                    <option value="">Seleccione una zona (opcional)</option>
                                    {zonas.map(z => (
                                        <option key={z.id} value={z.id}>{z.nombre} ({z.departamento})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Dirección Física</label>
                                <textarea
                                    name="direccion"
                                    value={datos.direccion}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                    placeholder="Calle, número, detalles..."
                                />
                            </div>

                            {datos.tipo === 'empresa' && (
                                <>
                                    <div className="border-t border-slate-700/50 md:col-span-2 pt-4 mt-2">
                                        <h4 className="text-white font-medium mb-4">Datos del Representante Legal</h4>
                                    </div>
                                    <FloatingInput
                                        label="Nombre del Representante *"
                                        name="representante_legal"
                                        value={datos.representante_legal}
                                        onChange={handleChange}
                                        error={errores.representante_legal}
                                    />
                                    <FloatingInput
                                        label="Cargo"
                                        name="cargo_representante"
                                        value={datos.cargo_representante}
                                        onChange={handleChange}
                                        placeholder="Ej: Gerente General"
                                    />
                                    <FloatingInput
                                        label="Sector Industrial"
                                        name="sector"
                                        value={datos.sector}
                                        onChange={handleChange}
                                        placeholder="Ej: Construcción, Minería..."
                                    />
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Paso 3: Origen y Observaciones */}
                {paso === 3 && (
                    <div className="space-y-6 animate-slide-right">
                        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                            <Briefcase className="text-emerald-500" /> 3. Origen y Estado
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-3">Origen del Cliente</label>
                                <div className="space-y-2">
                                    {['directo', 'referido', 'sitio_web', 'licitacion', 'otro'].map((orig) => (
                                        <label key={orig} className="flex items-center p-3 rounded-lg border border-slate-700 hover:bg-slate-800/50 cursor-pointer transition-colors">
                                            <input 
                                                type="radio" 
                                                name="origen" 
                                                value={orig}
                                                checked={datos.origen === orig}
                                                onChange={handleChange}
                                                className="w-4 h-4 text-emerald-500 bg-slate-900 border-slate-600 focus:ring-emerald-500 focus:ring-offset-slate-900" 
                                            />
                                            <span className="ml-3 text-slate-300 capitalize">{orig.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6">
                                {datos.origen === 'referido' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-slate-400 mb-1">Cliente Referente</label>
                                        <select
                                            name="cliente_referido_por"
                                            value={datos.cliente_referido_por}
                                            onChange={handleChange}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                        >
                                            <option value="">Seleccione un cliente...</option>
                                            {clientesReferentes.map(c => (
                                                <option key={c.id} value={c.id}>{c.nombre_visible} ({c.documento_completo})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-3">Estado Inicial</label>
                                    <div className="flex gap-4">
                                        <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${datos.estado === 'activo' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>
                                            <input type="radio" name="estado" value="activo" checked={datos.estado === 'activo'} onChange={handleChange} className="hidden" />
                                            Activo
                                        </label>
                                        <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${datos.estado === 'potencial' ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 text-slate-400'}`}>
                                            <input type="radio" name="estado" value="potencial" checked={datos.estado === 'potencial'} onChange={handleChange} className="hidden" />
                                            Potencial
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-1">Notas Internas</label>
                                    <textarea
                                        name="notas"
                                        value={datos.notas}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                        placeholder="Información adicional relevante..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card Resumen */}
                        <div className="mt-8 bg-slate-900 border border-slate-700 rounded-xl p-4">
                            <h4 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
                                <Check size={18} className="text-emerald-500" /> Resumen de Registro
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-500 block text-xs">Identidad</span>
                                    <span className="text-white font-medium">{datos.nombre_comercial || datos.nombre_completo}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Documento</span>
                                    <span className="text-white uppercase font-medium">{datos.documento_tipo} {datos.documento_numero}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Contacto</span>
                                    <span className="text-white">{datos.telefono_principal || 'Sin teléfono'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-500 block text-xs">Clasificación</span>
                                    <span className="text-emerald-400 font-medium capitalize">{datos.estado} - {datos.origen}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navegación Stepper */}
                <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <Button 
                        variant="ghost" 
                        onClick={paso === 1 ? () => navigate('/dashboard/clientes') : prevPaso}
                        icon={ArrowLeft}
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
                            icon={Check}
                        >
                            Finalizar y Crear
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CrearCliente;
