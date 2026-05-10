import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader';
import { ArrowLeft, Briefcase, Save, MapPin } from '../../../components/icons/Icons';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import FloatingInput from '../../../components/ui/FloatingInput';
import Skeleton from '../../../components/ui/Skeleton';
import { toast } from 'react-hot-toast';
import proyectoService from '../../../services/proyectoService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';
import api from '../../../services/api';

const EditarProyecto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [datos, setDatos] = useState({});
    const [zonas, setZonas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [errores, setErrores] = useState({});

    useEffect(() => { cargar(); }, [id]);

    const cargar = async () => {
        try {
            setCargando(true);
            const [res, zonasRes, usuariosRes] = await Promise.all([
                proyectoService.obtener(id),
                zonaGeograficaService.listar(),
                api.get('/usuarios', { params: { estado: 'activo', per_page: 200 } }).catch(() => ({ data: { data: [] } })),
            ]);
            const p = res.proyecto;
            setDatos({
                nombre: p.nombre || '', descripcion: p.descripcion || '', prioridad: p.prioridad || 'media',
                zona_id: p.zona_id || '', administrador_id: p.administrador_id || '',
                presupuesto_total: p.presupuesto_total || '', monto_garantia: p.monto_garantia || '',
                fecha_inicio_planificada: p.fecha_inicio_planificada || '', fecha_fin_planificada: p.fecha_fin_planificada || '',
                fecha_inicio_real: p.fecha_inicio_real || '', fecha_fin_real: p.fecha_fin_real || '',
                direccion_obra: p.direccion_obra || '', observaciones: p.observaciones || '',
                _categoria: p.categoria, _codigo: p.codigo, _nombre_visible: p.nombre,
            });
            setZonas(zonasRes || []);
            setUsuarios(usuariosRes.data?.data?.data || usuariosRes.data?.data || []);
        } catch (error) {
            toast.error("Error al cargar el proyecto");
            navigate('/dashboard/proyectos');
        } finally { setCargando(false); }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setDatos(prev => ({ ...prev, [name]: value }));
        if (errores[name]) setErrores(prev => ({ ...prev, [name]: null }));
    };

    const handleSubmit = async () => {
        try {
            setGuardando(true);
            const payload = { ...datos };
            delete payload._categoria; delete payload._codigo; delete payload._nombre_visible;
            Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
            await proyectoService.actualizar(id, payload);
            toast.success("Proyecto actualizado exitosamente");
            navigate(`/dashboard/proyectos/${id}`);
        } catch (error) {
            toast.error(error.message || "Error al actualizar el proyecto");
            if (error.errors) setErrores(error.errors);
        } finally { setGuardando(false); }
    };

    if (cargando) {
        return (
            <div className="space-y-6 animate-pulse">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <PageHeader
                title={`Editar: ${datos._nombre_visible}`}
                subtitle={<span className="flex items-center gap-2"><span className="font-mono text-emerald-500">{datos._codigo}</span><span className={`text-xs capitalize ${datos._categoria === 'social' ? 'text-cyan-400' : 'text-violet-400'}`}>{datos._categoria}</span></span>}
                icon={<Briefcase className="text-emerald-500" size={24} />}
            />

            <Card className="p-6 relative overflow-hidden">
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <FloatingInput label="Nombre del Proyecto *" name="nombre" value={datos.nombre} onChange={handleChange} error={errores.nombre} />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-400 mb-1">Descripción</label>
                            <textarea name="descripcion" value={datos.descripcion} onChange={handleChange} rows="3"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors" />
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
                            <label className="block text-sm font-medium text-slate-400 mb-1">Zona Geográfica</label>
                            <select name="zona_id" value={datos.zona_id} onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors">
                                <option value="">— Sin zona —</option>
                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre} ({z.departamento})</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Administrador</label>
                            <select name="administrador_id" value={datos.administrador_id} onChange={handleChange}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors">
                                <option value="">— Sin asignar —</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido_paterno}</option>)}
                            </select>
                        </div>

                        <FloatingInput label="Presupuesto Total (Bs.)" name="presupuesto_total" type="number" value={datos.presupuesto_total} onChange={handleChange} error={errores.presupuesto_total} />
                        {datos._categoria === 'social' && (
                            <FloatingInput label="Monto Garantía (Bs.)" name="monto_garantia" type="number" value={datos.monto_garantia} onChange={handleChange} />
                        )}
                    </div>

                    <div className="border-t border-slate-700/50 pt-6 mt-2">
                        <h4 className="text-white font-medium mb-4">Fechas</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FloatingInput label="Inicio Plan." name="fecha_inicio_planificada" type="date" value={datos.fecha_inicio_planificada} onChange={handleChange} />
                            <FloatingInput label="Fin Plan." name="fecha_fin_planificada" type="date" value={datos.fecha_fin_planificada} onChange={handleChange} />
                            <FloatingInput label="Inicio Real" name="fecha_inicio_real" type="date" value={datos.fecha_inicio_real} onChange={handleChange} />
                            <FloatingInput label="Fin Real" name="fecha_fin_real" type="date" value={datos.fecha_fin_real} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="border-t border-slate-700/50 pt-6 mt-2">
                        <FloatingInput label="Dirección de Obra" name="direccion_obra" value={datos.direccion_obra} onChange={handleChange} icon={<MapPin size={18} />} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Observaciones</label>
                        <textarea name="observaciones" value={datos.observaciones} onChange={handleChange} rows="3"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            placeholder="Información adicional..." />
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <Button variant="ghost" onClick={() => navigate(`/dashboard/proyectos/${id}`)} leftIcon={<ArrowLeft size={18} />} disabled={guardando}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} isLoading={guardando} className="bg-emerald-600 hover:bg-emerald-500" leftIcon={<Save size={18} />}>
                        Guardar Cambios
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default EditarProyecto;
