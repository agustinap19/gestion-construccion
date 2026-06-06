import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import rolService from '../../../services/rolService';
import DatePickerInput from '../../../components/ui/DatePickerInput';
import {
    CheckCircle, Briefcase, UserPlus, FileText, ChevronRight, ChevronLeft,
    ChevronDown, X, Shield, Users, AlertCircle,
} from '../../../components/icons/Icons';

/* ─── Constants ─── */
const TIPOS_PERSONAL = [
    { id: 'tecnico',              label: 'Técnico' },
    { id: 'obrero',               label: 'Obrero' },
    { id: 'trabajadora_social',   label: 'Trabajadora Social' },
    { id: 'administrativo',       label: 'Administrativo' },
    { id: 'gerente',              label: 'Gerente' },
    { id: 'encargado_almacen',    label: 'Encargado de Almacén' },
    { id: 'encargado_finanzas',   label: 'Encargado de Finanzas' },
];

const TIPOS_CONTRATO = [
    { id: 'indefinido',  label: 'Indefinido',  desc: 'Contrato sin límite de tiempo' },
    { id: 'plazo_fijo',  label: 'Plazo Fijo',  desc: 'Contrato por tiempo definido' },
    { id: 'obra',        label: 'Por Obra',    desc: 'Contrato atado a proyecto' },
    { id: 'consultoria', label: 'Consultoría', desc: 'Servicios profesionales externos' },
];

const BANCOS = [
    { id: '',                    label: 'Ninguno / Efectivo' },
    { id: 'BNB',                 label: 'BNB' },
    { id: 'Mercantil Santa Cruz', label: 'Mercantil Santa Cruz' },
    { id: 'BCP',                 label: 'BCP' },
    { id: 'Fassil',              label: 'Fassil' },
    { id: 'Económico',           label: 'Económico' },
    { id: 'Nacional de Bolivia', label: 'Nacional de Bolivia' },
];

const FRECUENCIAS = [
    { id: 'mensual',   label: 'Mensual' },
    { id: 'quincenal', label: 'Quincenal' },
    { id: 'semanal',   label: 'Semanal' },
];

const TIPO_CUENTA = [
    { id: '',          label: 'Seleccionar...' },
    { id: 'ahorro',    label: 'Caja de Ahorro' },
    { id: 'corriente', label: 'Cuenta Corriente' },
];

/* ─── Helpers ─── */
const capitalize    = (s) => s.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
const onlyLetras    = (s) => s.replace(/[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ\s]/g, '');
const onlyDigits    = (s) => s.replace(/\D/g, '');

// Parse YYYY-MM-DD as LOCAL date (avoids UTC midnight timezone bug)
const parseLocalDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};

// Max allowed birth date: exactly 18 years ago (local midnight)
const maxFnac = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setHours(0, 0, 0, 0);
    return d;
};

/* ─── Glass input / label ─── */
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

