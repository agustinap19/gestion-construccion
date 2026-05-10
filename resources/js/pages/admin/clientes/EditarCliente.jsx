import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { Briefcase, ArrowLeft, Save } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { toast } from 'react-hot-toast';
import clienteService from '../../../services/clienteService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const EditarCliente = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [zonas, setZonas] = useState([]);
    
    const [datos, setDatos] = useState(null);
    const [errores, setErrores] = useState({});

    useEffect(() => {
        cargarDatos();
    }, [id]);

    const cargarDatos = async () => {
        try {
            setCargando(true);
            const [clienteRes, zonasRes] = await Promise.all([
                clienteService.obtener(id),
                zonaGeograficaService.listar()
            ]);
            
            // Rellenar nulos con strings vacíos para inputs
            const cli = clienteRes.cliente;
            const prefill = {};
            for (const key in cli) {
                prefill[key] = cli[key] === null ? '' : cli[key];
            }
            
            setDatos(prefill);
            setZonas(zonasRes || []);
        } catch (error) {
            toast.error("Error al cargar datos");
            navigate('/dashboard/clientes');
        } finally {
            setCargando(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        if (errores[name]) {
            setErrores(prev => ({ ...prev, [name]: null }));
        }

        // Reglas cruzadas UI
        if (name === 'tipo') {
            if (value === 'empresa') {
                setDatos(prev => ({ ...prev, documento_tipo: 'nit' }));
            } else if (value === 'persona_natural' && datos.documento_tipo === 'nit') {
                setDatos(prev => ({ ...prev, documento_tipo: 'ci' }));
            }
        }
    };

    const validar = () => {
        const errs = {};
        if (!datos.nombre_completo) errs.nombre_completo = "Obligatorio";
        if (datos.tipo === 'empresa' && !datos.nombre_comercial) errs.nombre_comercial = "Obligatorio";
        if (!datos.documento_numero) errs.documento_numero = "Obligatorio";
        
        if (datos.tipo === 'empresa' && datos.documento_tipo !== 'nit') {
            errs.documento_tipo = "Empresas deben usar NIT";
        }
        if (datos.tipo === 'persona_natural' && datos.documento_tipo === 'nit') {
            errs.documento_tipo = "Personas no pueden usar NIT";
        }

        if (datos.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email)) {
            errs.email = "Inválido";
        }
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validar()) {
            toast.error("Revisa los errores en el formulario");
            return;
        }

        try {
            setGuardando(true);
            await clienteService.actualizar(id, datos);
            toast.success("Cliente actualizado exitosamente");
            navigate(`/dashboard/clientes/${id}`);
        } catch (error) {
            toast.error(error.message || "Error al actualizar");
            if (error.message.includes('documento')) {
                setErrores(prev => ({...prev, documento_numero: error.message}));
            }
        } finally {
            setGuardando(false);
        }
    };

    if (cargando || !datos) {
        return <div className="p-8 text-center text-slate-400">Cargando...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title={`Editar Cliente: ${datos.nombre_comercial || datos.nombre_completo}`}
                icon={Edit}
                backTo={`/dashboard/clientes/${id}`}
            />

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-medium text-white mb-6 border-b border-slate-700 pb-2">Identidad y Clasificación</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Tipo de Cliente *</label>
                                <select
                                    name="tipo"
                                    value={datos.tipo}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="persona_natural">Persona Natural</option>
                                    <option value="empresa">Empresa</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Origen</label>
                                <select
                                    name="origen"
                                    value={datos.origen}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="directo">Directo</option>
                                    <option value="referido">Referido</option>
                                    <option value="sitio_web">Sitio Web</option>
                                    <option value="licitacion">Licitación</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

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
                                <div className="md:col-span-2">
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
                                    className={`w-full bg-slate-900 border rounded-lg p-3 text-white focus:ring-1 
                                        ${errores.documento_tipo ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700 focus:ring-emerald-500'}`}
                                >
                                    {datos.tipo === 'persona_natural' ? (
                                        <>
                                            <option value="ci">C.I.</option>
                                            <option value="pasaporte">Pasaporte</option>
                                            <option value="rut_extranjero">RUT / Doc Extranjero</option>
                                        </>
                                    ) : (
                                        <option value="nit">NIT</option>
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
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-medium text-white mb-6 border-b border-slate-700 pb-2">Contacto y Ubicación</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FloatingInput
                                label="Correo Electrónico"
                                name="email"
                                type="email"
                                value={datos.email}
                                onChange={handleChange}
                                error={errores.email}
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
                                    value={datos.zona_id || ''}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>

                            {datos.tipo === 'empresa' && (
                                <>
                                    <FloatingInput
                                        label="Nombre del Representante"
                                        name="representante_legal"
                                        value={datos.representante_legal}
                                        onChange={handleChange}
                                    />
                                    <FloatingInput
                                        label="Cargo"
                                        name="cargo_representante"
                                        value={datos.cargo_representante}
                                        onChange={handleChange}
                                    />
                                    <FloatingInput
                                        label="Sector Industrial"
                                        name="sector"
                                        value={datos.sector}
                                        onChange={handleChange}
                                    />
                                </>
                            )}
                        </div>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <Button 
                            type="button"
                            variant="ghost" 
                            onClick={() => navigate(`/dashboard/clientes/${id}`)}
                            disabled={guardando}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit"
                            variant="primary" 
                            className="bg-emerald-600 hover:bg-emerald-500"
                            icon={Save}
                            isLoading={guardando}
                        >
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditarCliente;
