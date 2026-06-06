import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import usuarioService from '../../../services/usuarioService';
import rolService from '../../../services/rolService';
import {
    Users, ArrowLeft, Check, CheckCircle, ChevronDown, Shield, FileText,
    Briefcase, AlertCircle, Mail,
} from '../../../components/icons/Icons';

/* ── Glass helpers (same pattern as CrearPersonal) ── */
const GF = ({ label, error, children, required }) => (
    <div>
        {label && (
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
        )}
        {children}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
);

const glassInput = (hasErr) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'text-slate-100 placeholder-slate-600',
    'bg-white/[0.05] border',
    hasErr
        ? 'ring-2 ring-red-500/40 border-red-500/30'
        : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

const GlassSelect = ({ value, onChange, options, placeholder = 'Seleccionar...', hasErr, disabled }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);
    const selected = options.find(o => String(o.id) === String(value));
    const btnCls = [
        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm outline-none text-left transition-all duration-200 bg-white/[0.05] border',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        hasErr ? 'ring-2 ring-red-500/40 border-red-500/30 text-slate-100'
            : open ? 'border-emerald-500/40 ring-2 ring-emerald-500/30 text-slate-100'
                : 'border-white/[0.09] hover:border-white/[0.16] text-slate-100',
    ].join(' ');
    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => !disabled && setOpen(v => !v)} className={btnCls}>
                <span className={selected ? 'text-slate-100' : 'text-slate-600'}>
                    {selected?.label || placeholder}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-[100] w-full rounded-xl overflow-hidden"
                    style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                    <div className="max-h-52 overflow-y-auto">
                        {options.map(o => {
                            const isSel = String(o.id) === String(value);
                            return (
                                <button key={String(o.id)} type="button" onClick={() => { onChange(String(o.id)); setOpen(false); }}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-all duration-100"
                                    style={isSel ? { background: 'rgba(16,185,129,0.18)', color: '#34d399' } : { color: '#94a3b8' }}
                                    onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; } }}
                                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; } }}>
                                    <span>{o.label}</span>
                                    {isSel && <CheckCircle size={13} className="shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── Stepper ── */
const STEPS = [
    { label: 'Datos Personales', color: '#34d399', glow: 'rgba(52,211,153,0.4)', bg: 'rgba(16,185,129,0.85)' },
    { label: 'Rol y Acceso',     color: '#60a5fa', glow: 'rgba(96,165,250,0.4)',  bg: 'rgba(37,99,235,0.85)' },
    { label: 'Configuración',    color: '#a78bfa', glow: 'rgba(167,139,250,0.4)', bg: 'rgba(124,58,237,0.85)' },
    { label: 'Revisión',         color: '#fbbf24', glow: 'rgba(251,191,36,0.4)',  bg: 'rgba(217,119,6,0.85)' },
];

const StepBar = ({ step }) => (
    <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
                <React.Fragment key={n}>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                            style={done ? { background: 'rgba(16,185,129,0.85)', boxShadow: '0 0 12px rgba(52,211,153,0.5)' }
                                : active ? { background: s.bg, boxShadow: `0 0 16px ${s.glow}`, border: `1px solid ${s.color}40` }
                                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                            {done ? <CheckCircle size={14} className="text-white" />
                                : <span className={active ? 'text-white' : 'text-slate-500'}>{n}</span>}
                        </div>
                        <span className="text-[10px] mt-1.5 font-medium whitespace-nowrap hidden sm:block"
                            style={{ color: (active || done) ? s.color : '#475569' }}>
                            {s.label}
                        </span>
                    </div>
                    {i < 3 && <div className="w-10 sm:w-16 h-px mb-5 mx-1 rounded-full transition-colors duration-500"
                        style={{ background: done ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.07)' }} />}
                </React.Fragment>
            );
        })}
    </div>
);

/* ── GlassCard panel ── */
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

