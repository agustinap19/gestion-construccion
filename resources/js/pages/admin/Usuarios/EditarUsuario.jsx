import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import PageHeader from '../../../components/layout/PageHeader';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import FloatingInput from '../../../components/ui/FloatingInput';
import Skeleton from '../../../components/ui/Skeleton';
import { Users, ArrowLeft, Edit, Info } from '../../../components/icons/Icons';

const EditarUsuario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [usuario, setUsuario] = useState(null);
    const [errores, setErrores] = useState({});
    const [tienePersonal, setTienePersonal] = useState(false);
    const esGerente = user?.rol?.nombre === 'gerente';

    const [form, setForm] = useState({
        nombre: '', apellido_paterno: '', apellido_materno: '', ci: '', ci_complemento: '',
        telefono: '', fecha_nacimiento: '', direccion: '',
    });

    useEffect(() => {
        const cargar = async () => {
            try {
                setLoading(true);
                const res = await usuarioService.obtener(id);
                const u = res.data.usuario;
                setUsuario(u);
                setForm({
                    nombre: u.nombre || '', apellido_paterno: u.apellido_paterno || '',
                    apellido_materno: u.apellido_materno || '', ci: u.ci || '',
                    ci_complemento: u.ci_complemento || '', telefono: u.telefono || '',
                    fecha_nacimiento: u.fecha_nacimiento ? u.fecha_nacimiento.split('T')[0] : '',
                    direccion: u.direccion || '',
                });
                // Check if has linked personal
                // Simple check: we don't have a direct endpoint, so just show info note
                setTienePersonal(false); // Would need a dedicated check
            } catch { toast.error('Error al cargar usuario'); navigate('/dashboard/usuarios'); }
            finally { setLoading(false); }
        };
        cargar();
    }, [id, navigate]);

    const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

    const validar = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Obligatorio';
        if (!form.ci.trim()) e.ci = 'Obligatorio';
        setErrores(e); return Object.keys(e).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        try {
            setGuardando(true);
            await usuarioService.actualizar(id, form);
            toast.success('Usuario actualizado exitosamente');
            navigate(`/dashboard/usuarios/${id}`);
        } catch (e) {
            if (e.response?.data?.errors) setErrores(e.response.data.errors);
            toast.error(e.response?.data?.message || 'Error al actualizar');
        } finally { setGuardando(false); }
    };

    if (loading) return <div className="animate-fade-in space-y-4"><Skeleton width="200px" height="1.5rem" /><Skeleton width="100%" height="300px" /></div>;
    if (!usuario) return null;

    const FieldErr = ({ name }) => errores[name] ? <p className="text-xs text-red-500 -mt-2 mb-2 pl-1">{Array.isArray(errores[name]) ? errores[name][0] : errores[name]}</p> : null;

    return (
        <div className="animate-fade-in">
            <button onClick={() => navigate(`/dashboard/usuarios/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors mb-4"><ArrowLeft size={16} /> Volver al detalle</button>

            <PageHeader title={`Editar: ${usuario.nombre} ${usuario.apellido_paterno}`}
                subtitle="Modifica los datos personales del usuario"
                icon={<Edit size={24} className="text-emerald-600 dark:text-emerald-400" />} />

            <div className="max-w-3xl mx-auto space-y-5 mt-6">
                {/* Email (solo lectura) */}
                <Card title="Datos de Acceso (Solo lectura)">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Email</label>
                            <div className="h-[42px] px-3 flex items-center bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed">
                                {usuario.email}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">El email no se puede cambiar por seguridad.</p>
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Rol</label>
                            <div className="h-[42px] px-3 flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm cursor-not-allowed">
                                <Badge variant="info">{usuario.rol?.nombre_visible}</Badge>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">El rol se cambia desde el detalle del usuario.</p>
                        </div>
                    </div>
                </Card>

                {/* Datos personales */}
                <Card title="Datos Personales">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <div><FloatingInput label="Nombre *" value={form.nombre} onChange={e => set('nombre', e.target.value)} error={!!errores.nombre} /><FieldErr name="nombre" /></div>
                        <div><FloatingInput label="Apellido paterno *" value={form.apellido_paterno} onChange={e => set('apellido_paterno', e.target.value)} error={!!errores.apellido_paterno} /><FieldErr name="apellido_paterno" /></div>
                        <div><FloatingInput label="Apellido materno" value={form.apellido_materno} onChange={e => set('apellido_materno', e.target.value)} /></div>
                        <div className="flex gap-2">
                            <div className="flex-1"><FloatingInput label={`CI *${!esGerente ? ' (solo gerente edita)' : ''}`} value={form.ci} onChange={e => set('ci', e.target.value)} disabled={!esGerente} error={!!errores.ci} /><FieldErr name="ci" /></div>
                            <div className="w-24"><FloatingInput label="Compl." value={form.ci_complemento} onChange={e => set('ci_complemento', e.target.value)} disabled={!esGerente} /></div>
                        </div>
                    </div>
                </Card>

                {/* Contacto */}
                <Card title="Contacto y Ubicación">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <div><FloatingInput label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} /></div>
                        <div><FloatingInput label="Fecha nacimiento" type="date" value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} /></div>
                        <div className="sm:col-span-2"><FloatingInput label="Dirección" value={form.direccion} onChange={e => set('direccion', e.target.value)} /></div>
                    </div>
                </Card>

                {/* Nota personal vinculado */}
                {tienePersonal && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/10 flex items-start gap-3">
                        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">Este usuario tiene ficha de personal vinculada. Para editar datos laborales ve a <strong>Gestión de Personal</strong>.</p>
                    </div>
                )}

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onClick={() => navigate(`/dashboard/usuarios/${id}`)}>Cancelar</Button>
                    <Button onClick={handleGuardar} loading={guardando}>Guardar cambios</Button>
                </div>
            </div>
        </div>
    );
};

export default EditarUsuario;
