import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import proyectoService from '../../../services/proyectoService';
import zonaGeograficaService from '../../../services/zonaGeograficaService';
import api from '../../../services/api';
import Skeleton from '../../../components/ui/Skeleton';
import { parseGPSInput, decimalToGMS } from '../../../utils/gps';
import {
    Briefcase, Users, Building, ArrowLeft, Check, ChevronRight,
    Plus, Trash2, Upload, X, MapPin, TrendingUp, TrendingDown, AlertTriangle,
} from '../../../components/icons/Icons';

/* ── Design helpers ── */
const GF = ({ label, error, children, required, hint }) => (
    <div>
        {label && (
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                {label}{required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
        )}
        {children}
        {hint && !error && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
        {error && <p className="text-xs text-red-400 mt-1">{Array.isArray(error) ? error[0] : error}</p>}
    </div>
);

const gI = (err = false, disabled = false) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-100 placeholder-slate-600',
    'bg-white/[0.05] border',
    err
        ? 'ring-2 ring-red-500/40 border-red-500/30'
        : disabled ? 'border-white/[0.06]'
        : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

const GlassSelect = ({ value, onChange, error, children, disabled }) => (
    <select value={value} onChange={onChange} disabled={disabled}
        style={{ background: '#0d1526' }}
        className={[
            'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
            disabled ? 'opacity-40 cursor-not-allowed text-slate-500' : 'text-slate-100',
            'border',
            error
                ? 'ring-2 ring-red-500/40 border-red-500/30'
                : disabled ? 'border-white/[0.06]'
                : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
        ].join(' ')}>
        {children}
    </select>
);

const SectionCard = ({ title, accent = '#34d399', children }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {title && (
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: accent }}>{title}</h3>
            </div>
        )}
        <div className="p-5">{children}</div>
    </div>
);

const PASOS = ['Tipo y Contraparte', 'Planificación y Detalles', 'Revisión Financiera'];