/* ── NavBtn ── */
const NavBtn = ({ onClick, disabled, loading, children, color = 'emerald', variant = 'solid' }) => {
    const styles = {
        solid: { background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)', color: '#fff', border: 'none' },
        outline: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' },
    };
    return (
        <button type="button" onClick={onClick} disabled={disabled || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
            style={styles[variant]}>
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : children}
        </button>
    );
};

/* ── Main Component ── */
const CrearUsuario = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [paso, setPaso] = useState(1);
    const [roles, setRoles] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [errores, setErrores] = useState({});
    const [exito, setExito] = useState(null);

    const [form, setForm] = useState({
        nombre: '', apellido_paterno: '', apellido_materno: '', ci: '', ci_complemento: '',
        email: '', telefono: '', fecha_nacimiento: '', direccion: '', rol_id: '', estado: 'activo',
        crear_personal_vinculado: false,
        personal_data: {
            tipo: '', especialidad: '', fecha_contratacion: '', tipo_contrato: '',
            salario_base: '', frecuencia_pago: '',
        },
    });

    useEffect(() => {
        rolService.listar().then(r => setRoles(r?.data?.data ?? r?.data ?? [])).catch(() => {});
    }, []);

    const set = (field, val) => setForm(p => ({ ...p, [field]: val }));
    const setPD = (field, val) => setForm(p => ({ ...p, personal_data: { ...p.personal_data, [field]: val } }));

    const validarPaso1 = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (!form.apellido_paterno.trim()) e.apellido_paterno = 'Obligatorio';
        if (!form.ci.trim()) e.ci = 'Obligatorio';
        if (!form.email.trim()) e.email = 'Obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
        setErrores(e); return Object.keys(e).length === 0;
    };

    const validarPaso2 = () => {
        const e = {};
        if (!form.rol_id) e.rol_id = 'Selecciona un rol';
        if (form.crear_personal_vinculado) {
            if (!form.personal_data.tipo) e['personal_data.tipo'] = 'Obligatorio';
            if (!form.personal_data.fecha_contratacion) e['personal_data.fecha_contratacion'] = 'Obligatorio';
            if (!form.personal_data.tipo_contrato) e['personal_data.tipo_contrato'] = 'Obligatorio';
            if (!form.personal_data.salario_base) e['personal_data.salario_base'] = 'Obligatorio';
            if (!form.personal_data.frecuencia_pago) e['personal_data.frecuencia_pago'] = 'Obligatorio';
        }
        setErrores(e); return Object.keys(e).length === 0;
    };

    const irSiguiente = () => {
        if (paso === 1 && validarPaso1()) setPaso(2);
        else if (paso === 2 && validarPaso2()) setPaso(3);
        else if (paso === 3) setPaso(4);
    };

    const handleCrear = async () => {
        try {
            setGuardando(true);
            const datos = { ...form };
            if (!datos.crear_personal_vinculado) delete datos.personal_data;
            const res = await usuarioService.crear(datos);
            setExito(res.data);
        } catch (e) {
            const msg = e.response?.data?.message || 'Error al crear';
            toast.error(msg);
            if (e.response?.data?.errors) { setErrores(e.response.data.errors); setPaso(1); }
        } finally { setGuardando(false); }
    };

    const rolSeleccionado = roles.find(r => String(r.id) === String(form.rol_id));

    /* ── Success screen ── */
    if (exito) {
        return (
            <div className="animate-fade-in flex items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 40px rgba(16,185,129,0.2)' }}>
                        <Check size={40} className="text-emerald-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">¡Usuario creado!</h2>
                    <p className="text-slate-400 mb-1">{exito.nombre} {exito.apellido_paterno} fue registrado exitosamente.</p>
                    <p className="text-sm text-slate-500 mb-8">
                        Credenciales enviadas a <span className="text-emerald-400 font-medium">{exito.email}</span>
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => navigate(`/dashboard/usuarios/${exito.id}`)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Ver usuario
                        </button>
                        <button onClick={() => { setExito(null); setForm({ nombre: '', apellido_paterno: '', apellido_materno: '', ci: '', ci_complemento: '', email: '', telefono: '', fecha_nacimiento: '', direccion: '', rol_id: '', estado: 'activo', crear_personal_vinculado: false, personal_data: { tipo: '', especialidad: '', fecha_contratacion: '', tipo_contrato: '', salario_base: '', frecuencia_pago: '' } }); setPaso(1); }}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                            Crear otro
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const TIPOS_PERSONAL = [
        { id: 'tecnico', label: 'Técnico' }, { id: 'obrero', label: 'Obrero' },
        { id: 'trabajadora_social', label: 'Trabajadora Social' }, { id: 'administrativo', label: 'Administrativo' },
        { id: 'gerente', label: 'Gerente' }, { id: 'encargado_almacen', label: 'Encargado de Almacén' },
        { id: 'encargado_finanzas', label: 'Encargado de Finanzas' },
    ];
    const CONTRATOS = [{ id: 'indefinido', label: 'Indefinido' }, { id: 'plazo_fijo', label: 'Plazo Fijo' }, { id: 'obra', label: 'Por Obra' }, { id: 'consultoria', label: 'Consultoría' }];
    const FRECUENCIAS = [{ id: 'mensual', label: 'Mensual' }, { id: 'quincenal', label: 'Quincenal' }, { id: 'semanal', label: 'Semanal' }];

    return (
        <div className="animate-fade-in max-w-2xl mx-auto">
            {/* Back */}
            <button onClick={() => navigate('/dashboard/usuarios')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors mb-6">
                <ArrowLeft size={16} /> Volver
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                    <Users size={22} className="text-emerald-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Nuevo Usuario</h1>
                    <p className="text-sm text-slate-500">Registra una cuenta de acceso al sistema</p>
                </div>
            </div>

            <StepBar step={paso} />

            {/* PASO 1 — Datos Personales */}
            {paso === 1 && (
                <div className="animate-fade-in space-y-5">
                    <GlassCard title="Datos Personales" accent="#34d399">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <GF label="Nombre" required error={errores.nombre}>
                                <input className={glassInput(!!errores.nombre)} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan" />
                            </GF>
                            <GF label="Apellido Paterno" required error={errores.apellido_paterno}>
                                <input className={glassInput(!!errores.apellido_paterno)} value={form.apellido_paterno} onChange={e => set('apellido_paterno', e.target.value)} placeholder="Mamani" />
                            </GF>
                            <GF label="Apellido Materno">
                                <input className={glassInput(false)} value={form.apellido_materno} onChange={e => set('apellido_materno', e.target.value)} placeholder="Condori" />
                            </GF>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <GF label="CI" required error={errores.ci}>
                                        <input className={glassInput(!!errores.ci)} value={form.ci} onChange={e => set('ci', e.target.value)} placeholder="1234567" />
                                    </GF>
                                </div>
                                <div className="w-24">
                                    <GF label="Compl.">
                                        <input className={glassInput(false)} value={form.ci_complemento} onChange={e => set('ci_complemento', e.target.value)} placeholder="1A" />
                                    </GF>
                                </div>
                            </div>
                            <GF label="Correo Electrónico" required error={errores.email}>
                                <input type="email" className={glassInput(!!errores.email)} value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@empresa.com" />
                            </GF>
                            <GF label="Teléfono">
                                <input className={glassInput(false)} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="71234567" />
                            </GF>
                            <GF label="Fecha de Nacimiento">
                                <input type="date" className={glassInput(false)} value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
                            </GF>
                            <GF label="Dirección">
                                <input className={glassInput(false)} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Av. Principal 123" />
                            </GF>
                        </div>
                    </GlassCard>
                    <div className="flex justify-end">
                        <NavBtn onClick={irSiguiente}>Siguiente →</NavBtn>
                    </div>
                </div>
            )}

            {/* PASO 2 — Rol y Acceso */}
            {paso === 2 && (
                <div className="animate-fade-in space-y-5">
                    <GlassCard title="Rol del Sistema" accent="#60a5fa">
                        <GF label="Rol asignado" required error={errores.rol_id}>
                            <GlassSelect
                                value={form.rol_id}
                                onChange={val => set('rol_id', val)}
                                options={[...roles.map(r => ({ id: String(r.id), label: `${r.nombre_visible} (${r.permisos?.length || 0} permisos)` }))]}
                                placeholder="Seleccionar rol..."
                                hasErr={!!errores.rol_id}
                            />
                        </GF>
                        {rolSeleccionado && (
                            <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                                <p className="text-xs text-slate-400">{rolSeleccionado.descripcion || 'Sin descripción'}</p>
                                <p className="text-xs text-blue-400 mt-1 font-medium">{rolSeleccionado.permisos?.length || 0} permisos asignados</p>
                            </div>
                        )}
                    </GlassCard>

                    <GlassCard title="Ficha de Personal (Opcional)" accent="#a78bfa">
                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <div className="relative">
                                <input type="checkbox" checked={form.crear_personal_vinculado} onChange={e => set('crear_personal_vinculado', e.target.checked)} className="sr-only" />
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${form.crear_personal_vinculado ? 'bg-emerald-500' : 'bg-white/10 border border-white/20'}`}>
                                    {form.crear_personal_vinculado && <Check size={12} className="text-white" />}
                                </div>
                            </div>
                            <span className="text-sm text-slate-300">Este usuario también es trabajador de la empresa</span>
                        </label>
                        {form.crear_personal_vinculado && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <GF label="Tipo de Personal" required error={errores['personal_data.tipo']}>
                                    <GlassSelect value={form.personal_data.tipo} onChange={v => setPD('tipo', v)} options={TIPOS_PERSONAL} placeholder="Seleccionar tipo..." hasErr={!!errores['personal_data.tipo']} />
                                </GF>
                                <GF label="Especialidad">
                                    <input className={glassInput(false)} value={form.personal_data.especialidad} onChange={e => setPD('especialidad', e.target.value)} placeholder="Ej: Electricidad" />
                                </GF>
                                <GF label="Fecha de Contratación" required error={errores['personal_data.fecha_contratacion']}>
                                    <input type="date" className={glassInput(!!errores['personal_data.fecha_contratacion'])} value={form.personal_data.fecha_contratacion} onChange={e => setPD('fecha_contratacion', e.target.value)} />
                                </GF>
                                <GF label="Tipo de Contrato" required error={errores['personal_data.tipo_contrato']}>
                                    <GlassSelect value={form.personal_data.tipo_contrato} onChange={v => setPD('tipo_contrato', v)} options={CONTRATOS} placeholder="Tipo contrato..." hasErr={!!errores['personal_data.tipo_contrato']} />
                                </GF>
                                <GF label="Salario Base (Bs.)" required error={errores['personal_data.salario_base']}>
                                    <input type="number" className={glassInput(!!errores['personal_data.salario_base'])} value={form.personal_data.salario_base} onChange={e => setPD('salario_base', e.target.value)} placeholder="3000" />
                                </GF>
                                <GF label="Frecuencia de Pago" required error={errores['personal_data.frecuencia_pago']}>
                                    <GlassSelect value={form.personal_data.frecuencia_pago} onChange={v => setPD('frecuencia_pago', v)} options={FRECUENCIAS} placeholder="Frecuencia..." hasErr={!!errores['personal_data.frecuencia_pago']} />
                                </GF>
                            </div>
                        )}
                    </GlassCard>

                    <div className="flex justify-between">
                        <NavBtn variant="outline" onClick={() => setPaso(1)}>← Anterior</NavBtn>
                        <NavBtn onClick={irSiguiente}>Siguiente →</NavBtn>
                    </div>
                </div>
            )}

            {/* PASO 3 — Configuración */}
            {paso === 3 && (
                <div className="animate-fade-in space-y-5">
                    <GlassCard title="Seguridad y Acceso" accent="#a78bfa">
                        <div className="space-y-3">
                            {[
                                'Cambio obligatorio de contraseña en primer inicio de sesión',
                                'Notificación por correo con credenciales temporales',
                            ].map(txt => (
                                <div key={txt} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div className="w-5 h-5 rounded-md bg-emerald-500/80 flex items-center justify-center shrink-0">
                                        <Check size={11} className="text-white" />
                                    </div>
                                    <span className="text-sm text-slate-300">{txt}</span>
                                    <span className="ml-auto text-xs text-violet-400 font-medium">Obligatorio</span>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    <GlassCard title="Estado Inicial" accent="#a78bfa">
                        <div className="flex gap-5">
                            {[{ v: 'activo', l: 'Activo', c: '#34d399' }, { v: 'inactivo', l: 'Inhabilitado', c: '#f59e0b' }].map(opt => (
                                <label key={opt.v} className="flex items-center gap-2.5 cursor-pointer">
                                    <div onClick={() => set('estado', opt.v)}
                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all"
                                        style={{ borderColor: form.estado === opt.v ? opt.c : 'rgba(255,255,255,0.2)', background: form.estado === opt.v ? opt.c : 'transparent' }}>
                                        {form.estado === opt.v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                    <span className="text-sm text-slate-300">{opt.l}</span>
                                </label>
                            ))}
                        </div>
                    </GlassCard>

                    <div className="flex justify-between">
                        <NavBtn variant="outline" onClick={() => setPaso(2)}>← Anterior</NavBtn>
                        <NavBtn onClick={irSiguiente}>Siguiente →</NavBtn>
                    </div>
                </div>
            )}

            {/* PASO 4 — Revisión */}
            {paso === 4 && (
                <div className="animate-fade-in space-y-5">
                    <GlassCard title="Confirmación" accent="#fbbf24">
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Datos Personales</p>
                                <div className="grid grid-cols-2 gap-y-2 text-sm">
                                    <div><span className="text-slate-500 text-xs">Nombre</span><p className="font-medium text-slate-200">{form.nombre} {form.apellido_paterno} {form.apellido_materno}</p></div>
                                    <div><span className="text-slate-500 text-xs">CI</span><p className="font-mono text-slate-200">{form.ci}{form.ci_complemento ? `-${form.ci_complemento}` : ''}</p></div>
                                    <div><span className="text-slate-500 text-xs">Email</span><p className="text-slate-200 truncate">{form.email}</p></div>
                                    <div><span className="text-slate-500 text-xs">Rol</span><p className="text-emerald-400 font-medium">{rolSeleccionado?.nombre_visible || '—'}</p></div>
                                </div>
                            </div>

                            {form.crear_personal_vinculado && (
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                                    <p className="text-xs text-blue-400 font-medium mb-1">Personal Vinculado</p>
                                    <p className="text-sm text-slate-300">Tipo: {form.personal_data.tipo?.replace(/_/g, ' ')} · Contrato: {form.personal_data.tipo_contrato} · Bs. {form.personal_data.salario_base}</p>
                                </div>
                            )}

                            <div className="p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <Mail size={16} className="text-emerald-400 shrink-0" />
                                <p className="text-sm text-slate-300">Se enviará un correo a <span className="text-emerald-400 font-medium">{form.email}</span> con las credenciales temporales.</p>
                            </div>
                        </div>
                    </GlassCard>

                    <div className="flex justify-between">
                        <NavBtn variant="outline" onClick={() => setPaso(3)}>← Anterior</NavBtn>
                        <NavBtn onClick={handleCrear} loading={guardando}>Crear usuario</NavBtn>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CrearUsuario;
