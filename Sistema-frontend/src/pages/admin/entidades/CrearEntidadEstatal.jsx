import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { Building, ArrowLeft, Check, MapPin } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { toast } from 'react-hot-toast';
import entidadEstatalService from '../../../services/entidadEstatalService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const CrearEntidadEstatal = () => {
    const navigate = useNavigate();
    
    const [paso, setPaso] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [zonas, setZonas] = useState([]);

    const [datos, setDatos] = useState({
        nombre: '',
        sigla: '',
        nivel: 'municipal',
        nit: '',
        direccion: '',
        zona_id: '',
        telefono_principal: '',
        email_oficial: '',
        sitio_web: '',
        representante_legal: '',
        cargo_representante: '',
        tipo_proyectos_que_otorga: '',
        estado: 'activa',
        notas: ''
    });

    const [errores, setErrores] = useState({});

    useEffect(() => {
        zonaGeograficaService.listar().then(res => setZonas(res || []));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        if (errores[name]) setErrores(prev => ({ ...prev, [name]: null }));
    };

    const validarPaso1 = () => {
        const errs = {};
        if (!datos.nombre) errs.nombre = "El nombre es obligatorio";
        if (!datos.nit) errs.nit = "El NIT es obligatorio";
        if (!datos.nivel) errs.nivel = "El nivel es obligatorio";
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const nextPaso = () => {
        if (paso === 1 && !validarPaso1()) return;
        setPaso(2);
    };

    const handleSubmit = async () => {
        try {
            setGuardando(true);
            const res = await entidadEstatalService.crear(datos);
            toast.success("Entidad creada exitosamente");
            navigate(`/dashboard/entidades-estatales/${res.data.id}`);
        } catch (error) {
            toast.error(error.message || "Error al crear la entidad");
            if (error.message.includes('NIT') || error.message.includes('nombre')) {
                setPaso(1);
            }
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title="Nueva Entidad Estatal"
                subtitle="Registra una institución gubernamental para proyectos sociales"
                icon={Building}
                backTo="/dashboard/entidades-estatales"
            />

            {/* Stepper Simple (2 pasos) */}
            <div className="flex items-center justify-center mb-8 gap-8">
                <div className={`flex items-center gap-3 pb-2 border-b-2 transition-colors ${paso === 1 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${paso === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>1</div>
                    <span className="font-medium">Identificación</span>
                </div>
                <div className={`flex items-center gap-3 pb-2 border-b-2 transition-colors ${paso === 2 ? 'border-emerald-500 text-emerald-400' : 'border-slate-800 text-slate-500'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${paso === 2 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800'}`}>2</div>
                    <span className="font-medium">Contacto y Detalles</span>
                </div>
            </div>

            <Card className="p-6 overflow-hidden">
                {paso === 1 && (
                    <div className="space-y-6 animate-slide-right">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FloatingInput
                                    label="Nombre de la Institución *"
                                    name="nombre"
                                    value={datos.nombre}
                                    onChange={handleChange}
                                    error={errores.nombre}
                                    placeholder="Ej: Gobierno Autónomo Municipal de..."
                                />
                            </div>

                            <FloatingInput
                                label="Sigla Oficial"
                                name="sigla"
                                value={datos.sigla}
                                onChange={handleChange}
                                placeholder="Ej: GAMLP, FPS, AEVIVIENDA"
                            />

                            <FloatingInput
                                label="NIT *"
                                name="nit"
                                value={datos.nit}
                                onChange={handleChange}
                                error={errores.nit}
                            />

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nivel Gubernamental *</label>
                                <select
                                    name="nivel"
                                    value={datos.nivel}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="nacional">Nacional (Ministerios, Agencias)</option>
                                    <option value="departamental">Departamental (Gobernaciones)</option>
                                    <option value="municipal">Municipal (Alcaldías)</option>
                                    <option value="descentralizado">Institución Descentralizada</option>
                                    <option value="autonomo">Entidad Autónoma</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Zona Geográfica Base</label>
                                <select
                                    name="zona_id"
                                    value={datos.zona_id}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="">Seleccione una zona...</option>
                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {paso === 2 && (
                    <div className="space-y-6 animate-slide-right">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FloatingInput label="Teléfono Oficial" name="telefono_principal" value={datos.telefono_principal} onChange={handleChange} />
                            <FloatingInput label="Correo Electrónico" name="email_oficial" type="email" value={datos.email_oficial} onChange={handleChange} />
                            
                            <div className="md:col-span-2">
                                <FloatingInput label="Dirección Física" name="direccion" value={datos.direccion} onChange={handleChange} />
                            </div>

                            <FloatingInput label="Representante Legal" name="representante_legal" value={datos.representante_legal} onChange={handleChange} />
                            <FloatingInput label="Cargo del Representante" name="cargo_representante" value={datos.cargo_representante} onChange={handleChange} />
                            
                            <div className="md:col-span-2">
                                <FloatingInput label="Tipo de Proyectos que Otorga" name="tipo_proyectos_que_otorga" value={datos.tipo_proyectos_que_otorga} onChange={handleChange} placeholder="Ej: Vivienda social, electrificación, agua y saneamiento..." />
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <Button 
                        variant="ghost" 
                        onClick={paso === 1 ? () => navigate('/dashboard/entidades-estatales') : () => setPaso(1)}
                        icon={ArrowLeft}
                        disabled={guardando}
                    >
                        {paso === 1 ? 'Cancelar' : 'Anterior'}
                    </Button>
                    
                    {paso === 1 ? (
                        <Button variant="primary" onClick={nextPaso}>Siguiente Paso</Button>
                    ) : (
                        <Button variant="primary" onClick={handleSubmit} isLoading={guardando} className="bg-emerald-600 hover:bg-emerald-500" icon={Check}>
                            Finalizar y Crear
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default CrearEntidadEstatal;
