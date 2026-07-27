import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import proyectoService from '../../../services/proyectoService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';
import api from '../../../services/api';
import Skeleton from '../../../components/ui/Skeleton';
import { Briefcase, ArrowLeft, Check, MapPin, AlertTriangle, TrendingUp, TrendingDown } from '../../../components/icons/Icons';
import { parseGPSInput, decimalToGMS } from '../../../utils/gps';
import MapLocationPicker from '../../../components/ui/MapLocationPicker';

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

const gI = (err = false, disabled = false) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-100 placeholder-slate-600',
    'bg-white/[0.05] border',
    err ? 'ring-2 ring-red-500/40 border-red-500/30'
        : disabled ? 'border-white/[0.06]'
        : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

const GlassSelect = ({ value, onChange, disabled, children }) => (
    <select value={value} onChange={onChange} disabled={disabled}
        className={[
            'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all',
            disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-100',
            'bg-white/[0.05] border border-white/[0.09] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
        ].join(' ')}>
        {children}
    </select>
);

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

const GpsField = ({ label, value, onChange, isLat, error }) => {
    const [raw, setRaw] = useState(value != null && value !== '' ? decimalToGMS(value, isLat) : '');
    const [gpsErr, setGpsErr] = useState('');

    // Sincronizar 'raw' si 'value' cambia desde afuera (ej: clic en el mapa)
    useEffect(() => {
        if (value != null && value !== '') {
            setRaw(decimalToGMS(value, isLat));
        } else {
            setRaw('');
        }
    }, [value, isLat]);

    const handleBlur = () => {
        if (!raw.trim()) { onChange(null); setGpsErr(''); return; }
        const { decimal, error: parseError } = parseGPSInput(raw, isLat);
        if (decimal === null) { setGpsErr(parseError || 'Formato inválido — usa GMS (17°23\'45.6"S) o decimal (-17.3960)'); return; }
        setGpsErr('');
        onChange(decimal);
        setRaw(decimalToGMS(decimal, isLat));
    };

    return (
        <GF label={label} error={error || gpsErr}>
            <div className="relative flex gap-2">
                <div className="relative flex-1">
                    <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        className={gI(!!(error || gpsErr)) + ' pl-8'}
                        value={raw}
                        onChange={e => { setRaw(e.target.value); setGpsErr(''); }}
                        onBlur={handleBlur}
                        placeholder={isLat ? '17°23\'45.6"S  ó  -17.3960' : '66°09\'12.3"W  ó  -66.1534'}
                    />
                </div>
            </div>
        </GF>
    );
};

