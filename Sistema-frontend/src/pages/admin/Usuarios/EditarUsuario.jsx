import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import Skeleton from '../../../components/ui/Skeleton';
import Badge from '../../../components/ui/Badge';
import { Users, ArrowLeft, Edit, Info, Check } from '../../../components/icons/Icons';

/* ── Glass helpers ── */
const GF = ({ label, error, children, required }) => (
    <div>
        {label && (
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
        )}
        {children}
        {error && <p className="text-xs text-red-400 mt-1">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
);

const glassInput = (hasErr, disabled) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-100 placeholder-slate-600',
    'bg-white/[0.05] border',
    hasErr
        ? 'ring-2 ring-red-500/40 border-red-500/30'
        : disabled
            ? 'border-white/[0.06]'
            : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

const GlassCard = ({ title, accent = '#34d399', children }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {title && (
            <div className="px-6 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const EditarUsuario = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [usuario, setUsuario] = useState(null);
    const [errores, setErrores] = useState({});
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
            } catch {
                toast.error('Error al cargar usuario');
                navigate('/dashboard/usuarios');
            } finally { setLoading(false); }
        };
        cargar();
    }, [id, navigate]);

    const set = (field, val) => setForm(p => ({ ...p, [field]: val }));

    const validar = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Obligatorio';
        if (!form.ci.trim()) e.ci = 'Obligatorio';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        try {
            setGuardando(true);
            await usuarioService.actualizar(id, form);
            toast.success('Usuario actualizado');
            navigate(`/dashboard/usuarios/${id}`);
        } catch (e) {
            if (e.response?.data?.errors) setErrores(e.response.data.errors);
            toast.error(e.response?.data?.message || 'Error al actualizar');
        } finally { setGuardando(false); }
    };

    if (loading) {
        return (
            <div className="animate-fade-in space-y-4 max-w-2xl mx-auto">
                <Skeleton height="1.5rem" width="200px" />
                <Skeleton height="300px" className="rounded-2xl" />
            </div>
        );
    }
    if (!usuario) return null;

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            {/* Back */}
            <button onClick={() => navigate(`/dashboard/usuarios/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors mb-6">
                <ArrowLeft size={16} /> Volver al detalle
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <Edit size={22} className="text-blue-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Editar Usuario</h1>
                    <p className="text-sm text-slate-500">{usuario.nombre} {usuario.apellido_paterno}</p>
                </div>
            </div>

            <div className="space-y-5">
                {/* Datos de acceso (readonly) */}
                <GlassCard title="Datos de Acceso" accent="#60a5fa">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <GF label="Email">
                            <div className={glassInput(false, true)} style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
                                <span className="text-slate-500">{usuario.email}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">No se puede modificar por seguridad</p>
                        </GF>
                        <GF label="Rol">
                            <div className={glassInput(false, true)} style={{ display: 'flex', alignItems: 'center', height: '42px' }}>
                                <Badge variant="info">{usuario.rol?.nombre_visible}</Badge>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">Cambiar desde el detalle del usuario</p>
                        </GF>
                    </div>
                </GlassCard>

                {/* Datos personales */}
                <GlassCard title="Datos Personales" accent="#34d399">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <GF label="Nombre" required error={errores.nombre}>
                            <input className={glassInput(!!errores.nombre, false)} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                        </GF>
                        <GF label="Apellido Paterno" required error={errores.apellido_paterno}>
                            <input className={glassInput(!!errores.apellido_paterno, false)} value={form.apellido_paterno} onChange={e => set('apellido_paterno', e.target.value)} />
                        </GF>
                        <GF label="Apellido Materno">
                            <input className={glassInput(false, false)} value={form.apellido_materno} onChange={e => set('apellido_materno', e.target.value)} />
                        </GF>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <GF label={`CI${!esGerente ? ' (solo gerente)' : ''}`} required error={errores.ci}>
                                    <input className={glassInput(!!errores.ci, !esGerente)} value={form.ci} disabled={!esGerente} onChange={e => set('ci', e.target.value)} />
                                </GF>
                            </div>
                            <div className="w-24">
                                <GF label="Compl.">
                                    <input className={glassInput(false, !esGerente)} value={form.ci_complemento} disabled={!esGerente} onChange={e => set('ci_complemento', e.target.value)} />
                                </GF>
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Contacto */}
                <GlassCard title="Contacto y Ubicación" accent="#a78bfa">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <GF label="Teléfono">
                            <input className={glassInput(false, false)} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="71234567" />
                        </GF>
                        <GF label="Fecha de Nacimiento">
                            <input type="date" className={glassInput(false, false)} value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
                        </GF>
                        <GF label="Dirección" error={undefined}>
                            <div className="sm:col-span-2">
                                <input className={glassInput(false, false)} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Principal 123" />
                            </div>
                        </GF>
                    </div>
                </GlassCard>

                {/* Acciones */}
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => navigate(`/dashboard/usuarios/${id}`)}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={guardando}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                        {guardando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                        Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarUsuario;
