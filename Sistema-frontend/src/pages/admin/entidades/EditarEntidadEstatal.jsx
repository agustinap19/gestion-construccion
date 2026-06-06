import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { Building, Edit, Save } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import { toast } from 'react-hot-toast';
import entidadEstatalService from '../../../services/entidadEstatalService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';

const EditarEntidadEstatal = () => {
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
            const [resEnt, resZonas] = await Promise.all([
                entidadEstatalService.obtener(id),
                zonaGeograficaService.listar()
            ]);
            
            const prefill = {};
            for (const key in resEnt.entidad) {
                prefill[key] = resEnt.entidad[key] === null ? '' : resEnt.entidad[key];
            }
            
            setDatos(prefill);
            setZonas(resZonas || []);
        } catch (error) {
            toast.error("Error al cargar datos");
            navigate('/dashboard/entidades-estatales');
        } finally {
            setCargando(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        if (errores[name]) setErrores(prev => ({ ...prev, [name]: null }));
    };

    const validar = () => {
        const errs = {};
        if (!datos.nombre) errs.nombre = "Obligatorio";
        if (!datos.nit) errs.nit = "Obligatorio";
        if (!datos.nivel) errs.nivel = "Obligatorio";
        
        setErrores(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validar()) return;

        try {
            setGuardando(true);
            await entidadEstatalService.actualizar(id, datos);
            toast.success("Entidad actualizada");
            navigate(`/dashboard/entidades-estatales/${id}`);
        } catch (error) {
            toast.error(error.message || "Error al actualizar");
            if (error.message.includes('NIT') || error.message.includes('nombre')) {
                setErrores({ nit: error.message, nombre: error.message });
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
                title={`Editar Entidad: ${datos.sigla || datos.nombre}`}
                icon={Edit}
                backTo={`/dashboard/entidades-estatales/${id}`}
            />

            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-lg font-medium text-white mb-6 border-b border-slate-700 pb-2">Identificación</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <FloatingInput
                                    label="Nombre de la Institución *"
                                    name="nombre"
                                    value={datos.nombre}
                                    onChange={handleChange}
                                    error={errores.nombre}
                                />
                            </div>

                            <FloatingInput
                                label="Sigla Oficial"
                                name="sigla"
                                value={datos.sigla}
                                onChange={handleChange}
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
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="nacional">Nacional</option>
                                    <option value="departamental">Departamental</option>
                                    <option value="municipal">Municipal</option>
                                    <option value="descentralizado">Descentralizado</option>
                                    <option value="autonomo">Autónomo</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Zona Geográfica Base</label>
                                <select
                                    name="zona_id"
                                    value={datos.zona_id || ''}
                                    onChange={handleChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500"
                                >
                                    <option value="">Seleccione una zona...</option>
                                    {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                </select>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-lg font-medium text-white mb-6 border-b border-slate-700 pb-2">Contacto y Detalles</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FloatingInput label="Teléfono Oficial" name="telefono_principal" value={datos.telefono_principal} onChange={handleChange} />
                            <FloatingInput label="Correo Electrónico" name="email_oficial" type="email" value={datos.email_oficial} onChange={handleChange} />
                            
                            <div className="md:col-span-2">
                                <FloatingInput label="Dirección Física" name="direccion" value={datos.direccion} onChange={handleChange} />
                            </div>

                            <FloatingInput label="Representante Legal" name="representante_legal" value={datos.representante_legal} onChange={handleChange} />
                            <FloatingInput label="Cargo del Representante" name="cargo_representante" value={datos.cargo_representante} onChange={handleChange} />
                            
                            <div className="md:col-span-2">
                                <FloatingInput label="Tipo de Proyectos que Otorga" name="tipo_proyectos_que_otorga" value={datos.tipo_proyectos_que_otorga} onChange={handleChange} />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Notas u Observaciones</label>
                                <textarea
                                    name="notas"
                                    value={datos.notas}
                                    onChange={handleChange}
                                    rows="2"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <Button type="button" variant="ghost" onClick={() => navigate(`/dashboard/entidades-estatales/${id}`)} disabled={guardando}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-500" icon={Save} isLoading={guardando}>
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditarEntidadEstatal;
