import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import personalService from '../../../services/personalService';
import api from '../../../services/api';
import DatePickerInput from '../../../components/ui/DatePickerInput';
import { CheckCircle, Briefcase, FileText, Shield, X, AlertTriangle, ChevronDown } from '../../../components/icons/Icons';

const TIPOS_CONTRATO = [
    { id: 'indefinido', label: 'Indefinido' },
    { id: 'plazo_fijo', label: 'Plazo Fijo' },
    { id: 'obra', label: 'Por Obra' },
    { id: 'consultoria', label: 'Consultoría' },
];

const capitalize = (s) => s.replace(/(?:^|\s)\S/g, c => c.toUpperCase());
const onlyLetras = (s) => s.replace(/[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ\s]/g, '');
const onlyDigits = (s) => s.replace(/\D/g, '');
const maxFnac = () => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d; };

const gi = (hasErr) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'bg-white/5 text-slate-200 placeholder-slate-500',
    'border',
    hasErr
        ? 'border-red-500/50 ring-2 ring-red-500/20'
        : 'border-white/10 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20',
].join(' ');

// Custom glass dropdown — replaces native <select> for consistent dark/light theming
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
        'w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm outline-none text-left transition-all duration-200 bg-white/5 border',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
        hasErr ? 'border-red-500/50 ring-2 ring-red-500/20' : open ? 'border-emerald-500/50 ring-2 ring-emerald-500/20' : 'border-white/10 hover:border-white/20',
    ].join(' ');

    return (
        <div ref={ref} className="relative">
            <button type="button" onClick={() => !disabled && setOpen(v => !v)} className={btnCls}>
                <span className={selected ? 'text-slate-200' : 'text-slate-500'}>{selected?.label || placeholder}</span>
                <ChevronDown size={13} className={`text-slate-400 transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1.5 z-[100] w-full rounded-xl overflow-hidden"
                    style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                    <div className="max-h-52 overflow-y-auto">
                        {options.map(o => {
                            const isSel = String(o.id) === String(value);
                            return (
                                <button key={String(o.id)} type="button"
                                    onClick={() => { onChange(String(o.id)); setOpen(false); }}
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

const LBL = ({ children, required }) => (
    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
        {children}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
);

const ERR = ({ msg }) => msg ? <p className="text-xs text-red-400 mt-1">{msg}</p> : null;

const SectionHeader = ({ icon, title, color }) => {
    const palettes = {
        emerald: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#34d399' },
        blue:    { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa' },
        amber:   { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#fbbf24' },
    };
    const p = palettes[color] || palettes.emerald;
    return (
        <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text }}>
                {icon}
            </div>
            <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
    );
};

const EditarPersonal = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [confirmando, setConfirmando] = useState(false);
    const [errores, setErrores] = useState({});
    const [codigoEmpleado, setCodigoEmpleado] = useState('');
    const [nombreCompleto, setNombreCompleto] = useState('');
    const [roles, setRoles] = useState([]);

    useEffect(() => {
        api.get('/roles', { params: { estado: 'activo' } })
            .then(r => setRoles(r.data?.data?.data ?? []))
            .catch(() => {});
    }, []);

    const isGerenteOrFinanzas = user?.rol?.nombre === 'gerente' || user?.rol?.nombre === 'encargado_finanzas';

    const [f, setF] = useState({
        nombre: '', apellido_paterno: '', apellido_materno: '',
        ci: '', ci_complemento: '', fecha_nacimiento: '', telefono: '', direccion: '',
        rol_id: '', especialidad: '', categoria: '', fecha_contratacion: '',
        tipo_contrato: '', salario_base: '', frecuencia_pago: 'mensual',
        banco: '', numero_cuenta: '', tipo_cuenta: '',
    });

    const cargar = useCallback(async () => {
        try {
            setLoading(true);
            const res = await personalService.obtener(id);
            const p = res.data.personal;
            setCodigoEmpleado(p.codigo_empleado);
            setNombreCompleto(`${p.nombre} ${p.apellido_paterno}`);
            setF({
                nombre: p.nombre || '',
                apellido_paterno: p.apellido_paterno || '',
                apellido_materno: p.apellido_materno || '',
                ci: p.ci || '',
                ci_complemento: p.ci_complemento || '',
                fecha_nacimiento: p.fecha_nacimiento ? p.fecha_nacimiento.substring(0, 10) : '',
                telefono: p.telefono || '',
                direccion: p.direccion || '',
                rol_id: p.rol_id ? String(p.rol_id) : '',
                especialidad: p.especialidad || '',
                categoria: p.categoria || '',
                fecha_contratacion: p.fecha_contratacion ? p.fecha_contratacion.substring(0, 10) : '',
                tipo_contrato: p.tipo_contrato || '',
                salario_base: p.salario_base ?? '',
                frecuencia_pago: p.frecuencia_pago || 'mensual',
                banco: p.banco || '',
                numero_cuenta: p.numero_cuenta || '',
                tipo_cuenta: p.tipo_cuenta || '',
            });
        } catch {
            toast.error('Error al cargar personal');
            navigate('/dashboard/personal');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    const setField = (name, val) => {
        setF(prev => ({ ...prev, [name]: val }));
        setErrores(prev => { const n = { ...prev }; delete n[name]; return n; });
    };

    const handleTextLetras = (name, raw, max) => {
        const cleaned = onlyLetras(raw);
        const v = capitalize(cleaned).slice(0, max);
        setF(prev => ({ ...prev, [name]: v }));
        if (!v.trim()) {
            setErrores(prev => ({ ...prev, [name]: 'Solo se permiten letras' }));
        } else {
            setErrores(prev => { const n = { ...prev }; delete n[name]; return n; });
        }
    };

    const handleDigits = (name, raw, max) => {
        setField(name, onlyDigits(raw).slice(0, max));
    };

    const validate = () => {
        const err = {};
        if (!f.nombre.trim()) err.nombre = 'Obligatorio';
        if (!f.apellido_paterno.trim()) err.apellido_paterno = 'Obligatorio';
        if (!f.ci.trim()) err.ci = 'Obligatorio';
        if (!f.fecha_contratacion) err.fecha_contratacion = 'Obligatorio';
        if (isGerenteOrFinanzas && f.salario_base !== '' && Number(f.salario_base) < 0)
            err.salario_base = 'El monto no puede ser negativo';
        return err;
    };

    const handleSave = () => {
        const err = validate();
        if (Object.keys(err).length > 0) {
            setErrores(err);
            return toast.error('Corrige los errores antes de continuar');
        }
        setConfirmando(true);
    };

    const handleConfirmar = async () => {
        try {
            setSaving(true);
            const payload = { ...f, rol_id: f.rol_id ? parseInt(f.rol_id) : undefined };
            if (!isGerenteOrFinanzas) {
                delete payload.salario_base;
                delete payload.frecuencia_pago;
                delete payload.banco;
                delete payload.numero_cuenta;
                delete payload.tipo_cuenta;
            }
            await personalService.actualizar(id, payload);
            toast.success('Personal actualizado correctamente');
            navigate(`/dashboard/personal/${id}`);
        } catch (e) {
            if (e.response?.status === 422) {
                const se = e.response.data.errors || {};
                const flat = {};
                Object.keys(se).forEach(k => { flat[k] = se[k][0]; });
                setErrores(flat);
                toast.error('Errores de validación del servidor');
            } else {
                toast.error(e.response?.data?.message || 'Error al actualizar');
            }
            setConfirmando(false);
        } finally {
            setSaving(false);
        }
    };

    const goBack = () => navigate(`/dashboard/personal/${id}`);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(12px)' }}>
                <div className="w-full max-w-2xl mx-4 rounded-2xl p-10 flex flex-col items-center gap-4"
                    style={{ background: 'rgba(12,18,36,0.95)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
                    <p className="text-sm text-slate-400">Cargando datos...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50"
                style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
                onClick={goBack}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 pointer-events-none">
                <div
                    className="relative w-full max-w-2xl pointer-events-auto mb-8"
                    style={{
                        background: 'rgba(12,18,36,0.92)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '1.5rem',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Top reflection */}
                    <div className="absolute inset-x-0 top-0 h-px rounded-t-3xl"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 pointer-events-none"
                        style={{ background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.10) 0%, transparent 70%)' }} />

                    {/* Header */}
                    <div className="relative flex items-start justify-between px-7 pt-7 pb-5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <div>
                            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-[0.12em] mb-1">{codigoEmpleado}</p>
                            <h2 className="text-xl font-bold text-white">Editar Personal</h2>
                            <p className="text-sm text-slate-400 mt-0.5">{nombreCompleto}</p>
                        </div>
                        <button type="button" onClick={goBack}
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-7 py-6 space-y-8">

                        {/* ── Datos Personales ── */}
                        <section>
                            <SectionHeader icon={<FileText size={15} />} title="Datos Personales" color="emerald" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Nombre */}
                                <div>
                                    <LBL required>Nombre(s)</LBL>
                                    <input
                                        className={gi(!!errores.nombre)}
                                        value={f.nombre}
                                        placeholder="Ej: Juan Carlos"
                                        onChange={e => handleTextLetras('nombre', e.target.value, 30)}
                                        maxLength={30}
                                    />
                                    <div className="flex justify-between mt-0.5">
                                        <ERR msg={errores.nombre} />
                                        <span className="text-[10px] text-slate-600 ml-auto">{f.nombre.length}/30</span>
                                    </div>
                                </div>

                                {/* Apellido Paterno */}
                                <div>
                                    <LBL required>Apellido Paterno</LBL>
                                    <input
                                        className={gi(!!errores.apellido_paterno)}
                                        value={f.apellido_paterno}
                                        placeholder="Ej: García"
                                        onChange={e => handleTextLetras('apellido_paterno', e.target.value, 20)}
                                        maxLength={20}
                                    />
                                    <div className="flex justify-between mt-0.5">
                                        <ERR msg={errores.apellido_paterno} />
                                        <span className="text-[10px] text-slate-600 ml-auto">{f.apellido_paterno.length}/20</span>
                                    </div>
                                </div>

                                {/* Apellido Materno */}
                                <div>
                                    <LBL>Apellido Materno</LBL>
                                    <input
                                        className={gi(false)}
                                        value={f.apellido_materno}
                                        placeholder="Opcional"
                                        onChange={e => handleTextLetras('apellido_materno', e.target.value, 20)}
                                        maxLength={20}
                                    />
                                    <span className="text-[10px] text-slate-600">{f.apellido_materno.length}/20</span>
                                </div>

                                {/* CI + Ext */}
                                <div>
                                    <LBL required>C.I.</LBL>
                                    <div className="flex gap-2">
                                        <input
                                            className={gi(!!errores.ci) + ' flex-1'}
                                            value={f.ci}
                                            placeholder="Nro. de identidad"
                                            onChange={e => handleDigits('ci', e.target.value, 15)}
                                            maxLength={15}
                                        />
                                        <input
                                            className={gi(false) + ' w-20'}
                                            value={f.ci_complemento}
                                            placeholder="Ext."
                                            onChange={e => setField('ci_complemento', e.target.value.slice(0, 5).toUpperCase())}
                                            maxLength={5}
                                        />
                                    </div>
                                    <ERR msg={errores.ci} />
                                </div>

                                {/* Fecha Nacimiento */}
                                <div>
                                    <DatePickerInput
                                        label="Fecha de Nacimiento"
                                        value={f.fecha_nacimiento}
                                        onChange={v => setField('fecha_nacimiento', v)}
                                        maxDate={maxFnac()}
                                        error={errores.fecha_nacimiento}
                                        placeholder="Mayor de 18 años"
                                    />
                                </div>

                                {/* Teléfono */}
                                <div>
                                    <LBL>Teléfono</LBL>
                                    <input
                                        className={gi(false)}
                                        value={f.telefono}
                                        placeholder="Ej: 70000000"
                                        onChange={e => handleDigits('telefono', e.target.value, 10)}
                                        maxLength={10}
                                    />
                                </div>

                                {/* Dirección */}
                                <div className="sm:col-span-2">
                                    <LBL>Dirección</LBL>
                                    <input
                                        className={gi(false)}
                                        value={f.direccion}
                                        placeholder="Dirección de domicilio"
                                        onChange={e => setField('direccion', e.target.value.slice(0, 60))}
                                        maxLength={60}
                                    />
                                    <span className="text-[10px] text-slate-600">{f.direccion.length}/60</span>
                                </div>
                            </div>
                        </section>

                        {/* ── Info Laboral ── */}
                        <section>
                            <SectionHeader icon={<Briefcase size={15} />} title="Información Laboral" color="blue" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <LBL required>Rol</LBL>
                                    <GlassSelect
                                        value={f.rol_id}
                                        onChange={v => setField('rol_id', v)}
                                        options={roles.map(r => ({ id: String(r.id), label: r.nombre_visible }))}
                                        hasErr={!!errores.rol_id}
                                    />
                                    <ERR msg={errores.rol_id} />
                                </div>

                                <div>
                                    <LBL>Especialidad</LBL>
                                    <input className={gi(false)} value={f.especialidad} placeholder="Ej: Albañilería"
                                        onChange={e => setField('especialidad', e.target.value)} />
                                </div>

                                <div>
                                    <LBL>Categoría</LBL>
                                    <input className={gi(false)} value={f.categoria} placeholder="Ej: Senior"
                                        onChange={e => setField('categoria', e.target.value)} />
                                </div>

                                <div>
                                    <LBL required>Tipo de Contrato</LBL>
                                    <GlassSelect value={f.tipo_contrato} onChange={v => setField('tipo_contrato', v)} options={TIPOS_CONTRATO} />
                                </div>

                                <div className="sm:col-span-2">
                                    <DatePickerInput
                                        label="Fecha de Contratación"
                                        value={f.fecha_contratacion}
                                        onChange={v => setField('fecha_contratacion', v)}
                                        error={errores.fecha_contratacion}
                                        required
                                        placeholder="dd/mm/aaaa"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* ── Compensación ── */}
                        {isGerenteOrFinanzas ? (
                            <section>
                                <SectionHeader icon={<FileText size={15} />} title="Compensación" color="amber" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <LBL>Salario Base (Bs.)</LBL>
                                        <input
                                            type="number"
                                            className={gi(!!errores.salario_base)}
                                            value={f.salario_base}
                                            onChange={e => setField('salario_base', e.target.value)}
                                            placeholder="0.00"
                                            min="0"
                                        />
                                        <ERR msg={errores.salario_base} />
                                    </div>

                                    <div>
                                        <LBL>Frecuencia de Pago</LBL>
                                        <GlassSelect value={f.frecuencia_pago} onChange={v => setField('frecuencia_pago', v)}
                                            options={[{ id: 'mensual', label: 'Mensual' }, { id: 'quincenal', label: 'Quincenal' }, { id: 'semanal', label: 'Semanal' }]} />
                                    </div>

                                    <div>
                                        <LBL>Banco</LBL>
                                        <GlassSelect value={f.banco}
                                            onChange={v => setF(p => ({ ...p, banco: v, numero_cuenta: v ? p.numero_cuenta : '', tipo_cuenta: v ? p.tipo_cuenta : '' }))}
                                            options={[
                                                { id: '', label: 'Ninguno' },
                                                { id: 'BNB', label: 'BNB' },
                                                { id: 'Mercantil Santa Cruz', label: 'Mercantil Santa Cruz' },
                                                { id: 'BCP', label: 'BCP' },
                                                { id: 'Fassil', label: 'Fassil' },
                                                { id: 'Económico', label: 'Económico' },
                                                { id: 'Nacional de Bolivia', label: 'Nacional de Bolivia' },
                                            ]} />
                                    </div>

                                    <div>
                                        <LBL>Tipo de Cuenta</LBL>
                                        <GlassSelect value={f.tipo_cuenta} onChange={v => setField('tipo_cuenta', v)} disabled={!f.banco}
                                            options={[{ id: '', label: 'Seleccionar...' }, { id: 'ahorro', label: 'Caja de Ahorro' }, { id: 'corriente', label: 'Cuenta Corriente' }]} />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <LBL>Número de Cuenta</LBL>
                                        <input
                                            className={gi(false)}
                                            value={f.numero_cuenta}
                                            disabled={!f.banco}
                                            placeholder={f.banco ? 'Número de cuenta bancaria' : 'Selecciona un banco primero'}
                                            onChange={e => setField('numero_cuenta', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </section>
                        ) : (
                            <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <Shield size={16} className="text-slate-500 shrink-0" />
                                <p className="text-sm text-slate-500">Compensación y datos bancarios — sección restringida</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-7 py-5"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        <button type="button" onClick={goBack}
                            className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Cancelar
                        </button>
                        <button type="button" onClick={handleSave} disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all disabled:opacity-60"
                            style={{
                                background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.85))',
                                boxShadow: '0 4px 16px rgba(16,185,129,0.28)',
                            }}>
                            <CheckCircle size={15} />
                            Guardar cambios
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation overlay */}
            {confirmando && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                        onClick={() => !saving && setConfirmando(false)} />
                    <div className="relative w-full max-w-sm rounded-2xl p-6 z-10"
                        style={{
                            background: 'rgba(12,18,36,0.98)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
                        }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
                                <AlertTriangle size={18} className="text-emerald-400" />
                            </div>
                            <h3 className="text-base font-bold text-white">Confirmar cambios</h3>
                        </div>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            ¿Estás seguro de guardar los cambios en{' '}
                            <span className="text-white font-semibold">{nombreCompleto}</span>?
                            Esta acción actualizará el registro de personal.
                        </p>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setConfirmando(false)} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                Revisar
                            </button>
                            <button type="button" onClick={handleConfirmar} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                                style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.9), rgba(5,150,105,0.85))' }}>
                                {saving
                                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <CheckCircle size={15} />}
                                {saving ? 'Guardando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default EditarPersonal;
