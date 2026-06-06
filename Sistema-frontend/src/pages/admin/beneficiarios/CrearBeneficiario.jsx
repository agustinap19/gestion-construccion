import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { Users, Save } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import SelectorProyectoSocial from '../../../components/beneficiarios/SelectorProyectoSocial';
import { toast } from 'react-hot-toast';
import beneficiarioService from '../../../services/beneficiarioService';
import tipoViviendaService from '../../../services/tipoViviendaService';

const CrearBeneficiario = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [tiposVivienda, setTiposVivienda] = useState([]);
    
    const [formData, setFormData] = useState({
        proyecto_id: '',
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        ci: '',
        ci_complemento: '',
        fecha_nacimiento: '',
        estado_civil: '',
        genero: '',
        telefono_principal: '',
        telefono_alternativo: '',
        email: '',
        cantidad_familiares: '',
        personas_dependientes: '',
        ingreso_mensual_familiar: '',
        direccion_actual: '',
        direccion_terreno: '',
        latitud_terreno: '',
        longitud_terreno: '',
        tipo_vivienda_id: ''
    });

    useEffect(() => {
        const cargarTipos = async () => {
            try {
                const res = await tipoViviendaService.getAll();
                setTiposVivienda(res);
            } catch (e) {
                console.error(e);
            }
        };
        cargarTipos();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            // Clean up empty strings to null or remove them if numeric
            const payload = { ...formData };
            if (!payload.apellido_materno) delete payload.apellido_materno;
            if (!payload.ci_complemento) delete payload.ci_complemento;
            if (!payload.latitud_terreno) delete payload.latitud_terreno;
            if (!payload.longitud_terreno) delete payload.longitud_terreno;
            if (!payload.tipo_vivienda_id) delete payload.tipo_vivienda_id;

            const res = await beneficiarioService.create(payload);
            toast.success(`Beneficiario ${res.codigo_beneficiario} creado exitosamente`);
            navigate(`/dashboard/beneficiarios/${res.id}`);
        } catch (error) {
            console.error(error);
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                Object.keys(errors).forEach(key => {
                    toast.error(errors[key][0]);
                });
            } else {
                toast.error(error.response?.data?.error || "Error al crear beneficiario");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-24">
            <PageHeader 
                title="Registrar Nuevo Beneficiario" 
                subtitle="Añadir una familia al padrón de un proyecto social"
                icon={<Users className="w-8 h-8" />}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card title="Asignación de Proyecto" className="border-emerald-500/20">
                    <div className="max-w-xl">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Proyecto Social <span className="text-red-400">*</span></label>
                        <SelectorProyectoSocial 
                            value={formData.proyecto_id}
                            onChange={(val) => setFormData(prev => ({ ...prev, proyecto_id: val }))}
                        />
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Datos Personales del Titular">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FloatingInput label="Nombre(s) *" name="nombre" value={formData.nombre} onChange={handleChange} required />
                            <FloatingInput label="Apellido Paterno *" name="apellido_paterno" value={formData.apellido_paterno} onChange={handleChange} required />
                            <FloatingInput label="Apellido Materno" name="apellido_materno" value={formData.apellido_materno} onChange={handleChange} />
                            
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <FloatingInput label="CI *" name="ci" value={formData.ci} onChange={handleChange} required />
                                </div>
                                <div className="w-24">
                                    <FloatingInput label="Comp." name="ci_complemento" value={formData.ci_complemento} onChange={handleChange} placeholder="Ej: 1G" />
                                </div>
                            </div>
                            
                            <FloatingInput type="date" label="Fecha de Nacimiento" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleChange} />
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Género</label>
                                <select name="genero" value={formData.genero} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50">
                                    <option value="">Seleccionar...</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Estado Civil</label>
                                <select name="estado_civil" value={formData.estado_civil} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50">
                                    <option value="">Seleccionar...</option>
                                    <option value="soltero">Soltero/a</option>
                                    <option value="casado">Casado/a</option>
                                    <option value="divorciado">Divorciado/a</option>
                                    <option value="viudo">Viudo/a</option>
                                    <option value="union_libre">Unión Libre</option>
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card title="Contacto y Ubicación">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FloatingInput label="Teléfono Principal" name="telefono_principal" value={formData.telefono_principal} onChange={handleChange} />
                            <FloatingInput label="Teléfono Alternativo" name="telefono_alternativo" value={formData.telefono_alternativo} onChange={handleChange} />
                            <div className="md:col-span-2">
                                <FloatingInput type="email" label="Correo Electrónico" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Dirección Actual de Vivienda</label>
                                <textarea name="direccion_actual" value={formData.direccion_actual} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200" rows="2"></textarea>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Dirección del Terreno (Proyecto)</label>
                                <textarea name="direccion_terreno" value={formData.direccion_terreno} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200" rows="2"></textarea>
                            </div>
                            <FloatingInput type="number" step="0.0000001" label="Latitud" name="latitud_terreno" value={formData.latitud_terreno} onChange={handleChange} />
                            <FloatingInput type="number" step="0.0000001" label="Longitud" name="longitud_terreno" value={formData.longitud_terreno} onChange={handleChange} />
                        </div>
                    </Card>

                    <Card title="Información Socioeconómica">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FloatingInput type="number" label="Total Familiares" name="cantidad_familiares" value={formData.cantidad_familiares} onChange={handleChange} min="1" />
                            <FloatingInput type="number" label="Dependientes" name="personas_dependientes" value={formData.personas_dependientes} onChange={handleChange} min="0" />
                            <FloatingInput type="number" step="0.01" label="Ingreso Mensual (Bs.)" name="ingreso_mensual_familiar" value={formData.ingreso_mensual_familiar} onChange={handleChange} min="0" />
                        </div>
                    </Card>

                    <Card title="Vivienda y Clasificación">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Vivienda Asignada</label>
                                <select name="tipo_vivienda_id" value={formData.tipo_vivienda_id} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50">
                                    <option value="">No asignar por ahora...</option>
                                    {tiposVivienda.map(tv => (
                                        <option key={tv.id} value={tv.id}>{tv.nombre} ({tv.metros_cuadrados}m²)</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-800">
                    <Button variant="ghost" type="button" onClick={() => navigate('/dashboard/beneficiarios')}>
                        Cancelar
                    </Button>
                    <Button variant="primary" type="submit" isLoading={loading} disabled={!formData.proyecto_id || !formData.nombre || !formData.ci}>
                        <Save className="w-5 h-5 mr-2" />
                        Guardar Beneficiario
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default CrearBeneficiario;