const StepBar = ({ paso }) => (
    <div className="flex items-center gap-0 mb-7">
        {PASOS.map((label, i) => {
            const idx = i + 1;
            const done = paso > idx;
            const active = paso === idx;
            return (
                <React.Fragment key={idx}>
                    <div className="flex flex-col items-center">
                        <div className={[
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                            done ? 'bg-emerald-500 text-white' : active ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' : 'bg-white/[0.06] border border-white/[0.12] text-slate-500',
                        ].join(' ')}>
                            {done ? <Check size={14} /> : idx}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-medium ${active ? 'text-emerald-400' : done ? 'text-slate-400' : 'text-slate-600'}`}>
                            {label}
                        </span>
                    </div>
                    {i < PASOS.length - 1 && (
                        <div className="flex-1 h-px mx-3 mt-[-14px]"
                            style={{ background: paso > idx + 1 ? '#34d399' : paso > idx ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)' }} />
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

/* ── GPS field ── */
const GpsField = ({ label, value, onChange, isLat, error }) => {
    const [raw, setRaw] = useState(value != null && value !== '' ? decimalToGMS(value, isLat) : '');
    const [gpsErr, setGpsErr] = useState('');

    const handleBlur = () => {
        if (!raw.trim()) { onChange(null); setGpsErr(''); return; }
        const parsed = parseGPSInput(raw);
        if (parsed === null) { setGpsErr('Formato inválido — usa GMS (17°23\'45.6"S) o decimal (-17.3960)'); return; }
        setGpsErr('');
        onChange(parsed);
        setRaw(decimalToGMS(parsed, isLat));
    };

    return (
        <GF label={label} error={error || gpsErr}>
            <div className="relative">
                <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                    className={gI(!!(error || gpsErr)) + ' pl-8'}
                    value={raw}
                    onChange={e => { setRaw(e.target.value); setGpsErr(''); }}
                    onBlur={handleBlur}
                    placeholder={isLat ? '17°23\'45.6"S  ó  -17.3960' : '66°09\'12.3"W  ó  -66.1534'}
                />
            </div>
        </GF>
    );
};

/* ── Mini inline modal for creating a client ── */
const MiniClienteModal = ({ onCreado, onCerrar }) => {
    const [form, setForm] = useState({
        nombre_completo: '', tipo: 'persona_natural', documento_tipo: 'ci', documento_numero: '', telefono_principal: '', email: '',
    });
    const [guardando, setGuardando] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        if (!form.nombre_completo.trim()) { toast.error('El nombre es obligatorio'); return; }
        if (!form.documento_numero.trim()) { toast.error('El número de documento es obligatorio'); return; }
        try {
            setGuardando(true);
            const res = await api.post('/clientes', form);
            const cliente = res.data?.data ?? res.data;
            toast.success('Cliente creado');
            onCreado(cliente);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al crear cliente');
        } finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-2xl"
                style={{ background: 'rgba(10,20,40,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex items-center justify-between px-5 pt-5 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h4 className="font-bold text-white text-sm">Nuevo Cliente</h4>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white"><X size={16} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <GF label="Nombre Completo *">
                        <input className={gI(false)} value={form.nombre_completo} onChange={e => set('nombre_completo', e.target.value)} />
                    </GF>
                    <div className="grid grid-cols-2 gap-3">
                        <GF label="Tipo">
                            <GlassSelect value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                                <option value="persona_natural">Persona Natural</option>
                                <option value="empresa">Empresa</option>
                            </GlassSelect>
                        </GF>
                        <GF label="Doc. Tipo">
                            <GlassSelect value={form.documento_tipo} onChange={e => set('documento_tipo', e.target.value)}>
                                <option value="ci">CI</option>
                                <option value="nit">NIT</option>
                                <option value="pasaporte">Pasaporte</option>
                            </GlassSelect>
                        </GF>
                    </div>
                    <GF label="Nº Documento *">
                        <input className={gI(false)} value={form.documento_numero} onChange={e => set('documento_numero', e.target.value)} />
                    </GF>
                    <GF label="Teléfono *">
                        <input className={gI(false)} value={form.telefono_principal} onChange={e => set('telefono_principal', e.target.value)} />
                    </GF>
                    <GF label="Email">
                        <input type="email" className={gI(false)} value={form.email} onChange={e => set('email', e.target.value)} />
                    </GF>
                </div>
                <div className="flex justify-end gap-3 px-5 pb-5">
                    <button onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={guardando}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))' }}>
                        {guardando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Crear
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Mini inline modal for creating an entity ── */
const MiniEntidadModal = ({ onCreada, onCerrar }) => {
    const [form, setForm] = useState({ nombre: '', sigla: '', telefono: '', email: '' });
    const [guardando, setGuardando] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio'); return; }
        try {
            setGuardando(true);
            const res = await api.post('/entidades-estatales', form);
            const entidad = res.data?.data ?? res.data;
            toast.success('Entidad creada');
            onCreada(entidad);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al crear entidad');
        } finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-2xl"
                style={{ background: 'rgba(10,20,40,0.98)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex items-center justify-between px-5 pt-5 pb-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <h4 className="font-bold text-white text-sm">Nueva Entidad Estatal</h4>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white"><X size={16} /></button>
                </div>
                <div className="p-5 space-y-3">
                    <GF label="Nombre *">
                        <input className={gI(false)} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ministerio de..." />
                    </GF>
                    <div className="grid grid-cols-2 gap-3">
                        <GF label="Sigla">
                            <input className={gI(false)} value={form.sigla} onChange={e => set('sigla', e.target.value)} placeholder="MTCC" />
                        </GF>
                        <GF label="Teléfono">
                            <input className={gI(false)} value={form.telefono} onChange={e => set('telefono', e.target.value)} />
                        </GF>
                    </div>
                    <GF label="Email">
                        <input type="email" className={gI(false)} value={form.email} onChange={e => set('email', e.target.value)} />
                    </GF>
                </div>
                <div className="flex justify-end gap-3 px-5 pb-5">
                    <button onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-all"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                    <button onClick={handleSubmit} disabled={guardando}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))' }}>
                        {guardando && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Crear
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
const EMPTY_HITO = () => ({ nombre: '', porcentaje: '', fecha_planificada: '' });

const CrearProyecto = () => {
    const navigate = useNavigate();
    const [paso, setPaso] = useState(1);
    const [guardando, setGuardando] = useState(false);
    const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
    const [configFinanciera, setConfigFinanciera] = useState({});

    const [zonas, setZonas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [entidades, setEntidades] = useState([]);
    const [usuarios, setUsuarios] = useState([]);
    const [miniCliente, setMiniCliente] = useState(false);
    const [miniEntidad, setMiniEntidad] = useState(false);

    const [form, setForm] = useState({
        categoria: 'social',
        nombre: '',
        descripcion: '',
        prioridad: 'media',
        tipo_obra: '',
        cliente_id: '',
        entidad_estatal_id: '',
        zona_id: '',
        responsable_id: '',
        monto_contractual: '',
        porcentaje_mano_obra: '',
        porcentaje_gastos_generales: '',
        porcentaje_utilidad_esperada: '',
        justificacion_rentabilidad_baja: '',
        direccion_obra: '',
        latitud: '',
        longitud: '',
        fecha_inicio_planificada: '',
        fecha_fin_planificada: '',
        cantidad_fases: '1',
        dividir_presupuesto: false,
        fases_config: [],
        cantidad_beneficiarios: '',
        hitos_cobro: [],
        contrato_pdf: null,
    });
    const [errores, setErrores] = useState({});

    /* ── Financial calculations (derived) ── */
    const montoContractual = parseFloat(form.monto_contractual || 0);
    const cfgActual = configFinanciera?.[form.categoria] ?? {};
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

    /* ── Load catalogs + financial config ── */
    useEffect(() => {
        Promise.all([
            zonaGeograficaService.listar(),
            api.get('/clientes', { params: { per_page: 500 } }).catch(() => ({ data: { data: [] } })),
            api.get('/entidades-estatales', { params: { per_page: 500 } }).catch(() => ({ data: { data: [] } })),
            api.get('/usuarios', { params: { estado: 'activo', per_page: 300 } }).catch(() => ({ data: { data: [] } })),
            api.get('/configuracion/porcentajes-presupuesto').catch(() => ({ data: { data: {} } })),
        ]).then(([z, c, e, u, cfg]) => {
            setZonas(z || []);
            setClientes(c.data?.data?.data ?? c.data?.data ?? []);
            setEntidades(e.data?.data?.data ?? e.data?.data ?? []);
            setUsuarios(u.data?.data?.data ?? u.data?.data ?? []);
            setConfigFinanciera(cfg.data?.data ?? {});
        }).catch(() => toast.error('Error al cargar catálogos'))
          .finally(() => setCargandoCatalogos(false));
    }, []);

    /* ── Auto-seed pct fields from config when config loads or categoria changes ── */
    useEffect(() => {
        if (!configFinanciera) return;
        const cfg = configFinanciera[form.categoria] ?? {};
        setForm(p => ({
            ...p,
            porcentaje_mano_obra:         p.porcentaje_mano_obra         || String(cfg.porcentaje_mano_obra        ?? ''),
            porcentaje_gastos_generales:  p.porcentaje_gastos_generales  || String(cfg.porcentaje_gastos_generales ?? ''),
            porcentaje_utilidad_esperada: p.porcentaje_utilidad_esperada || String(cfg.porcentaje_utilidad_esperada ?? ''),
        }));
    }, [configFinanciera, form.categoria]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── form setter ── */
    const set = useCallback((k, v) => {
        setForm(p => {
            const next = { ...p, [k]: v };
            if (k === 'categoria') {
                next.cliente_id = '';
                next.entidad_estatal_id = '';
                next.cantidad_fases = '1';
                next.dividir_presupuesto = false;
                next.fases_config = [];
                next.cantidad_beneficiarios = '';
                next.hitos_cobro = [];
                next.tipo_obra = '';
            }
            if (k === 'cantidad_fases') {
                const n = Math.min(50, Math.max(1, parseInt(v) || 1));
                const existing = p.fases_config;
                next.fases_config = Array.from({ length: n }, (_, i) => ({
                    nombre: existing[i]?.nombre ?? `Fase ${i + 1}`,
                    porcentaje: existing[i]?.porcentaje ?? (p.dividir_presupuesto ? (100 / n).toFixed(2) : ''),
                }));
            }
            if (k === 'dividir_presupuesto') {
                const n = parseInt(p.cantidad_fases) || 1;
                if (v) {
                    next.fases_config = Array.from({ length: n }, (_, i) => ({
                        nombre: p.fases_config[i]?.nombre ?? `Fase ${i + 1}`,
                        porcentaje: (100 / n).toFixed(2),
                    }));
                }
            }
            return next;
        });
        setErrores(prev => {
            const n = { ...prev };
            if (k === 'nombre') {
                if (!v.trim()) n.nombre = 'El nombre es obligatorio';
                else delete n.nombre;
            } else if (k === 'monto_contractual') {
                if (v !== '' && parseFloat(v) < 0) n.monto_contractual = 'Debe ser positivo';
                else delete n.monto_contractual;
            } else if (k === 'fecha_inicio_planificada') {
                if (!v) n.fecha_inicio_planificada = 'Fecha de inicio obligatoria';
                else delete n.fecha_inicio_planificada;
            } else if (k === 'fecha_fin_planificada') {
                if (!v) n.fecha_fin_planificada = 'Fecha de fin obligatoria';
                else delete n.fecha_fin_planificada;
            } else if (k === 'entidad_estatal_id') {
                if (!v) n.entidad_estatal_id = 'Selecciona la entidad estatal';
                else delete n.entidad_estatal_id;
            } else if (k === 'cliente_id') {
                if (!v) n.cliente_id = 'Selecciona el cliente';
                else delete n.cliente_id;
            } else {
                delete n[k];
            }
            return n;
        });
    }, [form, errores]);

    /* ── Fases helpers ── */
    const setFaseConfig = (i, campo, valor) => {
        const nuevasFases = form.fases_config.map((f, idx) => idx === i ? { ...f, [campo]: valor } : f);
        setForm(p => ({ ...p, fases_config: nuevasFases }));
        setErrores(prev => {
            const n = { ...prev };
            if (campo === 'porcentaje') {
                const sum = nuevasFases.reduce((acc, f) => acc + (parseFloat(f.porcentaje) || 0), 0);
                if (Math.abs(sum - 100) > 0.05) n.fases_config = `La suma de porcentajes es ${sum.toFixed(2)}% — debe ser 100%`;
                else delete n.fases_config;
            } else delete n.fases_config;
            return n;
        });
    };

    /* ── Hitos helpers ── */
    const addHito = () => setForm(p => {
        const n = p.hitos_cobro.length + 1;
        const defaultNombre = p.categoria === 'social' ? `Producto ${n}` : `Hito ${n}`;
        return { ...p, hitos_cobro: [...p.hitos_cobro, { ...EMPTY_HITO(), nombre: defaultNombre }] };
    });
    const removeHito = i => setForm(p => ({ ...p, hitos_cobro: p.hitos_cobro.filter((_, idx) => idx !== i) }));
    const setHito = (i, campo, valor) => {
        const nuevosHitos = form.hitos_cobro.map((h, idx) => idx === i ? { ...h, [campo]: valor } : h);
        setForm(p => ({ ...p, hitos_cobro: nuevosHitos }));
        setErrores(prev => {
            const n = { ...prev };
            if (campo === 'nombre') {
                if (!valor.trim()) n[`hito_nombre_${i}`] = 'Nombre obligatorio';
                else delete n[`hito_nombre_${i}`];
            } else if (campo === 'porcentaje') {
                if (!valor) n[`hito_pct_${i}`] = 'Porcentaje obligatorio';
                else delete n[`hito_pct_${i}`];
                const sum = nuevosHitos.reduce((acc, h) => acc + (parseFloat(h.porcentaje) || 0), 0);
                if (nuevosHitos.length > 0 && Math.abs(sum - 100) > 0.05)
                    n.hitos_cobro = `La suma de porcentajes es ${sum.toFixed(2)}% — debe ser 100%`;
                else delete n.hitos_cobro;
            } else if (campo === 'fecha_planificada') {
                nuevosHitos.forEach((h, idx) => {
                    if (!h.fecha_planificada) { delete n[`hito_fecha_${idx}`]; return; }
                    let err = null;
                    if (form.fecha_inicio_planificada && form.fecha_fin_planificada) {
                        if (h.fecha_planificada < form.fecha_inicio_planificada || h.fecha_planificada > form.fecha_fin_planificada)
                            err = 'Debe estar entre las fechas del proyecto';
                    }
                    if (!err && idx > 0) {
                        const prev = nuevosHitos[idx - 1];
                        if (prev.fecha_planificada && h.fecha_planificada <= prev.fecha_planificada)
                            err = `La fecha debe ser posterior al hito ${idx}`;
                    }
                    if (err) n[`hito_fecha_${idx}`] = err;
                    else delete n[`hito_fecha_${idx}`];
                });
            }
            return n;
        });
    };

    /* ── Validation ── */
    const validar1 = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
        if (form.categoria === 'social' && !form.entidad_estatal_id) e.entidad_estatal_id = 'Selecciona la entidad estatal';
        if (form.categoria === 'privado' && !form.cliente_id) e.cliente_id = 'Selecciona el cliente';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const validar2 = () => {
        const e = {};
        if (!form.monto_contractual || parseFloat(form.monto_contractual) <= 0)
            e.monto_contractual = 'El monto contractual es obligatorio';
        if (!form.fecha_inicio_planificada) e.fecha_inicio_planificada = 'Fecha de inicio obligatoria';
        if (!form.fecha_fin_planificada) e.fecha_fin_planificada = 'Fecha de fin obligatoria';
        if (form.fecha_inicio_planificada && form.fecha_fin_planificada) {
            const ini = new Date(form.fecha_inicio_planificada + 'T00:00:00');
            const fin = new Date(form.fecha_fin_planificada + 'T00:00:00');
            const minFin = new Date(ini); minFin.setDate(ini.getDate() + 30);
            if (fin < minFin) e.fecha_fin_planificada = 'Debe ser al menos 30 días después del inicio';
        }
        if (form.categoria === 'social' && form.cantidad_beneficiarios && parseInt(form.cantidad_beneficiarios) < 1)
            e.cantidad_beneficiarios = 'Debe ser un número positivo';
        if (form.categoria === 'privado' && form.dividir_presupuesto) {
            const sum = form.fases_config.reduce((acc, f) => acc + (parseFloat(f.porcentaje) || 0), 0);
            if (Math.abs(sum - 100) > 0.05) e.fases_config = `La suma de porcentajes es ${sum.toFixed(2)}% — debe ser 100%`;
        }
        if (form.hitos_cobro.length > 0) {
            const sum = form.hitos_cobro.reduce((acc, h) => acc + (parseFloat(h.porcentaje) || 0), 0);
            if (Math.abs(sum - 100) > 0.05) e.hitos_cobro = `La suma de porcentajes es ${sum.toFixed(2)}% — debe ser 100%`;
            form.hitos_cobro.forEach((h, i) => {
                if (!h.nombre.trim()) e[`hito_nombre_${i}`] = 'Nombre obligatorio';
                if (!h.porcentaje) e[`hito_pct_${i}`] = 'Porcentaje obligatorio';
            });
        }
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const siguiente = () => {
        if (paso === 1 && !validar1()) return;
        if (paso === 2 && !validar2()) return;
        setPaso(p => p + 1);
    };

    /* ── Submit ── */
    const handleSubmit = async () => {
        if (bajaRentabilidad && !form.justificacion_rentabilidad_baja?.trim()) {
            setErrores(e => ({ ...e, justificacion_rentabilidad_baja: 'La justificación es obligatoria para proyectos con rentabilidad baja' }));
            return;
        }
        try {
            setGuardando(true);
            const fd = new FormData();
            const append = (k, v) => { if (v !== '' && v !== null && v !== undefined) fd.append(k, v); };

            append('categoria', form.categoria);
            append('nombre', form.nombre);
            append('descripcion', form.descripcion);
            append('prioridad', form.prioridad);
            append('monto_contractual', form.monto_contractual);
            append('fecha_inicio_planificada', form.fecha_inicio_planificada);
            append('fecha_fin_planificada', form.fecha_fin_planificada);
            append('zona_id', form.zona_id);
            append('responsable_id', form.responsable_id);
            append('justificacion_rentabilidad_baja', form.justificacion_rentabilidad_baja);
            if (form.porcentaje_mano_obra)         append('porcentaje_mano_obra', form.porcentaje_mano_obra);
            if (form.porcentaje_gastos_generales)   append('porcentaje_gastos_generales', form.porcentaje_gastos_generales);
            if (form.porcentaje_utilidad_esperada)  append('porcentaje_utilidad_esperada', form.porcentaje_utilidad_esperada);
            if (form.contrato_pdf) fd.append('contrato_pdf', form.contrato_pdf);

            if (form.categoria === 'privado') {
                append('cliente_id', form.cliente_id);
                append('tipo_obra', form.tipo_obra);
                append('cantidad_fases', form.cantidad_fases);
                append('direccion_obra', form.direccion_obra);
                append('latitud', form.latitud);
                append('longitud', form.longitud);
                if (form.dividir_presupuesto && form.fases_config.length > 0) {
                    form.fases_config.forEach((f, i) => {
                        fd.append(`fases_config[${i}][nombre]`, f.nombre || `Fase ${i + 1}`);
                        fd.append(`fases_config[${i}][porcentaje]`, f.porcentaje || '');
                    });
                }
            } else {
                append('entidad_estatal_id', form.entidad_estatal_id);
                append('cantidad_beneficiarios', form.cantidad_beneficiarios);
            }

            form.hitos_cobro.forEach((h, i) => {
                fd.append(`hitos_cobro[${i}][nombre]`, h.nombre);
                fd.append(`hitos_cobro[${i}][porcentaje]`, h.porcentaje);
                if (h.fecha_planificada) fd.append(`hitos_cobro[${i}][fecha_planificada]`, h.fecha_planificada);
                if (h.vinculacion_fase_id) fd.append(`hitos_cobro[${i}][vinculacion_fase_id]`, h.vinculacion_fase_id);
            });

            const res = await proyectoService.crearFormData(fd);
            toast.success('Proyecto creado exitosamente');
            navigate(`/dashboard/proyectos/${res.data?.id ?? res.id}`);
        } catch (e) {
            toast.error(e.message || 'Error al crear el proyecto');
            if (e.errors) {
                setErrores(e.errors);
                const ekeys = Object.keys(e.errors);
                if (ekeys.some(k => ['nombre', 'entidad_estatal_id', 'cliente_id'].includes(k))) setPaso(1);
                else if (ekeys.some(k => ['monto_contractual', 'fecha_inicio_planificada', 'fecha_fin_planificada', 'hitos_cobro'].includes(k))) setPaso(2);
            }
        } finally { setGuardando(false); }
    };

    if (cargandoCatalogos) return (
        <div className="max-w-3xl mx-auto space-y-4">
            <Skeleton height="2rem" width="200px" />
            <Skeleton height="520px" className="rounded-2xl" />
        </div>
    );

    const fasesCount  = Math.min(50, Math.max(1, parseInt(form.cantidad_fases) || 1));
    const sumFases    = form.fases_config.reduce((a, f) => a + (parseFloat(f.porcentaje) || 0), 0);
    const sumHitos    = form.hitos_cobro.reduce((a, h) => a + (parseFloat(h.porcentaje) || 0), 0);

    const _hoy = new Date();
    const _minInicio = new Date(_hoy); _minInicio.setDate(_hoy.getDate() - 10);
    const minInicioStr = _minInicio.toISOString().split('T')[0];
    const minFinStr = form.fecha_inicio_planificada
        ? (() => { const d = new Date(form.fecha_inicio_planificada + 'T00:00:00'); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })()
        : '';

    /* ── Financial bar helper ── */
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
        <>
            <div className="animate-fade-in max-w-3xl mx-auto">
                <button onClick={() => navigate('/dashboard/proyectos')}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors mb-5">
                    <ArrowLeft size={16} /> Volver a proyectos
                </button>

                <div className="flex items-center gap-4 mb-7">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        <Briefcase size={22} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">Nuevo Proyecto</h1>
                        <p className="text-sm text-slate-500">Registro de proyecto de construcción</p>
                    </div>
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <StepBar paso={paso} />

                    {/* ══ PASO 1: Tipo, Identidad y Contraparte ══ */}
                    {paso === 1 && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { val: 'social',  icon: Users,    label: 'Proyecto Social',  desc: 'Beneficiarios + Entidad Estatal', color: '#22d3ee' },
                                    { val: 'privado', icon: Building, label: 'Proyecto Privado', desc: 'Fases + Cliente Privado',          color: '#a78bfa' },
                                ].map(cat => {
                                    const sel = form.categoria === cat.val;
                                    return (
                                        <button key={cat.val} onClick={() => set('categoria', cat.val)}
                                            className="p-4 rounded-2xl flex flex-col items-center gap-2 transition-all"
                                            style={{
                                                background: sel ? `${cat.color}14` : 'rgba(255,255,255,0.03)',
                                                border: `2px solid ${sel ? `${cat.color}60` : 'rgba(255,255,255,0.07)'}`,
                                            }}>
                                            <cat.icon size={26} style={{ color: sel ? cat.color : '#475569' }} />
                                            <span className="font-semibold text-sm" style={{ color: sel ? cat.color : '#94a3b8' }}>{cat.label}</span>
                                            <span className="text-[11px] text-slate-600 text-center">{cat.desc}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <SectionCard title="Identidad" accent="#34d399">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <GF label="Nombre del Proyecto" required error={errores.nombre}
                                            hint={`${form.nombre.length}/50 caracteres`}>
                                            <input className={gI(!!errores.nombre)} value={form.nombre}
                                                onChange={e => set('nombre', e.target.value.slice(0, 50))}
                                                maxLength={50}
                                                placeholder="Ej: Construcción Viviendas Sociales Zona Norte" />
                                        </GF>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <GF label="Descripción" hint={`${form.descripcion.length}/100 caracteres`}>
                                            <textarea rows={2} className={gI(false) + ' resize-none'} value={form.descripcion}
                                                onChange={e => set('descripcion', e.target.value.slice(0, 100))}
                                                maxLength={100}
                                                placeholder="Descripción general del proyecto..." />
                                        </GF>
                                    </div>

                                    {form.categoria === 'privado' && (
                                        <GF label="Tipo de Obra">
                                            <GlassSelect value={form.tipo_obra} onChange={e => set('tipo_obra', e.target.value)}>
                                                <option value="">— Seleccionar —</option>
                                                <option value="vivienda_unifamiliar">Vivienda Unifamiliar</option>
                                                <option value="edificio">Edificio</option>
                                                <option value="remodelacion">Remodelación</option>
                                                <option value="ampliacion">Ampliación</option>
                                                <option value="otro">Otro</option>
                                            </GlassSelect>
                                        </GF>
                                    )}

                                    <GF label="Prioridad">
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[
                                                { val: 'baja',    label: 'Baja',    color: '#64748b' },
                                                { val: 'media',   label: 'Media',   color: '#60a5fa' },
                                                { val: 'alta',    label: 'Alta',    color: '#fbbf24' },
                                                { val: 'critica', label: 'Crítica', color: '#f87171' },
                                            ].map(pr => (
                                                <button key={pr.val} onClick={() => set('prioridad', pr.val)}
                                                    className="py-2 rounded-xl text-xs font-medium transition-all"
                                                    style={{
                                                        background: form.prioridad === pr.val ? `${pr.color}1a` : 'rgba(255,255,255,0.04)',
                                                        border: `1px solid ${form.prioridad === pr.val ? `${pr.color}60` : 'rgba(255,255,255,0.08)'}`,
                                                        color: form.prioridad === pr.val ? pr.color : '#64748b',
                                                    }}>
                                                    {pr.label}
                                                </button>
                                            ))}
                                        </div>
                                    </GF>
                                </div>
                            </SectionCard>

                            <SectionCard title={form.categoria === 'social' ? 'Entidad Estatal' : 'Cliente Privado'} accent={form.categoria === 'social' ? '#22d3ee' : '#a78bfa'}>
                                {form.categoria === 'social' ? (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <GF error={errores.entidad_estatal_id}>
                                                <GlassSelect value={form.entidad_estatal_id} onChange={e => set('entidad_estatal_id', e.target.value)} error={!!errores.entidad_estatal_id}>
                                                    <option value="">— Seleccionar entidad —</option>
                                                    {entidades.map(e => <option key={e.id} value={e.id}>{e.nombre}{e.sigla ? ` (${e.sigla})` : ''}</option>)}
                                                </GlassSelect>
                                            </GF>
                                        </div>
                                        <button onClick={() => setMiniEntidad(true)}
                                            className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                            <Plus size={13} /> Nueva
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <GF error={errores.cliente_id}>
                                                <GlassSelect value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} error={!!errores.cliente_id}>
                                                    <option value="">— Seleccionar cliente —</option>
                                                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_visible ?? `${c.nombre_completo ?? c.nombre} ${c.apellido_paterno ?? ''}`}</option>)}
                                                </GlassSelect>
                                            </GF>
                                        </div>
                                        <button onClick={() => setMiniCliente(true)}
                                            className="shrink-0 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-all flex items-center gap-1"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                            <Plus size={13} /> Nuevo
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                    <GF label="Zona Geográfica">
                                        <GlassSelect value={form.zona_id} onChange={e => set('zona_id', e.target.value)}>
                                            <option value="">— Opcional —</option>
                                            {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
                                        </GlassSelect>
                                    </GF>
                                    <GF label="Responsable / Administrador">
                                        <GlassSelect value={form.responsable_id} onChange={e => set('responsable_id', e.target.value)}>
                                            <option value="">— Opcional —</option>
                                            {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre} {u.apellido_paterno}</option>)}
                                        </GlassSelect>
                                    </GF>
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASO 2: Planificación, Finanzas y Hitos ══ */}
                    {paso === 2 && (
                        <div className="space-y-5">
                            {/* Cronograma */}
                            <SectionCard title="Cronograma" accent="#60a5fa">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <GF label="Fecha de Inicio" required error={errores.fecha_inicio_planificada} hint="Hasta 10 días antes de hoy">
                                        <input type="date" className={gI(!!errores.fecha_inicio_planificada)}
                                            min={minInicioStr}
                                            value={form.fecha_inicio_planificada} onChange={e => set('fecha_inicio_planificada', e.target.value)} />
                                    </GF>
                                    <GF label="Fecha de Fin" required error={errores.fecha_fin_planificada} hint="Mín. 30 días después del inicio">
                                        <input type="date" className={gI(!!errores.fecha_fin_planificada)}
                                            min={minFinStr}
                                            value={form.fecha_fin_planificada} onChange={e => set('fecha_fin_planificada', e.target.value)} />
                                    </GF>
                                </div>
                            </SectionCard>

                            {/* Finanzas */}
                            <SectionCard title="Finanzas" accent="#34d399">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <GF label="Monto Contractual (Bs.)" required error={errores.monto_contractual}>
                                            <input type="number" min="0" step="0.01" className={gI(!!errores.monto_contractual)}
                                                value={form.monto_contractual} onChange={e => set('monto_contractual', e.target.value)} placeholder="0.00" />
                                        </GF>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <GF label="Contrato PDF" hint="Máximo 10 MB — solo archivos PDF">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/[0.09] hover:border-white/[0.18] transition-all">
                                                    <Upload size={15} className="text-slate-500 shrink-0" />
                                                    <span className={form.contrato_pdf ? 'text-emerald-400' : 'text-slate-500'}>
                                                        {form.contrato_pdf ? form.contrato_pdf.name : 'Seleccionar archivo...'}
                                                    </span>
                                                </div>
                                                <input type="file" accept=".pdf" className="hidden"
                                                    onChange={e => set('contrato_pdf', e.target.files?.[0] ?? null)} />
                                            </label>
                                            {form.contrato_pdf && (
                                                <button onClick={() => set('contrato_pdf', null)}
                                                    className="mt-1 text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1">
                                                    <X size={11} /> Quitar archivo
                                                </button>
                                            )}
                                        </GF>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* Live financial preview */}
                            {montoContractual > 0 && (
                                <div className="rounded-2xl p-4 space-y-3" style={{ background: `${colorSalud}08`, border: `1px solid ${colorSalud}30` }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vista Previa Financiera</span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${colorSalud}20`, color: colorSalud }}>{labelSalud}</span>
                                    </div>
                                    <FinBar label="Materiales (calculado)" monto={presupMat}  total={montoContractual} color="#60a5fa" />
                                    <FinBar label={`Mano de Obra (${pctMO}%)`}  monto={presupMO}  total={montoContractual} color="#a78bfa" />
                                    <FinBar label={`Gastos Generales (${pctGG}%)`} monto={presupGG}  total={montoContractual} color="#fbbf24" />
                                    <FinBar label={`Utilidad Esperada (${pctUtil}%)`} monto={presupUtil} total={montoContractual} color={colorSalud} />
                                    {bajaRentabilidad && (
                                        <div className="flex items-center gap-2 mt-1 p-2.5 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                            <AlertTriangle size={13} className="text-red-400 shrink-0" />
                                            <p className="text-[11px] text-red-400">Rentabilidad por debajo del umbral mínimo de {umbral}%. Se requerirá justificación en el paso 3.</p>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-600 text-right">Porcentajes según configuración del sistema para proyectos {form.categoria === 'social' ? 'sociales' : 'privados'}</p>
                                </div>
                            )}

                            {/* GPS + Dirección — proyectos privados */}
                            {form.categoria === 'privado' && (
                                <SectionCard title="Ubicación de Obra" accent="#fbbf24">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <GF label="Dirección">
                                                <div className="relative">
                                                    <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                                    <input className={gI(false) + ' pl-8'} value={form.direccion_obra}
                                                        onChange={e => set('direccion_obra', e.target.value)}
                                                        placeholder="Av. Principal 123, Barrio..." />
                                                </div>
                                            </GF>
                                        </div>
                                        <GpsField label="Latitud (GPS)" value={form.latitud} onChange={v => set('latitud', v ?? '')} isLat={true} error={errores.latitud} />
                                        <GpsField label="Longitud (GPS)" value={form.longitud} onChange={v => set('longitud', v ?? '')} isLat={false} error={errores.longitud} />
                                    </div>
                                </SectionCard>
                            )}

                            {/* Privado: Fases */}
                            {form.categoria === 'privado' && (
                                <SectionCard title="Configuración de Fases" accent="#a78bfa">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <GF label="Cantidad de Fases">
                                                <input type="number" min="1" max="50" className={gI(false)}
                                                    value={form.cantidad_fases}
                                                    onChange={e => set('cantidad_fases', e.target.value)}
                                                    onBlur={e => set('cantidad_fases', String(Math.min(50, Math.max(1, parseInt(e.target.value) || 1))))} />
                                            </GF>
                                            <GF label="Dividir presupuesto por fases">
                                                <button onClick={() => set('dividir_presupuesto', !form.dividir_presupuesto)}
                                                    className={[
                                                        'w-full py-2.5 rounded-xl text-sm font-medium transition-all',
                                                        form.dividir_presupuesto
                                                            ? 'bg-violet-500/15 border border-violet-500/40 text-violet-300'
                                                            : 'bg-white/[0.05] border border-white/[0.09] text-slate-500',
                                                    ].join(' ')}>
                                                    {form.dividir_presupuesto ? '✓ Habilitado' : 'Sin dividir'}
                                                </button>
                                            </GF>
                                        </div>

                                        {form.dividir_presupuesto && fasesCount > 0 && (
                                            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                                <div className="flex items-center justify-between px-4 py-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wide"
                                                    style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <span className="w-1/2">Nombre</span>
                                                    <span className="w-1/4 text-right">% Presupuesto</span>
                                                    <span className="w-1/4 text-right text-violet-400">
                                                        Σ {sumFases.toFixed(1)}%
                                                        {Math.abs(sumFases - 100) > 0.05 && <span className="ml-1 text-red-400">(debe ser 100)</span>}
                                                    </span>
                                                </div>
                                                {form.fases_config.map((f, i) => (
                                                    <div key={i} className="flex items-center gap-2 px-3 py-2"
                                                        style={{ borderBottom: i < fasesCount - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                        <input className={gI(false) + ' w-1/2 text-xs py-1.5'} value={f.nombre}
                                                            onChange={e => setFaseConfig(i, 'nombre', e.target.value)} />
                                                        <div className="w-5/12 flex items-center gap-1">
                                                            <input type="number" min="0" max="100" step="0.01" className={gI(false) + ' text-xs py-1.5'}
                                                                value={f.porcentaje} onChange={e => setFaseConfig(i, 'porcentaje', e.target.value)} />
                                                            <span className="text-slate-500 text-xs shrink-0">%</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {errores.fases_config && <p className="text-xs text-red-400">{errores.fases_config}</p>}
                                    </div>
                                </SectionCard>
                            )}

                            {/* Social: Beneficiarios */}
                            {form.categoria === 'social' && (
                                <SectionCard title="Beneficiarios" accent="#22d3ee">
                                    <GF label="Cantidad de Beneficiarios (Viviendas)" error={errores.cantidad_beneficiarios} hint="Cada beneficiario genera una vivienda en la cascada">
                                        <input type="number" min="1" max="5000" className={gI(!!errores.cantidad_beneficiarios)}
                                            value={form.cantidad_beneficiarios}
                                            onChange={e => set('cantidad_beneficiarios', e.target.value.replace(/[^0-9]/g, ''))}
                                            placeholder="Ej: 50" />
                                    </GF>
                                </SectionCard>
                            )}

                            {/* Hitos de Cobro — ambos tipos */}
                            <SectionCard
                                title={form.categoria === 'social' ? 'Productos SICOOES (Cobros)' : 'Hitos de Cobro Negociados'}
                                accent={form.categoria === 'social' ? '#22d3ee' : '#a78bfa'}
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[11px] text-slate-500">
                                            {form.categoria === 'social'
                                                ? 'Productos entregables del contrato SICOOES. La suma debe ser 100%.'
                                                : 'Hitos de pago negociados con el cliente. La suma debe ser 100%.'}
                                        </p>
                                        <button onClick={addHito}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                                            style={{
                                                background: form.categoria === 'social' ? 'rgba(34,211,238,0.08)' : 'rgba(167,139,250,0.08)',
                                                border: `1px solid ${form.categoria === 'social' ? 'rgba(34,211,238,0.2)' : 'rgba(167,139,250,0.2)'}`,
                                                color: form.categoria === 'social' ? '#22d3ee' : '#a78bfa',
                                            }}>
                                            <Plus size={12} /> Agregar
                                        </button>
                                    </div>

                                    {form.hitos_cobro.length === 0 ? (
                                        <div className="rounded-xl py-6 text-center text-slate-600 text-sm"
                                            style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.07)' }}>
                                            Sin hitos — el proyecto no tendrá cobros planificados
                                        </div>
                                    ) : (
                                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide"
                                                style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                                <span className="col-span-4">Nombre</span>
                                                <span className="col-span-2">
                                                    % <span className={Math.abs(sumHitos - 100) > 0.05 ? 'text-red-400' : 'text-emerald-400'}>Σ{sumHitos.toFixed(0)}</span>
                                                </span>
                                                <span className="col-span-5">Fecha planificada</span>
                                                <span className="col-span-1" />
                                            </div>
                                            {form.hitos_cobro.map((h, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 items-center"
                                                    style={{ borderBottom: i < form.hitos_cobro.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                                    <div className="col-span-4">
                                                        <input className={gI(!!errores[`hito_nombre_${i}`]) + ' text-xs py-1.5'}
                                                            value={h.nombre} onChange={e => setHito(i, 'nombre', e.target.value)}
                                                            placeholder={form.categoria === 'social' ? `Producto ${i + 1}` : `Hito ${i + 1}`} />
                                                        {errores[`hito_nombre_${i}`] && <p className="text-[10px] text-red-400 mt-0.5">{errores[`hito_nombre_${i}`]}</p>}
                                                    </div>
                                                    <div className="col-span-2 flex items-center gap-1">
                                                        <input type="number" min="0" max="100" step="0.01"
                                                            className={gI(!!errores[`hito_pct_${i}`]) + ' text-xs py-1.5'}
                                                            value={h.porcentaje} onChange={e => setHito(i, 'porcentaje', e.target.value)} placeholder="%" />
                                                    </div>
                                                    <div className="col-span-5">
                                                        <input type="date"
                                                            className={gI(!!errores[`hito_fecha_${i}`]) + ' text-xs py-1.5'}
                                                            value={h.fecha_planificada} onChange={e => setHito(i, 'fecha_planificada', e.target.value)} />
                                                        {errores[`hito_fecha_${i}`] && <p className="text-[10px] text-red-400 mt-0.5">{errores[`hito_fecha_${i}`]}</p>}
                                                    </div>
                                                    <div className="col-span-1 flex justify-center">
                                                        <button onClick={() => removeHito(i)} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {errores.hitos_cobro && <p className="text-xs text-red-400 mt-1">{errores.hitos_cobro}</p>}
                                </div>
                            </SectionCard>
                        </div>
                    )}

                    {/* ══ PASO 3: Revisión Financiera ══ */}
                    {paso === 3 && (
                        <div className="space-y-5">
                            {/* Financial health card */}
                            <div className="rounded-2xl p-5 space-y-4" style={{ background: `${colorSalud}06`, border: `1px solid ${colorSalud}30` }}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salud Financiera del Proyecto</p>
                                        <p className="text-lg font-bold text-white mt-0.5">{bs(montoContractual)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: `${colorSalud}20`, color: colorSalud }}>
                                            {labelSalud}
                                        </span>
                                        <span className="text-[11px] text-slate-500">Utilidad: {pctUtil.toFixed(1)}% / umbral {umbral}%</span>
                                    </div>
                                </div>
                                <div className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <FinBar label="Materiales (auto)"         monto={presupMat}  total={montoContractual} color="#60a5fa" />
                                    <FinBar label={`Mano de Obra (${pctMO}%)`}    monto={presupMO}   total={montoContractual} color="#a78bfa" />
                                    <FinBar label={`Gastos Generales (${pctGG}%)`} monto={presupGG}   total={montoContractual} color="#fbbf24" />
                                    <FinBar label={`Utilidad Esperada (${pctUtil}%)`} monto={presupUtil} total={montoContractual} color={colorSalud} />
                                </div>
                                <div className="flex justify-between items-center text-sm pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                    <span className="text-slate-400">Rentabilidad estimada</span>
                                    <span className="font-bold" style={{ color: colorSalud }}>
                                        {saludFinanciera !== 'sin_datos' && (
                                            <>{bajaRentabilidad ? <TrendingDown size={14} className="inline mr-1" /> : <TrendingUp size={14} className="inline mr-1" />}</>
                                        )}
                                        {bs(presupUtil)} <span className="text-slate-500 font-normal">({pctUtil.toFixed(1)}%)</span>
                                    </span>
                                </div>
                            </div>

                            {/* Justification — required when low profitability */}
                            {bajaRentabilidad && (
                                <SectionCard title="Justificación Requerida" accent="#f87171">
                                    <div className="flex items-start gap-3 mb-3 p-3 rounded-xl" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                                        <AlertTriangle size={15} className="text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-300">
                                            La rentabilidad ({pctUtil.toFixed(1)}%) está por debajo del umbral mínimo configurado ({umbral}%). Es obligatorio justificar la decisión antes de crear el proyecto.
                                        </p>
                                    </div>
                                    <GF label="Justificación" required error={errores.justificacion_rentabilidad_baja}>
                                        <textarea rows={3} className={gI(!!errores.justificacion_rentabilidad_baja) + ' resize-none'}
                                            value={form.justificacion_rentabilidad_baja}
                                            onChange={e => set('justificacion_rentabilidad_baja', e.target.value)}
                                            placeholder="Describa el motivo por el cual se acepta una rentabilidad por debajo del umbral..." />
                                    </GF>
                                </SectionCard>
                            )}

                            {/* Summary grid */}
                            <div className="rounded-2xl p-5 space-y-4"
                                style={{ background: 'rgba(52,211,153,0.04)', border: '1px solid rgba(52,211,153,0.18)' }}>
                                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">Datos del Proyecto</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {[
                                        ['Nombre', form.nombre],
                                        ['Categoría', form.categoria === 'social' ? 'Social' : 'Privado'],
                                        ['Prioridad', form.prioridad.charAt(0).toUpperCase() + form.prioridad.slice(1)],
                                        ['Monto Contractual', bs(montoContractual)],
                                        ['Inicio', form.fecha_inicio_planificada || '—'],
                                        ['Fin', form.fecha_fin_planificada || '—'],
                                        form.categoria === 'social'
                                            ? ['Entidad', entidades.find(e => e.id == form.entidad_estatal_id)?.nombre || '—']
                                            : ['Cliente', clientes.find(c => c.id == form.cliente_id)?.nombre_visible ?? clientes.find(c => c.id == form.cliente_id)?.nombre_completo ?? '—'],
                                        form.categoria === 'privado'
                                            ? ['Fases', form.cantidad_fases]
                                            : ['Beneficiarios', form.cantidad_beneficiarios || '—'],
                                        ['Contrato PDF', form.contrato_pdf ? form.contrato_pdf.name : 'Sin adjunto'],
                                    ].map(([k, v]) => (
                                        <div key={k}>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{k}</p>
                                            <p className="text-white font-medium mt-0.5 text-sm truncate">{v}</p>
                                        </div>
                                    ))}
                                </div>

                                {form.hitos_cobro.length > 0 && (
                                    <div className="pt-3" style={{ borderTop: '1px solid rgba(52,211,153,0.15)' }}>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">
                                            {form.categoria === 'social' ? 'Productos SICOOES' : 'Hitos de Cobro'} ({form.hitos_cobro.length})
                                        </p>
                                        <div className="space-y-1">
                                            {form.hitos_cobro.map((h, i) => (
                                                <div key={i} className="flex justify-between text-xs text-slate-400">
                                                    <span>{h.nombre}</span>
                                                    <span className="text-emerald-400">
                                                        {h.porcentaje}% · {bs(montoContractual * parseFloat(h.porcentaje || 0) / 100)}
                                                        {h.fecha_planificada && ` · ${h.fecha_planificada}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="rounded-xl px-4 py-3 text-sm text-slate-400"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    Se generará automáticamente: <span className="text-slate-300">almacén principal
                                    {form.categoria === 'privado'
                                        ? `, ${form.cantidad_fases} fase(s)`
                                        : form.cantidad_beneficiarios ? `, ${form.cantidad_beneficiarios} vivienda(s)` : ''}
                                    {form.hitos_cobro.length > 0 ? ` y ${form.hitos_cobro.length} hito(s) de cobro` : ''}
                                    </span>.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Nav buttons */}
                    <div className="flex justify-between items-center mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <button
                            onClick={paso === 1 ? () => navigate('/dashboard/proyectos') : () => setPaso(p => p - 1)}
                            disabled={guardando}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-all disabled:opacity-40"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <ArrowLeft size={15} /> {paso === 1 ? 'Cancelar' : 'Anterior'}
                        </button>
                        {paso < 3 ? (
                            <button onClick={siguiente}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                                style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                                Siguiente <ChevronRight size={15} />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={guardando}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}>
                                {guardando ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={15} />}
                                Crear Proyecto
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {miniCliente && (
                <MiniClienteModal
                    onCreado={c => {
                        setClientes(prev => [c, ...prev]);
                        set('cliente_id', String(c.id));
                        setMiniCliente(false);
                    }}
                    onCerrar={() => setMiniCliente(false)}
                />
            )}
            {miniEntidad && (
                <MiniEntidadModal
                    onCreada={e => {
                        setEntidades(prev => [e, ...prev]);
                        set('entidad_estatal_id', String(e.id));
                        setMiniEntidad(false);
                    }}
                    onCerrar={() => setMiniEntidad(false)}
                />
            )}
        </>
    );
};

export default CrearProyecto;