/* ─── Custom dark select (replaces native <select>) ─── */
const GlassSelect = ({ value, onChange, options, placeholder = 'Seleccionar...', hasErr, disabled }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const selected = options.find(o => String(o.id) === String(value));

    const btnCls = [
        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm outline-none text-left transition-all duration-200 bg-white/[0.05] border',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        hasErr
            ? 'ring-2 ring-red-500/40 border-red-500/30 text-slate-100'
            : open
                ? 'border-emerald-500/40 ring-2 ring-emerald-500/30 text-slate-100'
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
                    style={{
                        background: 'rgba(8,12,26,0.99)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
                    }}>
                    <div className="max-h-52 overflow-y-auto">
                        {options.map(o => {
                            const isSel = String(o.id) === String(value);
                            return (
                                <button
                                    key={String(o.id)}
                                    type="button"
                                    onClick={() => { onChange(String(o.id)); setOpen(false); }}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-all duration-100"
                                    style={isSel
                                        ? { background: 'rgba(16,185,129,0.18)', color: '#34d399' }
                                        : { color: '#94a3b8' }
                                    }
                                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; }}
                                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; } }}
                                >
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

/* ─── Stepper ─── */
const STEP_CFG = [
    { label: 'Datos Personales', color: 'emerald', icon: FileText },
    { label: 'Info Laboral',     color: 'blue',    icon: Briefcase },
    { label: 'Compensación',     color: 'amber',   icon: FileText },
    { label: 'Acceso Sistema',   color: 'violet',  icon: Shield },
];

const COLOR_MAP = {
    emerald: { ring: 'rgba(52,211,153,0.45)',  bg: 'rgba(16,185,129,0.85)',  border: 'rgba(52,211,153,0.30)',  text: 'text-emerald-400', dot: 'bg-emerald-400', section: 'rgba(52,211,153,0.12)',  sectionBorder: 'rgba(52,211,153,0.22)',  glow: 'rgba(52,211,153,0.18)' },
    blue:    { ring: 'rgba(59,130,246,0.45)',   bg: 'rgba(37,99,235,0.85)',   border: 'rgba(59,130,246,0.30)',  text: 'text-blue-400',    dot: 'bg-blue-400',    section: 'rgba(59,130,246,0.12)',  sectionBorder: 'rgba(59,130,246,0.22)',  glow: 'rgba(59,130,246,0.18)' },
    amber:   { ring: 'rgba(245,158,11,0.45)',   bg: 'rgba(217,119,6,0.85)',   border: 'rgba(245,158,11,0.30)',  text: 'text-amber-400',   dot: 'bg-amber-400',   section: 'rgba(245,158,11,0.10)',  sectionBorder: 'rgba(245,158,11,0.22)',  glow: 'rgba(245,158,11,0.16)' },
    violet:  { ring: 'rgba(139,92,246,0.45)',   bg: 'rgba(124,58,237,0.85)',  border: 'rgba(139,92,246,0.30)',  text: 'text-violet-400',  dot: 'bg-violet-400',  section: 'rgba(139,92,246,0.10)',  sectionBorder: 'rgba(139,92,246,0.22)',  glow: 'rgba(139,92,246,0.16)' },
};

const StepperBar = ({ step }) => (
    <div className="flex items-center justify-center gap-0">
        {STEP_CFG.map((cfg, idx) => {
            const num  = idx + 1;
            const done   = num < step;
            const active = num === step;
            const c = COLOR_MAP[cfg.color];
            return (
                <React.Fragment key={num}>
                    <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                            style={done
                                ? { background: 'rgba(16,185,129,0.85)', boxShadow: '0 0 12px rgba(52,211,153,0.5)' }
                                : active
                                    ? { background: c.bg, boxShadow: `0 0 16px ${c.ring}`, border: `1px solid ${c.border}` }
                                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }
                            }>
                            {done
                                ? <CheckCircle size={14} className="text-white" />
                                : <span className={active ? 'text-white' : 'text-slate-500'}>{num}</span>
                            }
                        </div>
                        <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${active || done ? c.text : 'text-slate-600'}`}>
                            {cfg.label}
                        </span>
                    </div>
                    {idx < 3 && (
                        <div className="w-10 sm:w-14 h-px mb-5 mx-1 rounded-full transition-colors duration-500"
                            style={{ background: done ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.07)' }} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

const EmeraldBtn = ({ onClick, disabled, loading, children, color = 'emerald' }) => {
    const c = COLOR_MAP[color];
    return (
        <button type="button" onClick={onClick} disabled={disabled || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px ${c.glow}` }}>
            {loading ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {children}
        </button>
    );
};

const SectionHeader = ({ icon: Icon, title, subtitle, color }) => {
    const c = COLOR_MAP[color];
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: c.section, border: `1px solid ${c.sectionBorder}` }}>
                <Icon size={16} className={c.text} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-slate-100">{title}</h3>
                {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════ */
const CrearPersonal = () => {
    const navigate = useNavigate();
    const { user }  = useAuth();
    const [step, setStep]       = useState(1);
    const [loading, setLoading] = useState(false);
    const [roles, setRoles]     = useState([]);
    const [modalSalir, setModalSalir] = useState(false);

    const [formData, setFormData] = useState({
        codigo_empleado: '',
        nombre: '', apellido_paterno: '', apellido_materno: '',
        ci: '', ci_complemento: '', fecha_nacimiento: '', telefono: '', direccion: '',
        tipo: 'obrero', especialidad: '', categoria: '',
        fecha_contratacion: new Date().toISOString().split('T')[0],
        tipo_contrato: 'indefinido', estado_laboral: 'activo',
        salario_base: '', frecuencia_pago: 'mensual',
        banco: '', numero_cuenta: '', tipo_cuenta: '',
        crear_usuario_vinculado: false, email: '', rol_id: '',
    });

    const [errores, setErrores] = useState({});

    /* Init: load next code + roles */
    useEffect(() => {
        const init = async () => {
            try {
                const [codRes, rolesRes] = await Promise.all([
                    personalService.siguienteCodigo(),
                    rolService.listar(),                          // ← fixed: was listarTodos()
                ]);
                setFormData(p => ({ ...p, codigo_empleado: codRes.data?.codigo || codRes.codigo || '' }));
                const isGerente = user?.rol?.nombre === 'gerente';
                // API returns paginated: { data: { data: [...], ... } }
                const allRoles = rolesRes?.data?.data ?? rolesRes?.data ?? [];
                setRoles(Array.isArray(allRoles)
                    ? allRoles.filter(r => isGerente || r.nombre !== 'gerente')
                    : []);
            } catch {
                toast.error('Error al cargar datos del formulario');
            }
        };
        init();
    }, [user]);

    /* Auto-suggest email when toggle is turned on */
    useEffect(() => {
        if (formData.crear_usuario_vinculado && !formData.email && formData.nombre && formData.apellido_paterno) {
            const nom = formData.nombre.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
            const ape = formData.apellido_paterno.toLowerCase().replace(/[^a-z]/g, '');
            setFormData(p => ({ ...p, email: `${nom}.${ape}@cakanagf.com` }));
        }
    }, [formData.crear_usuario_vinculado]);

    /* Detect if user has started filling the form */
    const formTieneDatos = () => {
        const f = formData;
        return !!(f.nombre || f.apellido_paterno || f.apellido_materno || f.ci ||
                  f.fecha_nacimiento || f.telefono || f.direccion || f.email ||
                  f.especialidad || f.salario_base);
    };

    /* ── Field-level real-time validation ── */
    const validateField = (name, val) => {
        let err = '';
        if (name === 'nombre') {
            if (!val.trim()) err = 'El nombre es obligatorio';
            else if (val.trim().length < 2) err = 'Mínimo 2 caracteres';
        }
        if (name === 'apellido_paterno') {
            if (!val.trim()) err = 'El apellido es obligatorio';
            else if (val.trim().length < 2) err = 'Mínimo 2 caracteres';
        }
        if (name === 'ci') {
            if (!val.trim()) err = 'El C.I. es obligatorio';
        }
        if (name === 'fecha_nacimiento' && val) {
            const d  = parseLocalDate(val);
            const mx = maxFnac();
            if (d && d > mx) err = 'Debe tener al menos 18 años';
        }
        if (name === 'salario_base') {
            if (val !== '' && (isNaN(Number(val)) || Number(val) < 0)) err = 'Monto inválido';
        }
        if (name === 'email') {
            if (formData.crear_usuario_vinculado && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) err = 'Email inválido';
        }
        return err;
    };

    const setField = (name, val) => {
        setFormData(p => ({ ...p, [name]: val }));
        const err = validateField(name, val);
        setErrores(p => ({ ...p, [name]: err }));
    };

    const handleTextLetras = (name, raw, max) => setField(name, capitalize(onlyLetras(raw)).slice(0, max));
    const handleDigits     = (name, raw, max) => setField(name, onlyDigits(raw).slice(0, max));

    /* ── Step-level validation ── */
    const validarPaso = (n) => {
        const err = {};
        if (n === 1) {
            if (!formData.nombre.trim() || formData.nombre.trim().length < 2)
                err.nombre = 'Mínimo 2 caracteres';
            if (!formData.apellido_paterno.trim() || formData.apellido_paterno.trim().length < 2)
                err.apellido_paterno = 'Mínimo 2 caracteres';
            if (!formData.ci.trim())
                err.ci = 'El C.I. es obligatorio';
            if (formData.fecha_nacimiento) {
                const d  = parseLocalDate(formData.fecha_nacimiento);  // ← fixed: local parse
                const mx = maxFnac();
                if (d && d > mx) err.fecha_nacimiento = 'Debe tener al menos 18 años';
            }
        }
        if (n === 2 && !formData.fecha_contratacion)
            err.fecha_contratacion = 'Obligatorio';
        if (n === 3 && formData.salario_base !== '' && (isNaN(Number(formData.salario_base)) || Number(formData.salario_base) < 0))
            err.salario_base = 'Monto inválido';
        if (n === 4 && formData.crear_usuario_vinculado) {
            if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
                err.email = 'Email inválido';
            if (!formData.rol_id) err.rol_id = 'Selecciona un rol';
        }
        setErrores(prev => ({ ...prev, ...err }));
        return Object.keys(err).length === 0;
    };

    const siguiente = () => {
        if (validarPaso(step)) setStep(s => Math.min(s + 1, 4));
        else toast.error('Completa los campos requeridos correctamente');
    };
    const anterior = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!validarPaso(4)) return toast.error('Corrige los errores antes de enviar');
        try {
            setLoading(true);
            const payload = { ...formData };
            if (payload.crear_usuario_vinculado) {
                payload.usuario_data = { email: payload.email, rol_id: Number(payload.rol_id) };
            }
            const res = await personalService.crear(payload);
            toast.success('Personal creado exitosamente');
            if (payload.crear_usuario_vinculado) toast.success('Credenciales enviadas por correo');
            navigate(`/dashboard/personal/${res.data.id}`);
        } catch (e) {
            if (e.response?.status === 422) {
                const serverErrors = e.response.data.errors || {};
                const flat = {};
                Object.keys(serverErrors).forEach(k => { flat[k] = serverErrors[k][0]; });
                if (flat['usuario_data.email']) flat.email = flat['usuario_data.email'];
                setErrores(flat);
                toast.error('Errores de validación');
                if (flat.ci || flat.nombre) setStep(1);
                else if (flat.fecha_contratacion) setStep(2);
                else if (flat.salario_base) setStep(3);
                else if (flat.email) setStep(4);
            } else {
                toast.error(e.response?.data?.message || 'Error al crear personal');
            }
        } finally {
            setLoading(false);
        }
    };

    const cerrar = () => navigate('/dashboard/personal');

    /* Show exit confirmation if user has typed anything */
    const intentarCerrar = () => {
        if (formTieneDatos()) setModalSalir(true);
        else cerrar();
    };

    const activeColor = STEP_CFG[step - 1].color;
    const c  = COLOR_MAP[activeColor];
    const maxW = step === 1 ? 'max-w-2xl' : step <= 3 ? 'max-w-xl' : 'max-w-lg';

    const rolesOpciones = [
        { id: '', label: 'Seleccione un rol...' },
        ...roles.map(r => ({ id: String(r.id), label: r.nombre_visible || r.nombre })),
    ];

    return (
        <>
            <div
                className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
                style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                onClick={e => { if (e.target === e.currentTarget) intentarCerrar(); }}
            >
                <div
                    className={`relative w-full ${maxW} my-auto rounded-2xl animate-modal-in`}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: 'rgba(12,18,36,0.92)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.60), 0 8px 32px rgba(0,0,0,0.30), inset 0 0 0 0.5px rgba(255,255,255,0.06)',
                    }}
                >
                    {/* Top reflection */}
                    <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                        style={{ background: 'linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.30) 50%, transparent 92%)' }} />
                    <div className="absolute top-0 left-0 w-72 h-40 pointer-events-none"
                        style={{ background: `radial-gradient(ellipse at 15% 0%, ${c.glow} 0%, transparent 65%)` }} />

                    <div className="relative z-10 p-6 sm:p-8">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${c.glow}, rgba(16,185,129,0.08))`, border: `1px solid ${c.border}`, boxShadow: `0 0 14px ${c.glow}` }}>
                                    <UserPlus size={18} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-100">Nuevo Personal</h2>
                                    <p className="text-xs text-slate-500 mt-0.5">Registra un nuevo trabajador en el sistema</p>
                                </div>
                            </div>
                            <button type="button" onClick={intentarCerrar}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.10] transition-all duration-200"
                                style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                                <X size={13} />
                            </button>
                        </div>

                        {/* Stepper */}
                        <div className="mb-7">
                            <StepperBar step={step} />
                        </div>

                        {/* ── PASO 1: Datos Personales ── */}
                        {step === 1 && (
                            <div className="animate-fade-in space-y-5">
                                <SectionHeader icon={FileText} title="Datos Personales" subtitle="Identidad y contacto" color="emerald" />

                                <div className="px-4 py-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Código autogenerado</p>
                                    <p className="text-lg font-mono text-emerald-400 font-bold">
                                        {formData.codigo_empleado || <span className="text-slate-600 text-sm animate-pulse">Cargando...</span>}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <GF label="Nombre" error={errores.nombre} required>
                                        <input value={formData.nombre} onChange={e => handleTextLetras('nombre', e.target.value, 30)}
                                            maxLength={30} placeholder="Ej. Juan Carlos" className={glassInput(!!errores.nombre)} />
                                    </GF>
                                    <GF label="Apellido Paterno" error={errores.apellido_paterno} required>
                                        <input value={formData.apellido_paterno} onChange={e => handleTextLetras('apellido_paterno', e.target.value, 20)}
                                            maxLength={20} placeholder="Ej. García" className={glassInput(!!errores.apellido_paterno)} />
                                    </GF>
                                    <GF label={<>Apellido Materno <span className="normal-case font-normal text-slate-600">(opcional)</span></>}>
                                        <input value={formData.apellido_materno} onChange={e => handleTextLetras('apellido_materno', e.target.value, 20)}
                                            maxLength={20} placeholder="Ej. López" className={glassInput(false)} />
                                    </GF>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="flex gap-2">
                                        <GF label="C.I." error={errores.ci} required>
                                            <input value={formData.ci} onChange={e => handleDigits('ci', e.target.value, 15)}
                                                maxLength={15} placeholder="12345678" className={glassInput(!!errores.ci)} />
                                        </GF>
                                        <GF label="Ext.">
                                            <input value={formData.ci_complemento}
                                                onChange={e => setField('ci_complemento', e.target.value.slice(0, 4).toUpperCase())}
                                                maxLength={4} placeholder="1A" className={`${glassInput(false)} w-20`} />
                                        </GF>
                                    </div>

                                    <GF label="Fecha de Nacimiento" error={errores.fecha_nacimiento}>
                                        <DatePickerInput
                                            value={formData.fecha_nacimiento}
                                            onChange={val => setField('fecha_nacimiento', val)}
                                            maxDate={maxFnac()}
                                            error={errores.fecha_nacimiento}
                                            placeholder="Mayor de 18 años"
                                        />
                                    </GF>

                                    <GF label={<>Teléfono <span className="normal-case font-normal text-slate-600">(opcional)</span></>}>
                                        <input value={formData.telefono} onChange={e => handleDigits('telefono', e.target.value, 10)}
                                            maxLength={10} placeholder="70000000" className={glassInput(false)} />
                                    </GF>
                                </div>

                                <GF label={<>Dirección <span className="normal-case font-normal text-slate-600">(opcional)</span></>}>
                                    <input value={formData.direccion} onChange={e => setField('direccion', e.target.value.slice(0, 60))}
                                        maxLength={60} placeholder="Av. Ejemplo N° 123, Santa Cruz" className={glassInput(false)} />
                                </GF>

                                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <button type="button" onClick={intentarCerrar}
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                        <ChevronLeft size={14} /> Cancelar
                                    </button>
                                    <EmeraldBtn onClick={siguiente} color="emerald">
                                        Siguiente <ChevronRight size={14} />
                                    </EmeraldBtn>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 2: Info Laboral ── */}
                        {step === 2 && (
                            <div className="animate-fade-in space-y-5">
                                <SectionHeader icon={Briefcase} title="Información Laboral" subtitle="Contrato y cargo en la empresa" color="blue" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GF label="Tipo de Personal">
                                        <GlassSelect
                                            value={formData.tipo}
                                            onChange={v => setField('tipo', v)}
                                            options={TIPOS_PERSONAL}
                                            placeholder="Seleccionar tipo..."
                                        />
                                    </GF>
                                    <GF label={<>Especialidad <span className="normal-case font-normal text-slate-600">(opcional)</span></>}>
                                        <input value={formData.especialidad} onChange={e => setField('especialidad', e.target.value)}
                                            placeholder="Obra gruesa, Frontend..." className={glassInput(false)} />
                                    </GF>
                                    <GF label={<>Categoría <span className="normal-case font-normal text-slate-600">(opcional)</span></>}>
                                        <input value={formData.categoria} onChange={e => setField('categoria', e.target.value)}
                                            placeholder="Senior, Junior, Cat A..." className={glassInput(false)} />
                                    </GF>
                                    <GF label="Fecha de Contratación" error={errores.fecha_contratacion} required>
                                        <DatePickerInput
                                            value={formData.fecha_contratacion}
                                            onChange={val => setField('fecha_contratacion', val)}
                                            error={errores.fecha_contratacion}
                                            placeholder="dd/mm/aaaa"
                                        />
                                    </GF>
                                </div>

                                <GF label="Tipo de Contrato">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {TIPOS_CONTRATO.map(t => (
                                            <button key={t.id} type="button" onClick={() => setField('tipo_contrato', t.id)}
                                                className="flex items-start gap-3 p-4 rounded-xl text-left transition-all duration-150"
                                                style={formData.tipo_contrato === t.id
                                                    ? { background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.35)', boxShadow: '0 0 12px rgba(59,130,246,0.12)' }
                                                    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                                                }>
                                                <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors"
                                                    style={formData.tipo_contrato === t.id
                                                        ? { borderColor: 'rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.8)' }
                                                        : { borderColor: 'rgba(255,255,255,0.20)' }
                                                    }>
                                                    {formData.tipo_contrato === t.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-100">{t.label}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </GF>

                                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <button type="button" onClick={anterior}
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                        <ChevronLeft size={14} /> Anterior
                                    </button>
                                    <EmeraldBtn onClick={siguiente} color="blue">
                                        Siguiente <ChevronRight size={14} />
                                    </EmeraldBtn>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 3: Compensación ── */}
                        {step === 3 && (
                            <div className="animate-fade-in space-y-5">
                                <SectionHeader icon={FileText} title="Compensación" subtitle="Salario y datos bancarios" color="amber" />

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GF label="Salario Base (Bs.)" error={errores.salario_base}>
                                        <input type="number" value={formData.salario_base}
                                            onChange={e => setField('salario_base', e.target.value)}
                                            placeholder="0.00" min="0" className={glassInput(!!errores.salario_base)} />
                                    </GF>
                                    <GF label="Frecuencia de Pago">
                                        <GlassSelect
                                            value={formData.frecuencia_pago}
                                            onChange={v => setField('frecuencia_pago', v)}
                                            options={FRECUENCIAS}
                                        />
                                    </GF>
                                </div>

                                <div className="p-4 rounded-xl space-y-4"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                        Datos Bancarios <span className="normal-case font-normal text-slate-600">(opcional)</span>
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <GF label="Banco">
                                            <GlassSelect
                                                value={formData.banco}
                                                onChange={v => {
                                                    setField('banco', v);
                                                    if (!v) { setField('numero_cuenta', ''); setField('tipo_cuenta', ''); }
                                                }}
                                                options={BANCOS}
                                            />
                                        </GF>
                                        <GF label="Nº de Cuenta">
                                            <input value={formData.numero_cuenta}
                                                onChange={e => setField('numero_cuenta', e.target.value)}
                                                disabled={!formData.banco} placeholder="—"
                                                className={`${glassInput(false)} disabled:opacity-30`} />
                                        </GF>
                                        <GF label="Tipo de Cuenta">
                                            <GlassSelect
                                                value={formData.tipo_cuenta}
                                                onChange={v => setField('tipo_cuenta', v)}
                                                options={TIPO_CUENTA}
                                                disabled={!formData.banco}
                                            />
                                        </GF>
                                    </div>
                                </div>

                                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <button type="button" onClick={anterior}
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                        <ChevronLeft size={14} /> Anterior
                                    </button>
                                    <EmeraldBtn onClick={siguiente} color="amber">
                                        Siguiente <ChevronRight size={14} />
                                    </EmeraldBtn>
                                </div>
                            </div>
                        )}

                        {/* ── PASO 4: Acceso Sistema ── */}
                        {step === 4 && (
                            <div className="animate-fade-in space-y-5">
                                <SectionHeader icon={Shield} title="Acceso al Sistema" subtitle="Crear cuenta de usuario vinculada" color="violet" />

                                <button type="button"
                                    onClick={() => setFormData(p => ({ ...p, crear_usuario_vinculado: !p.crear_usuario_vinculado }))}
                                    className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-150"
                                    style={formData.crear_usuario_vinculado
                                        ? { background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.30)' }
                                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }
                                    }>
                                    <div className="w-5 h-5 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all"
                                        style={formData.crear_usuario_vinculado
                                            ? { background: 'rgba(139,92,246,0.85)', borderColor: 'rgba(139,92,246,0.8)' }
                                            : { borderColor: 'rgba(255,255,255,0.20)' }
                                        }>
                                        {formData.crear_usuario_vinculado && <CheckCircle size={11} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-100">Crear cuenta de sistema para este trabajador</p>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                            Se creará un usuario con sus datos y se le enviará un correo con credenciales temporales.
                                        </p>
                                    </div>
                                </button>

                                {formData.crear_usuario_vinculado && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <GF label="Correo electrónico (Login)" error={errores.email} required>
                                                <input type="email" value={formData.email}
                                                    onChange={e => setField('email', e.target.value)}
                                                    placeholder="nombre.apellido@cakanagf.com"
                                                    className={glassInput(!!errores.email)} />
                                            </GF>
                                            <GF label="Rol en el sistema" error={errores.rol_id} required>
                                                <GlassSelect
                                                    value={formData.rol_id}
                                                    onChange={v => setField('rol_id', v)}
                                                    options={rolesOpciones}
                                                    hasErr={!!errores.rol_id}
                                                    placeholder={roles.length === 0 ? 'Cargando roles...' : 'Seleccione un rol...'}
                                                    disabled={roles.length === 0}
                                                />
                                            </GF>
                                        </div>
                                        <div className="flex items-start gap-2.5 p-3 rounded-xl"
                                            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.20)' }}>
                                            <Users size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-300 leading-relaxed">
                                                <strong>Importante:</strong> La contraseña temporal será enviada al correo ingresado mediante Brevo. Asegúrate de que sea un correo válido.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <button type="button" onClick={anterior}
                                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                        <ChevronLeft size={14} /> Anterior
                                    </button>
                                    <EmeraldBtn onClick={handleSubmit} loading={loading} color="emerald">
                                        {!loading && <CheckCircle size={14} />}
                                        {loading ? 'Creando...' : 'Crear Personal'}
                                    </EmeraldBtn>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Modal: confirmar salida con datos ── */}
            {modalSalir && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setModalSalir(false)} />
                    <div className="relative z-10 w-full max-w-sm rounded-2xl p-6"
                        style={{
                            background: 'rgba(12,18,36,0.98)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                        }}>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
                                <AlertCircle size={18} className="text-red-400" />
                            </div>
                            <h3 className="text-base font-bold text-white">¿Descartar datos?</h3>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            Tienes datos ingresados que se perderán si sales ahora. ¿Estás seguro de que quieres abandonar el formulario?
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setModalSalir(false)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Continuar llenando
                            </button>
                            <button type="button" onClick={cerrar}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
                                style={{ background: 'rgba(239,68,68,0.85)', border: '1px solid rgba(239,68,68,0.4)' }}>
                                Sí, descartar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CrearPersonal;