const EditarProyecto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [proyecto, setProyecto] = useState(null);
    const [zonas, setZonas] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [configFinanciera, setConfigFinanciera] = useState({});
    const [errores, setErrores] = useState({});

    const [form, setForm] = useState({
        nombre: '', descripcion: '', prioridad: 'media', zona_id: '', responsable_id: '',
        presupuesto_referencial: '', monto_contrato: '', monto_contractual: '', cantidad_unidades: '',
        porcentaje_mano_obra: '', porcentaje_gastos_generales: '', porcentaje_utilidad_esperada: '', justificacion_rentabilidad_baja: '',
        fecha_inicio_planificada: '', fecha_fin_planificada: '',
        fecha_inicio_real: '', fecha_fin_real: '',
        direccion_obra: '', observaciones: '', latitud: '', longitud: '',
    });

    useEffect(() => {
        const cargar = async () => {
            try {
                setCargando(true);
                const [res, zonasRes, usuariosRes, cfgRes] = await Promise.all([
                    proyectoService.obtener(id),
                    zonaGeograficaService.listar(),
                    api.get('/usuarios', { params: { estado: 'activo', per_page: 300 } }).catch(() => ({ data: { data: [] } })),
                    api.get('/configuracion/porcentajes-presupuesto').catch(() => ({ data: { data: {} } })),
                ]);
                const p = res.proyecto;
                setProyecto(p);
                setForm({
                    nombre: p.nombre || '',
                    descripcion: p.descripcion || '',
                    prioridad: p.prioridad || 'media',
                    zona_id: p.zona_id || '',
                    responsable_id: p.responsable_id || '',
                    presupuesto_referencial: p.presupuesto_referencial || '',
                    monto_contrato: p.monto_contrato || '',
                    monto_contractual: p.monto_contractual || p.monto_contrato || p.presupuesto_referencial || '',
                    porcentaje_mano_obra: p.porcentaje_mano_obra || '',
                    porcentaje_gastos_generales: p.porcentaje_gastos_generales || '',
                    porcentaje_utilidad_esperada: p.porcentaje_utilidad_esperada || '',
                    justificacion_rentabilidad_baja: p.justificacion_rentabilidad_baja || '',
                    cantidad_unidades: p.cantidad_unidades || '',
                    fecha_inicio_planificada: p.fecha_inicio_planificada?.split('T')[0] || '',
                    fecha_fin_planificada: p.fecha_fin_planificada?.split('T')[0] || '',
                    fecha_inicio_real: p.fecha_inicio_real?.split('T')[0] || '',
                    fecha_fin_real: p.fecha_fin_real?.split('T')[0] || '',
                    direccion_obra: p.direccion_obra || '',
                    latitud: p.latitud || '',
                    longitud: p.longitud || '',
                    observaciones: p.observaciones || '',
                });
                setZonas(zonasRes || []);
                setUsuarios(usuariosRes.data?.data?.data ?? usuariosRes.data?.data ?? []);
                setConfigFinanciera(cfgRes.data?.data ?? {});
            } catch {
                toast.error('Error al cargar el proyecto');
                navigate('/dashboard/proyectos');
            } finally { setCargando(false); }
        };
        cargar();
    }, [id, navigate]);

    const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); if (errores[k]) setErrores(p => ({ ...p, [k]: null })); };

    const handleSubmit = async () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (form.fecha_inicio_planificada && form.fecha_fin_planificada) {
            const ini = new Date(form.fecha_inicio_planificada + 'T00:00:00');
            const fin = new Date(form.fecha_fin_planificada + 'T00:00:00');
            const minFin = new Date(ini); minFin.setDate(ini.getDate() + 30);
            const maxFin = new Date(ini); maxFin.setFullYear(ini.getFullYear() + 4);
            if (fin < minFin) e.fecha_fin_planificada = 'Debe ser al menos 30 días después del inicio';
            else if (fin > maxFin) e.fecha_fin_planificada = 'No puede superar 4 años desde el inicio';
        }
        setErrores(e);
        if (Object.keys(e).length) return;

        try {
            setGuardando(true);
            const payload = { ...form };
            Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
            await proyectoService.actualizar(id, payload);
            toast.success('Proyecto actualizado');
            navigate(`/dashboard/proyectos/${id}`);
        } catch (ex) {
            toast.error(ex.message || 'Error al actualizar');
            if (ex.errors) setErrores(ex.errors);
        } finally { setGuardando(false); }
    };

    if (cargando) return (
        <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton height="1.5rem" width="240px" />
            <Skeleton height="500px" className="rounded-2xl" />
        </div>
    );
    if (!proyecto) return null;

    const esSocial = proyecto.categoria === 'social';

    const minFinStr = form.fecha_inicio_planificada
        ? (() => { const d = new Date(form.fecha_inicio_planificada + 'T00:00:00'); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })()
        : '';
    const maxFinStr = form.fecha_inicio_planificada
        ? (() => { const d = new Date(form.fecha_inicio_planificada + 'T00:00:00'); d.setFullYear(d.getFullYear() + 4); return d.toISOString().split('T')[0]; })()
        : '';

    /* ── Cálculos Financieros ── */
    const montoContractual = parseFloat(form.monto_contractual || 0);
    const cfgActual = configFinanciera?.[proyecto.categoria] ?? {};
    const pctMO   = parseFloat(form.porcentaje_mano_obra        || cfgActual.porcentaje_mano_obra        || 0);
    const pctGG   = parseFloat(form.porcentaje_gastos_generales || cfgActual.porcentaje_gastos_generales || 0);
    const pctUtil = parseFloat(form.porcentaje_utilidad_esperada || cfgActual.porcentaje_utilidad_esperada || 0);
    const presupMO   = montoContractual * pctMO   / 100;
    const presupGG   = montoContractual * pctGG   / 100;
    const presupUtil = montoContractual * pctUtil / 100;
    const presupMat  = montoContractual - presupMO - presupGG - presupUtil;
    const umbral     = parseFloat(cfgActual.umbral_rentabilidad_minima ?? 5);
    const bajaRentabilidad = montoContractual > 0 && pctUtil < umbral;
    const saludFinanciera  = montoContractual <= 0 ? 'sin_datos'
        : pctUtil >= umbral + 5 ? 'saludable'
        : pctUtil >= umbral     ? 'atencion'
        :                         'critico';
    const colorSalud = { saludable: '#34d399', atencion: '#fbbf24', critico: '#f87171', sin_datos: '#64748b' }[saludFinanciera];
    const labelSalud = { saludable: 'Saludable', atencion: 'Atención', critico: 'Crítico', sin_datos: 'Sin datos' }[saludFinanciera];
    const bs = n => `Bs. ${Math.round(n || 0).toLocaleString('es-BO')}`;

    const FinBar = ({ label, monto, total, color }) => {
        const pct = total > 0 ? Math.max(0, Math.min(100, monto / total * 100)) : 0;
        return (
            <div>
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] text-slate-400">{label}</span>
                    <span className="text-[11px] font-medium text-slate-300">{bs(monto)} <span className="text-slate-600">({pct.toFixed(1)}%)</span></span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in max-w-3xl mx-auto">
            <button onClick={() => navigate(`/dashboard/proyectos/${id}`)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors mb-6">
                <ArrowLeft size={16} /> Volver al detalle
            </button>

            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <Briefcase size={22} className="text-blue-400" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-white">Editar Proyecto</h1>
                    <p className="text-sm text-slate-500">
                        <span className="font-mono text-slate-400">{proyecto.codigo}</span>
                        <span className="mx-2">·</span>
                        <span style={{ color: esSocial ? '#22d3ee' : '#a78bfa' }} className="font-medium capitalize">
                            {esSocial ? 'Social' : 'Privado'}
                        </span>
                    </p>
                </div>
            </div>

            <div className="space-y-5">
                {/* Datos de referencia (readonly) */}
                <GlassCard title="Referencia (solo lectura)" accent="#64748b">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Categoría</p>
                            <p style={{ color: esSocial ? '#22d3ee' : '#a78bfa' }} className="font-medium capitalize">{esSocial ? 'Social' : 'Privado'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Estado</p>
                            <p className="text-slate-300 capitalize">{proyecto.estado?.replace(/_/g, ' ')}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Contraparte</p>
                            <p className="text-slate-300">{esSocial ? proyecto.entidad_estatal?.nombre : proyecto.cliente?.nombre_visible || '—'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Código</p>
                            <p className="font-mono text-slate-300">{proyecto.codigo}</p>
                        </div>
                    </div>
                </GlassCard>

                {/* Identidad */}
                <GlassCard title="Identidad" accent="#34d399">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <GF label="Nombre del Proyecto" required error={errores.nombre}>
                                <input className={gI(!!errores.nombre)} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                            </GF>
                        </div>
                        <div className="sm:col-span-2">
                            <GF label="Descripción">
                                <textarea rows={3} className={gI(false) + ' resize-none'} value={form.descripcion}
                                    onChange={e => set('descripcion', e.target.value)} placeholder="Descripción del proyecto..." />
                            </GF>
                        </div>
                        <GF label="Zona Geográfica">
                            <GlassSelect value={form.zona_id} onChange={e => set('zona_id', e.target.value)}>
                                <option value="">— Sin zona —</option>
                                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                            </GlassSelect>
                        </GF>
                        <GF label="Responsable / Administrador">
                            <GlassSelect value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)}>
                                <option value="">— Sin asignar —</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido_paterno}</option>)}
                            </GlassSelect>
                        </GF>
                        <div className="sm:col-span-2">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-2">Prioridad</label>
                            <div className="flex gap-2">
                                {[
                                    { val: 'baja', label: 'Baja', color: '#64748b' },
                                    { val: 'media', label: 'Media', color: '#60a5fa' },
                                    { val: 'alta', label: 'Alta', color: '#fbbf24' },
                                    { val: 'critica', label: 'Crítica', color: '#f87171' },
                                ].map(p => (
                                    <label key={p.val} className="flex-1 flex items-center justify-center py-2.5 rounded-xl cursor-pointer transition-all text-sm font-medium"
                                        style={{
                                            background: form.prioridad === p.val ? `${p.color}1a` : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${form.prioridad === p.val ? `${p.color}60` : 'rgba(255,255,255,0.08)'}`,
                                            color: form.prioridad === p.val ? p.color : '#64748b',
                                        }}>
                                        <input type="radio" name="prioridad" value={p.val} checked={form.prioridad === p.val}
                                            onChange={e => set('prioridad', e.target.value)} className="hidden" />
                                        {p.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </GlassCard>

                {/* Finanzas */}
                <GlassCard title="Finanzas y Rentabilidad" accent="#60a5fa">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <GF label="Monto Contractual / Presupuesto (Bs.)" required error={errores.monto_contractual}>
                                <input type="number" min="0" step="0.01" className={gI(!!errores.monto_contractual)}
                                    value={form.monto_contractual} 
                                    onChange={e => {
                                        set('monto_contractual', e.target.value);
                                        set('monto_contrato', e.target.value);
                                        set('presupuesto_referencial', e.target.value);
                                    }} 
                                    placeholder="0.00" />
                            </GF>
                            <GF label="% Mano de Obra" error={errores.porcentaje_mano_obra}>
                                <div className="relative">
                                    <input type="number" min="0" max="100" step="0.01" className={gI(!!errores.porcentaje_mano_obra)}
                                        value={form.porcentaje_mano_obra} onChange={e => set('porcentaje_mano_obra', e.target.value)} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                </div>
                            </GF>
                            <GF label="% Gastos Generales" error={errores.porcentaje_gastos_generales}>
                                <div className="relative">
                                    <input type="number" min="0" max="100" step="0.01" className={gI(!!errores.porcentaje_gastos_generales)}
                                        value={form.porcentaje_gastos_generales} onChange={e => set('porcentaje_gastos_generales', e.target.value)} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                </div>
                            </GF>
                            <GF label="% Utilidad Esperada" error={errores.porcentaje_utilidad_esperada}>
                                <div className="relative">
                                    <input type="number" min="0" max="100" step="0.01" className={gI(!!errores.porcentaje_utilidad_esperada)}
                                        value={form.porcentaje_utilidad_esperada} onChange={e => set('porcentaje_utilidad_esperada', e.target.value)} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">%</span>
                                </div>
                            </GF>
                        </div>

                        {bajaRentabilidad && (
                            <GF label="Justificación de Rentabilidad Baja" required error={errores.justificacion_rentabilidad_baja}>
                                <textarea rows={2} className={gI(!!errores.justificacion_rentabilidad_baja) + ' resize-none'}
                                    value={form.justificacion_rentabilidad_baja}
                                    onChange={e => set('justificacion_rentabilidad_baja', e.target.value)}
                                    placeholder="Explica por qué la utilidad es menor al umbral mínimo..." />
                            </GF>
                        )}

                        {montoContractual > 0 && (
                            <div className="rounded-2xl p-5 space-y-4" style={{ background: `${colorSalud}06`, border: `1px solid ${colorSalud}30` }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vista Previa Financiera (Recálculo Dinámico)</p>
                                    </div>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1.5" style={{ background: `${colorSalud}20`, color: colorSalud }}>
                                        {saludFinanciera !== 'sin_datos' && (
                                            <>{bajaRentabilidad ? <TrendingDown size={14} /> : <TrendingUp size={14} />}</>
                                        )}
                                        {labelSalud}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <FinBar label="Materiales (Calculado)" monto={presupMat} total={montoContractual} color="#60a5fa" />
                                    <FinBar label={`Mano de Obra (${pctMO}%)`} monto={presupMO} total={montoContractual} color="#a78bfa" />
                                    <FinBar label={`Gastos Generales (${pctGG}%)`} monto={presupGG} total={montoContractual} color="#fbbf24" />
                                    <FinBar label={`Utilidad Esperada (${pctUtil}%)`} monto={presupUtil} total={montoContractual} color={colorSalud} />
                                </div>
                                {bajaRentabilidad && (
                                    <div className="flex items-center gap-2 mt-2 p-2.5 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                        <AlertTriangle size={13} className="text-red-400 shrink-0" />
                                        <p className="text-[11px] text-red-400">Rentabilidad por debajo del umbral mínimo de {umbral}%. Se requiere justificación.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </GlassCard>

                {/* Cronograma */}
                <GlassCard title="Cronograma" accent="#a78bfa">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <GF label="Inicio Planificado">
                            <input type="date" className={gI(false)} value={form.fecha_inicio_planificada} onChange={e => set('fecha_inicio_planificada', e.target.value)} />
                        </GF>
                        <GF label="Fin Planificado" error={errores.fecha_fin_planificada}>
                            <input type="date" className={gI(!!errores.fecha_fin_planificada)}
                                min={minFinStr} max={maxFinStr}
                                value={form.fecha_fin_planificada} onChange={e => set('fecha_fin_planificada', e.target.value)} />
                        </GF>
                        <GF label="Inicio Real">
                            <input type="date" className={gI(false)} value={form.fecha_inicio_real} onChange={e => set('fecha_inicio_real', e.target.value)} />
                        </GF>
                        <GF label="Fin Real">
                            <input type="date" className={gI(false)} value={form.fecha_fin_real} onChange={e => set('fecha_fin_real', e.target.value)} />
                        </GF>
                    </div>
                </GlassCard>

                {/* Ubicación */}
                <GlassCard title="Ubicación y Notas" accent="#fbbf24">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <GF label="Dirección de Obra">
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input className={gI(false) + ' pl-8'} value={form.direccion_obra} onChange={e => set('direccion_obra', e.target.value)} placeholder="Av. Principal 123..." />
                                </div>
                            </GF>
                        </div>
                        <GpsField label="Latitud (GPS)" value={form.latitud} onChange={v => set('latitud', v ?? '')} isLat={true} error={errores.latitud} />
                        <GpsField label="Longitud (GPS)" value={form.longitud} onChange={v => set('longitud', v ?? '')} isLat={false} error={errores.longitud} />
                        <div className="sm:col-span-2 flex justify-end">
                            <button 
                                type="button"
                                onClick={() => {
                                    if (navigator.geolocation) {
                                        navigator.geolocation.getCurrentPosition((position) => {
                                            set('latitud', position.coords.latitude);
                                            set('longitud', position.coords.longitude);
                                            toast.success('Ubicación obtenida');
                                        }, () => toast.error('Error al obtener ubicación'));
                                    } else {
                                        toast.error('Geolocalización no soportada');
                                    }
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                            >
                                📍 Usar mi ubicación actual
                            </button>
                        </div>
                        <div className="sm:col-span-2">
                            <MapLocationPicker 
                                latitud={form.latitud} 
                                longitud={form.longitud} 
                                onChange={(lat, lng) => {
                                    set('latitud', lat);
                                    set('longitud', lng);
                                }} 
                            />
                        </div>
                        <div className="sm:col-span-2 mt-2">
                            <GF label="Observaciones">
                                <textarea rows={3} className={gI(false) + ' resize-none'} value={form.observaciones}
                                    onChange={e => set('observaciones', e.target.value)} placeholder="Información adicional..." />
                            </GF>
                        </div>
                    </div>
                </GlassCard>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-1">
                    <button onClick={() => navigate(`/dashboard/proyectos/${id}`)}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={guardando}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all"
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                        {guardando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={16} />}
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditarProyecto;
