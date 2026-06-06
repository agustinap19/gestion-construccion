import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import personalService from '../../../services/personalService';
import rolService from '../../../services/rolService';
import {
    X, Search, User, Check, ChevronDown, CheckCircle,
    Shield, Mail, AlertTriangle,
} from '../../../components/icons/Icons';

/* ── Glass input ── */
const gI = (hasErr = false) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'text-slate-100 placeholder-slate-600 bg-white/[0.05] border',
    hasErr
        ? 'ring-2 ring-red-500/40 border-red-500/30'
        : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

/* ── Field wrapper ── */
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

/* ── Rol custom dropdown ── */
const RolSelect = ({ value, onChange, roles, hasErr }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [open]);

    const sel = roles.find(r => String(r.id) === String(value));

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => setOpen(v => !v)}
                className={[
                    'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm outline-none text-left transition-all bg-white/[0.05] border cursor-pointer',
                    hasErr ? 'ring-2 ring-red-500/40 border-red-500/30 text-slate-100'
                        : open ? 'border-emerald-500/40 ring-2 ring-emerald-500/30 text-slate-100'
                            : 'border-white/[0.09] hover:border-white/[0.16] text-slate-100',
                ].join(' ')}>
                <span className={sel ? 'text-slate-100' : 'text-slate-600'}>
                    {sel ? sel.nombre_visible : 'Seleccionar rol…'}
                </span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-[200] w-full rounded-xl overflow-hidden"
                    style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                    <div className="max-h-44 overflow-y-auto">
                        {roles.map(r => {
                            const isSel = String(r.id) === String(value);
                            return (
                                <button key={r.id} type="button"
                                    onClick={() => { onChange(String(r.id)); setOpen(false); }}
                                    className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm text-left transition-all"
                                    style={isSel ? { background: 'rgba(16,185,129,0.18)', color: '#34d399' } : { color: '#94a3b8' }}
                                    onMouseEnter={e => { if (!isSel) { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#e2e8f0'; } }}
                                    onMouseLeave={e => { if (!isSel) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#94a3b8'; } }}>
                                    <span>{r.nombre_visible}</span>
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

/* ═══════════════════════════════════════════════════════
   Main modal
═══════════════════════════════════════════════════════ */
const AsignarAccesoModal = ({ isOpen, onClose, onAsignado }) => {
    const [paso, setPaso] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [personal, setPersonal] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [roles, setRoles] = useState([]);
    const [form, setForm] = useState({ email: '', rol_id: '', estado: 'activo' });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [exito, setExito] = useState(false);
    const [confirmClose, setConfirmClose] = useState(false);

    const dirty = !!(form.email || form.rol_id);

    /* Cargar roles al abrir */
    useEffect(() => {
        if (!isOpen) return;
        rolService.listar().then(r => setRoles(r?.data?.data ?? r?.data ?? [])).catch(() => {});
    }, [isOpen]);

    /* Reset al cerrar */
    useEffect(() => {
        if (!isOpen) {
            setPaso(1); setBusqueda(''); setPersonal([]); setSeleccionado(null);
            setForm({ email: '', rol_id: '', estado: 'activo' });
            setErrores({}); setExito(false); setConfirmClose(false);
        }
    }, [isOpen]);

    /* Búsqueda de personal sin cuenta con debounce */
    useEffect(() => {
        if (!isOpen || paso !== 1) return;
        const t = setTimeout(async () => {
            setCargando(true);
            try {
                const res = await personalService.listar({
                    busqueda,
                    tiene_usuario: false,
                    estado_laboral: 'activo',
                    per_page: 8,
                });
                setPersonal(res?.data?.data || []);
            } catch { setPersonal([]); }
            finally { setCargando(false); }
        }, 350);
        return () => clearTimeout(t);
    }, [busqueda, isOpen, paso]);

    const handleClose = () => {
        if (dirty && !exito) { setConfirmClose(true); return; }
        onClose();
    };

    const set = (k, v) => {
        setForm(f => ({ ...f, [k]: v }));
        setErrores(e => { const n = { ...e }; delete n[k]; return n; });
    };

    const validar = () => {
        const e = {};
        if (!form.email.trim()) e.email = 'Obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido';
        if (!form.rol_id) e.rol_id = 'Selecciona un rol';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        setGuardando(true);
        try {
            await personalService.crearUsuarioParaPersonal(seleccionado.id, form.email, form.rol_id);
            setExito(true);
            onAsignado?.();
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Error al crear acceso');
            if (err?.response?.data?.errors) setErrores(err.response.data.errors);
        } finally { setGuardando(false); }
    };

    const rolSel = roles.find(r => String(r.id) === String(form.rol_id));

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.7)' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 shrink-0"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                    <Shield size={17} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-white">Asignar Acceso al Sistema</h2>
                                    <p className="text-[11px] text-slate-500">
                                        {paso === 1 || !seleccionado
                                            ? 'Selecciona el personal al que se le asignará acceso'
                                            : `${seleccionado.nombre} ${seleccionado.apellido_paterno}`}
                                    </p>
                                </div>
                            </div>
                            <button onClick={handleClose}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Steps */}
                        {!exito && (
                            <div className="px-6 pt-4 pb-1 shrink-0 flex items-center gap-2">
                                {[
                                    { n: 1, label: 'Seleccionar personal' },
                                    { n: 2, label: 'Datos de acceso' },
                                ].map((s, i) => (
                                    <React.Fragment key={s.n}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                                style={
                                                    paso > s.n
                                                        ? { background: 'rgba(16,185,129,0.85)' }
                                                        : paso === s.n
                                                            ? { background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)', color: '#34d399' }
                                                            : { background: 'rgba(255,255,255,0.06)', color: '#475569' }
                                                }>
                                                {paso > s.n
                                                    ? <Check size={11} className="text-white" />
                                                    : <span>{s.n}</span>}
                                            </div>
                                            <span className="text-xs font-medium" style={{ color: paso >= s.n ? '#94a3b8' : '#475569' }}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {i < 1 && (
                                            <div className="flex-1 h-px mx-1 transition-colors duration-300"
                                                style={{ background: paso > 1 ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.07)' }} />
                                        )}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">

                            {/* ── PASO 1: buscar personal ── */}
                            {paso === 1 && !exito && (
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                        <input
                                            value={busqueda}
                                            onChange={e => setBusqueda(e.target.value)}
                                            className={`${gI()} pl-9`}
                                            placeholder="Buscar por nombre, CI o especialidad…"
                                            autoFocus />
                                    </div>

                                    {cargando ? (
                                        <div className="space-y-2 pt-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="h-16 rounded-xl animate-pulse"
                                                    style={{ background: 'rgba(255,255,255,0.04)' }} />
                                            ))}
                                        </div>
                                    ) : personal.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            <User size={36} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">{busqueda ? 'Sin coincidencias' : 'Escribe para buscar personal'}</p>
                                            <p className="text-xs mt-1 opacity-70">Solo aparece personal activo sin cuenta de sistema</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 pt-1">
                                            {personal.map(p => (
                                                <button key={p.id} type="button"
                                                    onClick={() => { setSeleccionado(p); setPaso(2); }}
                                                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all group"
                                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                                        style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                                                        {p.foto_url
                                                            ? <img src={p.foto_url} alt="" className="w-full h-full object-cover" />
                                                            : <User size={18} className="text-blue-400" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-200 truncate">
                                                            {p.nombre} {p.apellido_paterno}{p.apellido_materno ? ` ${p.apellido_materno}` : ''}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            CI {p.ci}{p.ci_complemento ? `-${p.ci_complemento}` : ''} · {p.tipo?.replace(/_/g, ' ')}
                                                            {p.especialidad ? ` · ${p.especialidad}` : ''}
                                                        </p>
                                                    </div>
                                                    <ChevronDown size={14} className="text-slate-600 -rotate-90 shrink-0 group-hover:text-emerald-400 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── PASO 2: datos de acceso ── */}
                            {paso === 2 && !exito && seleccionado && (
                                <div className="space-y-5">
                                    {/* Persona seleccionada */}
                                    <div className="flex items-center gap-3 p-4 rounded-xl"
                                        style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                                            style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}>
                                            {seleccionado.foto_url
                                                ? <img src={seleccionado.foto_url} alt="" className="w-full h-full object-cover" />
                                                : <User size={22} className="text-blue-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">
                                                {seleccionado.nombre} {seleccionado.apellido_paterno}{seleccionado.apellido_materno ? ` ${seleccionado.apellido_materno}` : ''}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                CI {seleccionado.ci}{seleccionado.ci_complemento ? `-${seleccionado.ci_complemento}` : ''} · {seleccionado.tipo?.replace(/_/g, ' ')}
                                            </p>
                                            {seleccionado.especialidad && (
                                                <p className="text-xs text-slate-500">{seleccionado.especialidad}</p>
                                            )}
                                        </div>
                                        <button type="button"
                                            onClick={() => { setPaso(1); setSeleccionado(null); }}
                                            className="text-xs text-slate-500 hover:text-blue-400 transition-colors shrink-0 px-2 py-1 rounded-lg hover:bg-white/[0.06]">
                                            Cambiar
                                        </button>
                                    </div>

                                    {/* Email */}
                                    <GF label="Correo electrónico" required error={errores.email}>
                                        <div className="relative">
                                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => set('email', e.target.value)}
                                                className={`${gI(!!errores.email)} pl-9`}
                                                placeholder="correo@empresa.com"
                                                autoFocus />
                                        </div>
                                    </GF>

                                    {/* Rol */}
                                    <GF label="Rol del sistema" required error={errores.rol_id}>
                                        <RolSelect
                                            value={form.rol_id}
                                            onChange={v => set('rol_id', v)}
                                            roles={roles}
                                            hasErr={!!errores.rol_id} />
                                        {rolSel && (
                                            <div className="mt-2 px-3 py-2 rounded-lg"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                <p className="text-xs text-slate-400">
                                                    {rolSel.descripcion || 'Sin descripción'} ·{' '}
                                                    <span className="text-blue-400 font-medium">{rolSel.permisos?.length || 0} permisos</span>
                                                </p>
                                            </div>
                                        )}
                                    </GF>

                                    {/* Estado inicial */}
                                    <div>
                                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Estado inicial</p>
                                        <div className="flex gap-5">
                                            {[{ v: 'activo', l: 'Activo', c: '#34d399' }, { v: 'inactivo', l: 'Inhabilitado', c: '#f59e0b' }].map(opt => (
                                                <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
                                                    <div onClick={() => set('estado', opt.v)}
                                                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer"
                                                        style={{
                                                            borderColor: form.estado === opt.v ? opt.c : 'rgba(255,255,255,0.2)',
                                                            background: form.estado === opt.v ? opt.c : 'transparent',
                                                        }}>
                                                        {form.estado === opt.v && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                    </div>
                                                    <span className="text-sm text-slate-300">{opt.l}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Info email */}
                                    <div className="flex items-start gap-2 p-3 rounded-xl"
                                        style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                        <Mail size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-slate-400">
                                            Se enviará un correo a{' '}
                                            <span className="text-emerald-400 font-medium">{form.email || '…'}</span>{' '}
                                            con credenciales temporales. El usuario deberá cambiar su contraseña al primer inicio.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ── Éxito ── */}
                            {exito && (
                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 32px rgba(16,185,129,0.2)' }}>
                                        <Check size={30} className="text-emerald-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">¡Acceso asignado!</h3>
                                    <p className="text-sm text-slate-400">
                                        {seleccionado?.nombre} {seleccionado?.apellido_paterno} ya puede acceder al sistema.
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Credenciales enviadas a <span className="text-emerald-400">{form.email}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 shrink-0 flex items-center justify-between gap-3"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                            {!exito ? (
                                <>
                                    <button type="button"
                                        onClick={paso === 1 ? handleClose : () => { setPaso(1); setSeleccionado(null); }}
                                        className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                        {paso === 1 ? 'Cancelar' : '← Atrás'}
                                    </button>
                                    {paso === 2 && (
                                        <button type="button" onClick={handleGuardar} disabled={guardando}
                                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                                            style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                                            {guardando
                                                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                : <Shield size={15} />}
                                            Asignar acceso
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button type="button" onClick={onClose}
                                    className="ml-auto px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all"
                                    style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </motion.div>

                    {/* Confirm close dialog */}
                    <AnimatePresence>
                        {confirmClose && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.93 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.93 }}
                                transition={{ duration: 0.15 }}
                                className="absolute z-[60] w-full max-w-xs p-5 rounded-2xl"
                                style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.13)', boxShadow: '0 24px 48px rgba(0,0,0,0.8)' }}>
                                <div className="flex items-start gap-3 mb-4">
                                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-white">¿Cancelar el proceso?</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Los datos ingresados se perderán.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setConfirmClose(false)}
                                        className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        Continuar
                                    </button>
                                    <button onClick={() => { setConfirmClose(false); onClose(); }}
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                                        style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                                        Sí, cancelar
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </AnimatePresence>
    );
};

export default AsignarAccesoModal;
