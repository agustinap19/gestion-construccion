import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import BotonExportar from '../../../components/ui/BotonExportar';
import { useAuth } from '../../../context/AuthContext';
import proyectoService from '../../../services/proyectoService';
import reporteTecnicoService from '../../../services/reporteTecnicoService';
import asignacionPersonalService from '../../../services/asignacionPersonalService';
import modificatorioService from '../../../services/modificatorioService';
import { presupuestoMaterialService } from '../../../services/presupuestoMaterialService';
import api from '../../../services/api';
import Skeleton from '../../../components/ui/Skeleton';
import ChecklistVivienda from './ChecklistVivienda';
import {
    Briefcase, Edit, ArrowLeft, Users, Building, MapPin, Calendar,
    Clock, Package, TrendingUp, BarChart2, Activity, ChevronDown, ChevronRight,
    X, Check, CheckCircle, AlertTriangle, Download, FileText, Table2, UserCheck,
    ClipboardList, Wrench, Flag, Plus, ExternalLink, Layers, Trash2, Upload,
    History, Eye, Search, User, RefreshCw, Bell
} from '../../../components/icons/Icons';
import { Loader2, ZoomIn, ImageIcon, CheckCircle2 } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
} from 'recharts';

// Resolve storage image URLs using VITE_API_URL origin (same logic as ChecklistVivienda)
const _backendOrigin = (() => {
    const v = import.meta.env.VITE_API_URL;
    if (v && v.startsWith('http')) {
        try { return new URL(v).origin; } catch { /* ignore */ }
    }
    return '';
})();
const getImgUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) {
        try { const p = new URL(path).pathname; return _backendOrigin ? _backendOrigin + p : path; } catch { return path; }
    }
    return _backendOrigin ? _backendOrigin + path : path;
};

/* ══════════════════════════════════════════════════
   Design tokens
═══════════════════════════════════════════════════ */
const ESTADO_META = {
    formulacion:  { label: 'Formulación',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' },
    licitacion:   { label: 'Licitación',   color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' },
    adjudicado:   { label: 'Adjudicado',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)' },
    en_ejecucion: { label: 'En Ejecución', color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    pausado:      { label: 'Pausado',      color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' },
    finalizado:   { label: 'Finalizado',   color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)' },
    cancelado:    { label: 'Cancelado',    color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)' },
};

const FASE_ESTADO_META = {
    pendiente:   { label: 'Pendiente',   color: '#94a3b8' },
    en_progreso: { label: 'En Progreso', color: '#60a5fa' },
    completada:  { label: 'Completada',  color: '#34d399' },
    suspendida:  { label: 'Suspendida',  color: '#fbbf24' },
};

const VIV_ESTADO_META = {
    planificada:       { label: 'Planificada',       color: '#94a3b8' },
    terreno_preparado: { label: 'Terreno Prep.',     color: '#60a5fa' },
    cimentacion:       { label: 'Cimentación',       color: '#818cf8' },
    obra_gruesa:       { label: 'Obra Gruesa',       color: '#a78bfa' },
    obra_fina:         { label: 'Obra Fina',         color: '#fbbf24' },
    acabados:          { label: 'Acabados',          color: '#f97316' },
    entregada:         { label: 'Entregada',         color: '#34d399' },
    con_observaciones: { label: 'Con Obs.',          color: '#f87171' },
};

const BENEF_ESTADO_META = {
    candidato:          { label: 'Candidato',         color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    aceptado:           { label: 'Aceptado',          color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
    en_construccion:    { label: 'En Construcción',   color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
    vivienda_entregada: { label: 'Vivienda Entregada',color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    retirado:           { label: 'Retirado',          color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    rechazado:          { label: 'Rechazado',         color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
};

/* ══════════════════════════════════════════════════
   Micro-helpers
═══════════════════════════════════════════════════ */
const gI = (err = false) => [
    'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 text-slate-100 placeholder-slate-600',
    'bg-white/[0.05] border',
    err ? 'ring-2 ring-red-500/40 border-red-500/30'
        : 'border-white/[0.09] hover:border-white/[0.16] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

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

const EstadoPill = ({ estado, meta = ESTADO_META }) => {
    const m = meta[estado] || { label: estado, color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.25)' };
    return (
        <span style={{ background: m.bg ?? m.color + '1a', border: `1px solid ${m.border ?? m.color + '40'}`, color: m.color }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap">
            {m.label}
        </span>
    );
};

const ProgressBar = ({ pct, color, height = '8px', showLabel = false }) => {
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const c = color || (p >= 80 ? '#34d399' : p >= 40 ? '#60a5fa' : '#fbbf24');
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', height }}>
                <div style={{ width: `${p}%`, background: c, height }} className="rounded-full transition-all duration-700" />
            </div>
            {showLabel && <span className="text-xs font-bold min-w-[36px] text-right" style={{ color: c }}>{p.toFixed(0)}%</span>}
        </div>
    );
};

const GlassCard = ({ children, className = '', onClick, style = {} }) => (
    <div
        className={`rounded-2xl ${onClick ? 'cursor-pointer hover:border-white/[0.14] transition-all' : ''} ${className}`}
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', ...style }}
        onClick={onClick}
    >
        {children}
    </div>
);

const SectionTitle = ({ icon: Icon, title, action }) => (
    <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <Icon size={14} className="text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-slate-200">{title}</h2>
        </div>
        {action}
    </div>
);

const SpinBtn = ({ loading, children, ...props }) => (
    <button {...props} disabled={loading || props.disabled}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40 transition-all ${props.className || ''}`}>
        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
        {children}
    </button>
);

/* ══════════════════════════════════════════════════
   Indicador de salud
═══════════════════════════════════════════════════ */
const SALUD_META = {
    al_dia:          { label: 'Al día',          color: '#34d399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
    retraso_menor:   { label: 'Retraso menor',   color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
    retraso_critico: { label: 'Retraso crítico', color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
};

const calcSalud = (avanceReal, pctPlazo) => {
    if (pctPlazo == null) return null;
    const diff = pctPlazo - avanceReal;
    if (diff <= 10) return 'al_dia';
    if (diff <= 25) return 'retraso_menor';
    return 'retraso_critico';
};

const SaludChip = ({ avanceReal, pctPlazo }) => {
    const k = calcSalud(avanceReal, pctPlazo);
    if (!k) return null;
    const m = SALUD_META[k];
    return (
        <span style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.color }}
            className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap">
            {m.label}
        </span>
    );
};

/* ══════════════════════════════════════════════════
   SVG radial progress (no library)
═══════════════════════════════════════════════════ */
const RadialProgress = ({ pct, color, size = 72, strokeWidth = 7 }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const p = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    const dash = (p / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.07)" strokeWidth={strokeWidth} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
    );
};

/* ══════════════════════════════════════════════════
   Salud Financiera card (editable inline)
═══════════════════════════════════════════════════ */
const SALUD_FIN_META = {
    saludable: { label: 'Saludable', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
    atencion:  { label: 'Atención',  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
    critico:   { label: 'Crítico',   color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
};

const SaludFinancieraCard = ({ proyecto, canEdit = false, onRefresh }) => {
    const monto = parseFloat(proyecto.monto_contractual || proyecto.monto_contrato || proyecto.presupuesto_referencial || 0);
    if (monto <= 0) return null;

    // Guard: legacy projects without snapshot
    const tieneDesglose = proyecto.porcentaje_mano_obra != null;

    // Edit mode state
    const [editando, setEditando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({});
    const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

    // Snapshot for optimistic rollback
    const snapRef = useRef(null);

    const iniciarEdicion = () => {
        setForm({
            porcentaje_mano_obra:          String(parseFloat(proyecto.porcentaje_mano_obra        ?? 0)),
            porcentaje_utilidad_esperada:  String(parseFloat(proyecto.porcentaje_utilidad_esperada ?? 0)),
            usa_monto_fijo_mo:             proyecto.usa_monto_fijo_mo   ?? false,
            usa_monto_fijo_util:           proyecto.usa_monto_fijo_util  ?? false,
            presupuesto_mano_obra:         String(parseFloat(proyecto.presupuesto_mano_obra         ?? 0)),
            presupuesto_utilidad_esperada: String(parseFloat(proyecto.presupuesto_utilidad_esperada ?? 0)),
            justificacion_rentabilidad_baja: proyecto.justificacion_rentabilidad_baja ?? '',
        });
        setEditando(true);
    };

    // Live calculation in edit mode
    // Materiales: fixed from server (sum of recetas × beneficiaries + sobreentregas)
    // GG: auto-calculated residual = contractual - materiales - MO - Utilidad
    const calcLive = useMemo(() => {
        const porMO   = parseFloat(form.porcentaje_mano_obra        || 0);
        const porUtil = parseFloat(form.porcentaje_utilidad_esperada || 0);
        const pMO     = form.usa_monto_fijo_mo   ? parseFloat(form.presupuesto_mano_obra         || 0) : monto * porMO   / 100;
        const pUtil   = form.usa_monto_fijo_util  ? parseFloat(form.presupuesto_utilidad_esperada || 0) : monto * porUtil / 100;
        const pMat    = parseFloat(proyecto.presupuesto_materiales ?? 0);
        const pGG     = monto - pMat - pMO - pUtil;
        const utilPct = monto > 0 ? (pUtil / monto * 100) : 0;
        return { pMO, pGG, pUtil, pMat, rentPct: utilPct };
    }, [form, monto, proyecto.presupuesto_materiales]);

    const handleGuardar = async () => {
        try {
            setGuardando(true);
            const payload = {
                porcentaje_mano_obra:          parseFloat(form.porcentaje_mano_obra        || 0),
                porcentaje_utilidad_esperada:  parseFloat(form.porcentaje_utilidad_esperada || 0),
                usa_monto_fijo_mo:             form.usa_monto_fijo_mo,
                usa_monto_fijo_util:           form.usa_monto_fijo_util,
                presupuesto_mano_obra:         parseFloat(form.presupuesto_mano_obra         || 0),
                presupuesto_utilidad_esperada: parseFloat(form.presupuesto_utilidad_esperada || 0),
                justificacion_rentabilidad_baja: form.justificacion_rentabilidad_baja || null,
            };
            await proyectoService.actualizarPorcentajesFinancieros(proyecto.id, payload);
            toast.success('Presupuesto actualizado');
            setEditando(false);
            onRefresh?.();
        } catch (e) {
            const msg = e.response?.data?.message || e.message || 'Error al guardar';
            toast.error(msg);
        } finally { setGuardando(false); }
    };

    if (!tieneDesglose && !editando) {
        return (
            <GlassCard className="p-5">
                <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-slate-500" />
                    <h3 className="text-sm font-bold text-white">Salud Financiera</h3>
                    {canEdit && (
                        <button onClick={iniciarEdicion} className="ml-auto text-xs px-2 py-1 rounded-lg text-emerald-400 hover:text-white" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <Edit size={11} className="inline mr-1" />Configurar
                        </button>
                    )}
                </div>
                <p className="text-xs text-slate-500">Sin desglose financiero registrado.</p>
            </GlassCard>
        );
    }

    const pctMO   = parseFloat(proyecto.porcentaje_mano_obra        ?? 0);
    const pctGG   = parseFloat(proyecto.porcentaje_gastos_generales ?? 0);
    const pctUtil = parseFloat(proyecto.porcentaje_utilidad_esperada ?? 0);
    const presupMO   = proyecto.presupuesto_mano_obra   != null ? parseFloat(proyecto.presupuesto_mano_obra)        : monto * pctMO   / 100;
    const presupGG   = proyecto.presupuesto_gastos_generales != null ? parseFloat(proyecto.presupuesto_gastos_generales) : monto * pctGG   / 100;
    const presupUtil = proyecto.presupuesto_utilidad_esperada != null ? parseFloat(proyecto.presupuesto_utilidad_esperada) : monto * pctUtil / 100;
    const presupMat  = proyecto.presupuesto_materiales != null ? parseFloat(proyecto.presupuesto_materiales) : monto - presupMO - presupGG - presupUtil;
    const saludKey   = proyecto.salud_financiera ?? (pctUtil >= 15 ? 'saludable' : pctUtil >= 5 ? 'atencion' : 'critico');
    const sm         = SALUD_FIN_META[saludKey] ?? SALUD_FIN_META.critico;
    const bs         = n => `Bs. ${Math.round(n || 0).toLocaleString('es-BO')}`;
    const pct        = n => monto > 0 ? Math.max(0, Math.min(100, n / monto * 100)) : 0;

    if (editando) {
        const liveSm = SALUD_FIN_META[calcLive.rentPct >= 10 ? 'saludable' : calcLive.rentPct >= 5 ? 'atencion' : 'critico'];
        return (
            <GlassCard className="p-5" style={{ borderColor: 'rgba(52,211,153,0.3)', background: 'rgba(52,211,153,0.03)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">Salud Financiera — Editar</h3>
                    </div>
                    <span className="text-xs text-slate-500">{bs(monto)} contractual</span>
                </div>

                {/* Live preview bar */}
                <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                        <span>Materiales <span className="text-blue-400 font-semibold">{bs(calcLive.pMat)} ({pct(calcLive.pMat).toFixed(1)}%)</span></span>
                        <span style={{ color: liveSm.color }}>{liveSm.label} · Util: {calcLive.rentPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                        <div style={{ width: `${pct(calcLive.pMat)}%`, background: '#60a5fa' }} className="rounded-l-full" />
                        <div style={{ width: `${pct(calcLive.pMO)}%`, background: '#a78bfa' }} />
                        <div style={{ width: `${pct(calcLive.pGG)}%`, background: '#fbbf24' }} />
                        <div style={{ width: `${pct(calcLive.pUtil)}%`, background: liveSm.color }} className="rounded-r-full" />
                    </div>
                </div>

                {/* Mano de Obra */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-purple-300">Mano de Obra</span>
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={form.usa_monto_fijo_mo} onChange={e => setF('usa_monto_fijo_mo', e.target.checked)} className="accent-purple-500 w-3 h-3" />
                            Monto fijo
                        </label>
                    </div>
                    {form.usa_monto_fijo_mo ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Bs.</span>
                            <input type="number" min="0" step="100" value={form.presupuesto_mano_obra}
                                onChange={e => setF('presupuesto_mano_obra', e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1 focus:ring-purple-500/40" />
                            <span className="text-[10px] text-slate-500 w-16 text-right">{pct(calcLive.pMO).toFixed(1)}% del total</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.5" value={form.porcentaje_mano_obra}
                                onChange={e => setF('porcentaje_mano_obra', e.target.value)}
                                className="w-20 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1 focus:ring-purple-500/40" />
                            <span className="text-[10px] text-slate-500">%</span>
                            <span className="text-[10px] text-slate-500 ml-auto">{bs(calcLive.pMO)}</span>
                        </div>
                    )}
                </div>

                {/* Gastos Generales — auto-calculado (residual) */}
                <div className="mb-3 p-2.5 rounded-xl" style={{ background: calcLive.pGG < 0 ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.06)', border: `1px solid ${calcLive.pGG < 0 ? 'rgba(248,113,113,0.25)' : 'rgba(251,191,36,0.15)'}` }}>
                    <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[11px] font-semibold text-yellow-300">Gastos Generales <span className="text-[10px] text-slate-500 font-normal">(auto)</span></span>
                        {calcLive.pGG < 0 && <span className="text-[10px] text-red-400 font-bold">NEGATIVO</span>}
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className={calcLive.pGG < 0 ? 'text-red-400 font-semibold' : 'text-yellow-200'}>{bs(calcLive.pGG)}</span>
                        <span className="text-slate-500">{pct(calcLive.pGG).toFixed(1)}% del total · residual</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">GG = Contractual − Materiales − MO − Utilidad. Se reduce si hay sobreentregas.</p>
                </div>

                {/* Utilidad */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold" style={{ color: liveSm.color }}>Utilidad Esperada</span>
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={form.usa_monto_fijo_util} onChange={e => setF('usa_monto_fijo_util', e.target.checked)} className="w-3 h-3" />
                            Monto fijo
                        </label>
                    </div>
                    {form.usa_monto_fijo_util ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Bs.</span>
                            <input type="number" min="0" step="100" value={form.presupuesto_utilidad_esperada}
                                onChange={e => setF('presupuesto_utilidad_esperada', e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1" />
                            <span className="text-[10px] text-slate-500 w-16 text-right">{pct(calcLive.pUtil).toFixed(1)}% del total</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.5" value={form.porcentaje_utilidad_esperada}
                                onChange={e => setF('porcentaje_utilidad_esperada', e.target.value)}
                                className="w-20 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1" />
                            <span className="text-[10px] text-slate-500">%</span>
                            <span className="text-[10px] text-slate-500 ml-auto">{bs(calcLive.pUtil)}</span>
                        </div>
                    )}
                </div>

                {/* Justificación (si rentabilidad baja) */}
                {calcLive.rentPct < 5 && (
                    <div className="mb-3">
                        <label className="block text-[10px] text-red-400 mb-1">Justificación rentabilidad baja *</label>
                        <textarea rows={2} value={form.justificacion_rentabilidad_baja}
                            onChange={e => setF('justificacion_rentabilidad_baja', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none resize-none bg-white/[0.06] border border-red-500/30 focus:ring-1 focus:ring-red-500/40"
                            placeholder="Razón por baja rentabilidad…" />
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-1">
                    <button onClick={() => setEditando(false)} className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancelar
                    </button>
                    <SpinBtn loading={guardando} onClick={handleGuardar}
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)', padding: '6px 14px', fontSize: '12px' }}>
                        <Check size={13} /> Guardar
                    </SpinBtn>
                </div>
            </GlassCard>
        );
    }

    // ── Read mode ──
    const alertaGG = proyecto.alerta_gg_bajo || presupGG < 0;
    const barras = [
        { label: 'Materiales',                        monto: presupMat,  color: '#60a5fa' },
        { label: `MO (${pctMO.toFixed(1)}%)`,         monto: presupMO,   color: '#a78bfa' },
        { label: `GG auto (${pctGG.toFixed(1)}%)${alertaGG ? ' ⚠' : ''}`, monto: presupGG, color: alertaGG ? '#f87171' : '#fbbf24' },
        { label: `Utilidad (${pctUtil.toFixed(1)}%)`, monto: presupUtil, color: sm.color },
    ];

    return (
        <GlassCard className="p-4 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} style={{ color: sm.color }} />
                    <h3 className="text-sm font-bold text-white">Salud Financiera</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: sm.color + '18', color: sm.color, border: `1px solid ${sm.color}35` }}>
                        {sm.label}
                    </span>
                </div>
                {canEdit && (
                    <button onClick={iniciarEdicion} title="Editar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Edit size={12} />
                    </button>
                )}
            </div>

            {/* Centered donut */}
            <div className="flex justify-center flex-1">
                <div className="relative">
                    <PieChart width={170} height={170}>
                        <Pie
                            data={barras.map(b => ({ name: b.label, value: Math.max(0, pct(b.monto)), color: b.color }))}
                            cx={85} cy={85} innerRadius={55} outerRadius={72}
                            dataKey="value" paddingAngle={3} startAngle={90} endAngle={450}
                            stroke="none" isAnimationActive animationDuration={900}>
                            {barras.map((b, i) => <Cell key={i} fill={b.color} />)}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] text-slate-600 uppercase tracking-wide">Contrato</span>
                        <span className="text-base font-black" style={{ color: sm.color }}>{pct(presupUtil).toFixed(0)}%</span>
                        <span className="text-[9px] text-slate-500">{bs(monto)}</span>
                    </div>
                </div>
            </div>

            {/* Compact legend — 2×2 */}
            <div className="grid grid-cols-2 gap-1.5 mt-3">
                {barras.map(({ label, monto: m, color }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                        <div className="min-w-0">
                            <p className="text-[9px] text-slate-600 truncate leading-none mb-0.5">{label.split(' (')[0]}</p>
                            <p className="text-[10px] font-bold text-slate-300 leading-none">{bs(m)}</p>
                        </div>
                    </div>
                ))}
            </div>

            {alertaGG && (
                <div className="mt-2 p-2 rounded-xl flex items-start gap-1.5"
                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <AlertTriangle size={10} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-red-300 leading-relaxed">
                        {presupGG < 0 ? `GG negativo (${bs(presupGG)})` : `GG bajo umbral (${pctGG.toFixed(1)}%)`}
                    </p>
                </div>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Finanzas + Alertas de Productos
═══════════════════════════════════════════════════ */
const HITO_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24'];

const HITO_ESTADO_META = {
    planificado:      { label: 'Planificado',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    listo_para_cobro: { label: 'Listo para cobrar', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
    cobrado:          { label: 'Cobrado',            color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

const ALERTA_META = {
    verde:    { label: 'Al día',  color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)'  },
    amarillo: { label: 'Próximo', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)'  },
    rojo:     { label: 'Urgente', color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.3)' },
    vencido:  { label: 'Vencido', color: '#e11d48', bg: 'rgba(225,29,72,0.12)',   border: 'rgba(225,29,72,0.3)'   },
};

const GlassTooltip = ({ label, rows }) => (
    <div className="rounded-xl px-3 py-2 text-xs shadow-xl"
        style={{ background: 'rgba(10,18,36,0.97)', border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
        {label && <p className="font-bold text-slate-200 mb-1.5 text-[11px]">{label}</p>}
        {rows.map(({ key, color, name, value }) => (
            <div key={key} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-slate-400">{name}:</span>
                <span className="font-bold text-white">{value}</span>
            </div>
        ))}
    </div>
);

const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <GlassTooltip label={label} rows={payload.map(p => ({
            key: p.dataKey, color: p.fill || p.color, name: p.name,
            value: `${parseFloat(p.value).toFixed(1)}%`,
        }))} />
    );
};

const HeroAreaTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <GlassTooltip label={label} rows={payload.map(p => ({
            key: p.dataKey, color: p.stroke || p.color, name: p.name,
            value: `${parseFloat(p.value).toFixed(1)}%`,
        }))} />
    );
};

const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <GlassTooltip label={null} rows={[{
            key: 'v', color: d.payload?.color || d.color, name: (d.name ?? '').split(' (')[0],
            value: `${parseFloat(d.value).toFixed(1)}%`,
        }]} />
    );
};

const FinanzasSection = ({ proyecto, hitosCobro = [] }) => {
    const monto = parseFloat(proyecto.monto_contractual || proyecto.presupuesto_referencial || 0);
    if (monto <= 0 && hitosCobro.length === 0) return null;

    const bs = n => `Bs. ${Math.round(n || 0).toLocaleString('es-BO')}`;

    const cobrado      = hitosCobro.filter(h => h.estado === 'cobrado').reduce((s, h) => s + parseFloat(h.monto_calculado || 0), 0);
    const listo        = hitosCobro.filter(h => h.estado === 'listo_para_cobro').reduce((s, h) => s + parseFloat(h.monto_calculado || 0), 0);
    const pendiente    = monto - cobrado - listo;
    const pctCobrado   = monto > 0 ? Math.min(100, cobrado / monto * 100) : 0;
    const pctListo     = monto > 0 ? Math.min(100, listo   / monto * 100) : 0;
    const pctPendiente = Math.max(0, 100 - pctCobrado - pctListo);
    const sumaMontos   = hitosCobro.reduce((s, h) => s + parseFloat(h.monto_calculado || 0), 0);
    const discrepancia = monto > 0 && hitosCobro.length > 0 && Math.abs(sumaMontos - monto) > 1;

    // Avance físico total del proyecto = SUM(peso × completitud / 100) para cada producto.
    // Cuando todos los productos están al 100%, esto da 100% (los pesos suman 100%).
    const avanceFisicoTotal = parseFloat(
        hitosCobro.reduce((s, h) => {
            const peso = parseFloat(h.avance_programado ?? 0);
            const comp = parseFloat(h.avance_real ?? 0);
            return s + (peso * comp / 100);
        }, 0).toFixed(1)
    );

    const alertCounts = {
        rojo:    hitosCobro.filter(h => h.nivel_alerta === 'rojo').length,
        vencido: hitosCobro.filter(h => h.nivel_alerta === 'vencido').length,
        amarillo:hitosCobro.filter(h => h.nivel_alerta === 'amarillo').length,
    };
    const hayCriticos = alertCounts.rojo + alertCounts.vencido > 0;

    return (
        <GlassCard className="overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-4 px-5 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                        <BarChart2 size={14} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Flujo de Cobro</h3>
                    {hayCriticos && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-300"
                            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.25)' }}>
                            <AlertTriangle size={9} />
                            {alertCounts.vencido > 0
                                ? `${alertCounts.vencido} vencido${alertCounts.vencido > 1 ? 's' : ''}`
                                : `${alertCounts.rojo} crítico${alertCounts.rojo > 1 ? 's' : ''}`}
                        </span>
                    )}
                    {alertCounts.amarillo > 0 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-300"
                            style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                            <AlertTriangle size={9} />
                            {alertCounts.amarillo} próximo{alertCounts.amarillo > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="text-right shrink-0">
                    {monto > 0 && <p className="text-sm font-bold text-slate-400">{bs(monto)}</p>}
                    {hitosCobro.length > 0 && (
                        <p className="text-[10px] text-slate-600">
                            Avance físico: <span className="text-slate-300 font-semibold">{avanceFisicoTotal.toFixed(1)}%</span>
                        </p>
                    )}
                </div>
            </div>

            {/* ── Barra de cobro global ── */}
            {monto > 0 && (
                <div className="px-5 py-3"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.012)' }}>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-2">
                        <div style={{ width: `${pctCobrado}%`, background: '#34d399', minWidth: pctCobrado > 0 ? '3px' : 0 }}
                            className="transition-all duration-700" />
                        <div style={{ width: `${pctListo}%`, background: '#60a5fa', minWidth: pctListo > 0 ? '3px' : 0 }}
                            className="transition-all duration-700" />
                        <div style={{ width: `${pctPendiente}%`, background: 'rgba(255,255,255,0.07)' }}
                            className="transition-all duration-700 rounded-r-full" />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-[10px]">
                        <span className="text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            Cobrado {bs(cobrado)} ({pctCobrado.toFixed(1)}%)
                        </span>
                        <span className="text-blue-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                            Listo {bs(listo)} ({pctListo.toFixed(1)}%)
                        </span>
                        <span className="text-slate-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }} />
                            Pendiente {bs(Math.max(0, pendiente))}
                        </span>
                    </div>
                </div>
            )}

            {/* ── Productos — tabla unificada ── */}
            {hitosCobro.length > 0 ? (
                <div>
                    {hitosCobro.map((h, i) => {
                        const alerta     = ALERTA_META[h.nivel_alerta] ?? null;
                        const estadoMeta = HITO_ESTADO_META[h.estado] ?? HITO_ESTADO_META.planificado;
                        const hitoColor  = HITO_COLORS[i % HITO_COLORS.length];
                        const completitud = parseFloat(h.avance_real ?? 0);         // % ítems terminados en este producto (0-100%)
                        const peso        = parseFloat(h.avance_programado ?? 0);   // % del proyecto total que representa este producto
                        const planHoy     = h.avance_planificado != null ? parseFloat(h.avance_planificado) : null; // % esperado HOY según plazo
                        const aporte      = parseFloat((peso * completitud / 100).toFixed(1)); // contribución real al avance del proyecto
                        const sinAvance   = h.items_sin_avance ?? 0;
                        const totalItems  = h.items_total ?? 0;
                        const dias        = h.dias_restantes;
                        const montoH      = parseFloat(h.monto_calculado || 0);
                        const isCritico   = ['rojo', 'vencido'].includes(h.nivel_alerta);
                        const alertColor  = alerta?.color ?? estadoMeta.color;

                        return (
                            <div key={h.id ?? i}
                                className="px-5 py-3.5 transition-colors hover:bg-white/[0.018]"
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    borderLeft: `3px solid ${isCritico ? alerta.color : h.nivel_alerta === 'amarillo' ? alerta?.color : 'transparent'}`,
                                    background: isCritico ? alerta.bg : 'transparent',
                                }}>
                                <div className="flex items-center gap-3 sm:gap-4">

                                    {/* Badge número */}
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                                        style={{ background: hitoColor + '20', color: hitoColor }}>
                                        {i + 1}
                                    </div>

                                    {/* Nombre + fecha */}
                                    <div className="w-32 sm:w-40 shrink-0 min-w-0">
                                        <p className="text-xs font-semibold text-white truncate">{h.nombre}</p>
                                        {h.fecha_planificada && (
                                            <p className="text-[10px] text-slate-500 truncate">
                                                {h.fecha_cobrado ? `✓ ${h.fecha_cobrado}` : `Vence ${h.fecha_planificada}`}
                                            </p>
                                        )}
                                    </div>

                                    {/* Monto + % contrato */}
                                    <div className="hidden sm:block w-24 shrink-0 text-right">
                                        <p className="text-xs font-semibold text-slate-300">{bs(montoH)}</p>
                                        <p className="text-[10px] text-slate-600">{parseFloat(h.porcentaje_contrato || 0).toFixed(1)}% contrato</p>
                                    </div>

                                    {/* Barras: completitud real vs objetivo temporal (mismo eje 0-100%) */}
                                    <div className="flex-1 min-w-0 space-y-1.5">
                                        {/* Completado — % real de ítems terminados en este producto */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-500 w-16 shrink-0 text-right">Completado</span>
                                            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${Math.min(100, completitud)}%`, background: alertColor }} />
                                            </div>
                                            <span className="text-[10px] font-bold w-9 shrink-0" style={{ color: alertColor }}>
                                                {completitud.toFixed(1)}%
                                            </span>
                                        </div>
                                        {/* Obj. hoy — dónde debería estar HOY según fecha inicio → deadline del producto */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-slate-600 w-16 shrink-0 text-right">Obj. hoy</span>
                                            {planHoy != null ? (
                                                <>
                                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                        <div className="h-full rounded-full transition-all duration-700"
                                                            style={{ width: `${Math.min(100, planHoy)}%`, background: 'rgba(148,163,184,0.45)' }} />
                                                    </div>
                                                    <span className="text-[10px] font-medium w-9 shrink-0 text-slate-500">
                                                        {planHoy.toFixed(1)}%
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="flex-1" />
                                                    <span className="text-[10px] w-9 shrink-0 text-slate-700">—</span>
                                                </>
                                            )}
                                        </div>
                                        {/* Peso e aporte — importancia relativa del producto en el proyecto */}
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-16 shrink-0" />
                                            <span className="text-[9px] whitespace-nowrap" style={{ color: hitoColor + 'aa' }}>
                                                Pond.: {peso > 0 ? `${peso.toFixed(1)}%` : '—'}
                                            </span>
                                            {peso > 0 && (
                                                <>
                                                    <span className="text-slate-700 text-[9px]">·</span>
                                                    <span className="text-[9px] text-slate-500 whitespace-nowrap">
                                                        Aporta: <span className="text-slate-400">{aporte.toFixed(1)}%</span>
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items count */}
                                    <div className="hidden md:block w-24 shrink-0 text-right">
                                        {totalItems > 0 ? (
                                            <>
                                                <p className="text-[10px] text-slate-500">{totalItems} ítems</p>
                                                {sinAvance > 0 && (
                                                    <p className="text-[10px] text-red-400 font-semibold">{sinAvance} sin avance</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-[10px] text-slate-600 italic">Sin ítems</p>
                                        )}
                                    </div>

                                    {/* Estado / alerta + días restantes + desvío del plan */}
                                    <div className="shrink-0 flex flex-col items-end gap-1 min-w-[72px]">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap"
                                            style={{ background: alertColor + '20', color: alertColor, border: `1px solid ${alertColor}30` }}>
                                            {alerta ? alerta.label : estadoMeta.label}
                                        </span>
                                        {dias != null && (
                                            <span className={`text-[9px] font-medium whitespace-nowrap ${
                                                h.nivel_alerta === 'vencido' ? 'text-red-400' :
                                                dias <= 7 ? 'text-amber-400' : 'text-slate-600'
                                            }`}>
                                                {h.nivel_alerta === 'vencido' ? 'Vencido' : `${dias}d rest.`}
                                            </span>
                                        )}
                                        {h.retraso != null && Math.abs(h.retraso) > 1 && (
                                            <span className="text-[9px] whitespace-nowrap font-medium" style={{
                                                color: h.retraso > 0 ? alertColor : '#34d399'
                                            }}>
                                                {h.retraso > 0
                                                    ? `−${parseFloat(h.retraso).toFixed(1)}pp`
                                                    : `+${Math.abs(parseFloat(h.retraso)).toFixed(1)}pp`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-xs text-slate-500 text-center py-6">Sin productos contractuales configurados</p>
            )}

            {/* Discrepancia warning */}
            {discrepancia && (
                <div className="px-5 py-2 flex items-center gap-2 text-[10px] text-amber-400"
                    style={{ background: 'rgba(251,191,36,0.06)', borderTop: '1px solid rgba(251,191,36,0.15)' }}>
                    <AlertTriangle size={10} className="shrink-0" />
                    Suma de productos ({bs(sumaMontos)}) difiere del monto contractual ({bs(monto)})
                </div>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   CambiarEstado modal
═══════════════════════════════════════════════════ */
const CambiarEstadoModal = ({ proyecto, transiciones, onGuardado, onCerrar }) => {
    const [estado, setEstado] = useState('');
    const [razon, setRazon] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleSubmit = async () => {
        if (!estado) { toast.error('Selecciona un estado'); return; }
        if (['cancelado', 'pausado'].includes(estado) && !razon.trim()) { toast.error('La razón es obligatoria'); return; }
        try {
            setGuardando(true);
            await proyectoService.cambiarEstado(proyecto.id, estado, razon);
            toast.success('Estado actualizado');
            onGuardado();
        } catch (e) { toast.error(e.response?.data?.message || e.message || 'Error'); }
        finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Cambiar Estado</h3>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="text-sm text-slate-400 flex items-center gap-2">
                    Estado actual: <EstadoPill estado={proyecto.estado} />
                </div>
                <GF label="Nuevo Estado" required>
                    <select value={estado} onChange={e => setEstado(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-sm bg-white/[0.05] border border-white/[0.09] text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/40">
                        <option value="">— Seleccionar —</option>
                        {transiciones.map(t => <option key={t} value={t}>{ESTADO_META[t]?.label ?? t}</option>)}
                    </select>
                </GF>
                {['cancelado', 'pausado'].includes(estado) && (
                    <GF label="Razón" required>
                        <textarea rows={3} className={gI(false) + ' resize-none'} value={razon} onChange={e => setRazon(e.target.value)} placeholder="Motivo..." />
                    </GF>
                )}
                <div className="flex justify-end gap-3 pt-1">
                    <button onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                    <SpinBtn loading={guardando} onClick={handleSubmit} style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                        <Check size={15} /> Confirmar
                    </SpinBtn>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Editar Fase modal (Gantt click)
═══════════════════════════════════════════════════ */
const EditarFaseModal = ({ fase, onGuardado, onCerrar }) => {
    const [form, setForm] = useState({
        nombre:                    fase.nombre ?? '',
        fecha_inicio_planificada:  fase.fecha_inicio_planificada ?? '',
        fecha_fin_planificada:     fase.fecha_fin_planificada ?? '',
        avance_porcentaje:         fase.porcentaje_avance ?? 0,
    });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const handleSubmit = async () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (form.fecha_inicio_planificada && form.fecha_fin_planificada && form.fecha_inicio_planificada > form.fecha_fin_planificada)
            e.fecha_fin_planificada = 'La fecha fin debe ser posterior al inicio';
        const avance = parseFloat(form.avance_porcentaje);
        if (isNaN(avance) || avance < 0 || avance > 100) e.avance_porcentaje = 'Entre 0 y 100';
        setErrores(e);
        if (Object.keys(e).length) return;

        try {
            setGuardando(true);
            await api.put(`/fases/${fase.id}`, {
                nombre:                   form.nombre,
                fecha_inicio_planificada: form.fecha_inicio_planificada || null,
                fecha_fin_planificada:    form.fecha_fin_planificada || null,
            });
            if (avance !== fase.porcentaje_avance) {
                await api.patch(`/fases/${fase.id}/avance`, { porcentaje: avance });
            }
            toast.success('Fase actualizada');
            onGuardado();
        } catch (ex) {
            const msgs = ex.response?.data?.errors ?? {};
            if (Object.keys(msgs).length) setErrores(msgs);
            toast.error(ex.response?.data?.message || 'Error al guardar');
        } finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Editar Fase</h3>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white"><X size={18} /></button>
                </div>
                <GF label="Nombre" required error={errores.nombre}>
                    <input className={gI(!!errores.nombre)} value={form.nombre} onChange={e => set('nombre', e.target.value)} />
                </GF>
                <div className="grid grid-cols-2 gap-3">
                    <GF label="Inicio planificado" error={errores.fecha_inicio_planificada}>
                        <input type="date" className={gI(!!errores.fecha_inicio_planificada)} value={form.fecha_inicio_planificada} onChange={e => set('fecha_inicio_planificada', e.target.value)} />
                    </GF>
                    <GF label="Fin planificado" error={errores.fecha_fin_planificada}>
                        <input type="date" className={gI(!!errores.fecha_fin_planificada)} value={form.fecha_fin_planificada} onChange={e => set('fecha_fin_planificada', e.target.value)} />
                    </GF>
                </div>
                <GF label="Avance (%)" error={errores.avance_porcentaje}>
                    <div className="flex items-center gap-3">
                        <input type="range" min="0" max="100" step="1"
                            value={form.avance_porcentaje}
                            onChange={e => set('avance_porcentaje', e.target.value)}
                            className="flex-1 accent-emerald-500" />
                        <span className="text-sm font-bold text-emerald-400 w-12 text-right">{form.avance_porcentaje}%</span>
                    </div>
                    {errores.avance_porcentaje && <p className="text-xs text-red-400 mt-1">{errores.avance_porcentaje}</p>}
                </GF>
                <div className="flex justify-end gap-3 pt-1">
                    <button onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Cancelar</button>
                    <SpinBtn loading={guardando} onClick={handleSubmit} style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.8))', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>
                        <Check size={15} /> Guardar
                    </SpinBtn>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Reporte técnico — modal completo
═══════════════════════════════════════════════════ */
const ReporteTecnicoModal = ({ unidad, tipo, proyectoId, onCerrar, onGuardado }) => {
    const fileRef = useRef(null);
    const [form, setForm] = useState({
        fecha_reporte:    new Date().toISOString().split('T')[0],
        descripcion:      '',
        observaciones:    '',
        latitud_tecnico:  '',
        longitud_tecnico: '',
    });
    const [avancesItems, setAvancesItems] = useState(() => {
        const init = {};
        (unidad?.items_checklist ?? []).forEach(item => {
            init[item.id] = parseFloat(item.porcentaje_avance ?? 0);
        });
        return init;
    });
    const [fotos,      setFotos]      = useState([]);
    const [gpsLoading,  setGpsLoading]  = useState(false);
    const [subiendo,    setSubiendo]    = useState(false);
    const [guardando,   setGuardando]   = useState(false);
    const [errores,     setErrores]     = useState({});
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const capturarGPS = () => {
        if (!navigator.geolocation) { toast.error('GPS no disponible en este dispositivo'); return; }
        setGpsLoading(true);
        navigator.geolocation.getCurrentPosition(
            pos => {
                set('latitud_tecnico',  pos.coords.latitude);
                set('longitud_tecnico', pos.coords.longitude);
                setGpsLoading(false);
                toast.success('Ubicación capturada');
            },
            () => { toast.error('No se pudo obtener la ubicación'); setGpsLoading(false); }
        );
    };

    const handleFiles = async (files) => {
        for (const file of Array.from(files)) {
            setSubiendo(true);
            try {
                const res = await reporteTecnicoService.subirFoto(file, proyectoId, unidad?.id ?? 0);
                setFotos(f => [...f, { url_original: res.url_original, url_thumbnail: res.url_thumbnail, caption: '' }]);
            } catch { toast.error(`Error al subir ${file.name}`); }
            finally { setSubiendo(false); }
        }
    };

    const handleSubmit = async () => {
        setErrores({});
        setGuardando(true);
        try {
            await reporteTecnicoService.crear({
                proyecto_id:    parseInt(proyectoId),
                ...(tipo === 'vivienda' ? { vivienda_id: unidad.id } : { fase_id: unidad.id }),
                fecha_reporte:    form.fecha_reporte,
                descripcion:      form.descripcion    || null,
                observaciones:    form.observaciones  || null,
                latitud_tecnico:  form.latitud_tecnico  || null,
                longitud_tecnico: form.longitud_tecnico || null,
                avances_items:    Object.keys(avancesItems).length ? avancesItems : null,
                fotos:            fotos.length ? fotos : null,
            });
            toast.success('Reporte técnico registrado');
            onGuardado?.();
            onCerrar();
        } catch (ex) {
            const msgs = ex.response?.data?.errors ?? {};
            if (Object.keys(msgs).length) setErrores(msgs);
            toast.error(ex.response?.data?.message || 'Error al guardar el reporte');
        } finally { setGuardando(false); }
    };

    const items = unidad?.items_checklist ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full sm:max-w-2xl max-h-[92vh] flex flex-col rounded-t-3xl sm:rounded-2xl overflow-hidden"
                style={{ background: 'rgba(8,18,36,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>

                {/* Header fijo */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                            <ClipboardList size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Nuevo Reporte Técnico</h3>
                            <p className="text-[10px] text-slate-500">
                                {unidad?.nombre ?? unidad?.codigo} &middot; {tipo}
                            </p>
                        </div>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Cuerpo scrollable */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* Fecha + GPS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <GF label="Fecha del reporte">
                            <div className={gI(false) + ' flex items-center text-slate-300 select-none'}
                                style={{ cursor: 'default' }}>
                                {form.fecha_reporte}
                            </div>
                        </GF>
                        <GF label="Ubicación GPS del técnico">
                            <button type="button" onClick={capturarGPS} disabled={gpsLoading}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all disabled:opacity-40"
                                style={{
                                    background: form.latitud_tecnico ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)',
                                    border: `1px solid ${form.latitud_tecnico ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.09)'}`,
                                    color: form.latitud_tecnico ? '#34d399' : '#94a3b8',
                                }}>
                                {gpsLoading
                                    ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
                                    : <MapPin size={14} className="shrink-0" />}
                                <span className="truncate">
                                    {form.latitud_tecnico
                                        ? `${parseFloat(form.latitud_tecnico).toFixed(5)}, ${parseFloat(form.longitud_tecnico).toFixed(5)}`
                                        : 'Capturar ubicación'}
                                </span>
                            </button>
                        </GF>
                    </div>

                    {/* Descripción */}
                    <GF label="Descripción del trabajo realizado" hint={`${form.descripcion.length}/50`}>
                        <textarea rows={2} className={`${gI(false)} resize-none`}
                            value={form.descripcion} onChange={e => set('descripcion', e.target.value.slice(0, 50))}
                            maxLength={50}
                            placeholder="Actividades realizadas, avances..." />
                    </GF>

                    {/* Observaciones */}
                    <GF label="Observaciones" hint={`${form.observaciones.length}/50`}>
                        <textarea rows={2} className={`${gI(false)} resize-none`}
                            value={form.observaciones} onChange={e => set('observaciones', e.target.value.slice(0, 50))}
                            maxLength={50}
                            placeholder="Condiciones del sitio, pendientes..." />
                    </GF>

                    {/* Checklist de avance */}
                    {items.length > 0 && (
                        <div>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-3">
                                Avance por Ítem de Checklist
                            </p>
                            <div className="space-y-2.5">
                                {items.map(item => {
                                    const pct = avancesItems[item.id] ?? parseFloat(item.porcentaje_avance ?? 0);
                                    const color = pct >= 100 ? '#34d399' : pct > 0 ? '#60a5fa' : '#94a3b8';
                                    return (
                                        <div key={item.id} className="rounded-xl p-3"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-medium text-slate-300 truncate flex-1 mr-2">
                                                    {item.nombre}
                                                </span>
                                                <span className="text-[10px] text-slate-500 shrink-0">
                                                    pond. {item.ponderacion}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input type="range" min="0" max="100" step="5"
                                                    value={pct}
                                                    onChange={e => setAvancesItems(p => ({ ...p, [item.id]: parseFloat(e.target.value) }))}
                                                    className="flex-1 accent-emerald-500" />
                                                <span className="text-sm font-bold w-12 text-right" style={{ color }}>
                                                    {pct.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Fotos */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em]">
                                Fotos ({fotos.length}/20)
                            </p>
                            <button type="button" onClick={() => fileRef.current?.click()}
                                disabled={subiendo || fotos.length >= 20}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all disabled:opacity-40"
                                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                                {subiendo
                                    ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                    : <Upload size={12} />}
                                Subir fotos
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                                onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
                        </div>

                        {fotos.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {fotos.map((f, i) => (
                                    <div key={i} className="relative group">
                                        <img src={f.url_thumbnail ?? f.url_original} alt=""
                                            className="w-full aspect-square object-cover rounded-xl"
                                            style={{ border: '1px solid rgba(255,255,255,0.08)' }} />
                                        <button onClick={() => setFotos(p => p.filter((_, idx) => idx !== i))}
                                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ background: 'rgba(239,68,68,0.9)' }}>
                                            <X size={10} className="text-white" />
                                        </button>
                                        <input value={f.caption}
                                            onChange={e => setFotos(p => p.map((x, idx) => idx === i ? { ...x, caption: e.target.value } : x))}
                                            placeholder="Descripción..."
                                            className="w-full mt-1 px-2 py-1 rounded-lg text-[10px] outline-none"
                                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#cbd5e1' }} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-xl p-5 text-center cursor-pointer hover:bg-white/[0.02] transition-colors"
                                style={{ border: '1px dashed rgba(255,255,255,0.1)' }}
                                onClick={() => fileRef.current?.click()}>
                                <Upload size={22} className="text-slate-600 mx-auto mb-1.5" />
                                <p className="text-xs text-slate-600">Haz clic para subir fotos (máx. 5 MB c/u, JPEG/PNG/WEBP)</p>
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer fijo */}
                <div className="flex justify-end gap-3 px-5 py-4 shrink-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={onCerrar}
                        className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancelar
                    </button>
                    <SpinBtn loading={guardando} onClick={handleSubmit}
                        style={{ background: 'linear-gradient(135deg,rgba(96,165,250,0.9),rgba(59,130,246,0.8))', boxShadow: '0 4px 12px rgba(96,165,250,0.25)' }}>
                        <Check size={15} /> Enviar Reporte
                    </SpinBtn>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Gantt Chart — Calendario con días / semanas
═══════════════════════════════════════════════════ */
const GanttChart = ({ gantt, canEdit, onEditItem, onExport }) => {
    const { items = [], fecha_inicio_proyecto, fecha_fin_proyecto, dias_totales } = gantt;

    const ROW_H  = 44;
    const LEFT_W = 195;

    /* ── date helpers ─────────────────────────────── */
    const parseDate = d => {
        if (!d) return null;
        const s = (typeof d === 'string' ? d : String(d)).split('T')[0].split(' ')[0];
        const [y, m, dd] = s.split('-').map(Number);
        return new Date(y, m - 1, dd);
    };
    const gAdd = (date, n) => {
        const d = new Date(date.getTime());
        d.setDate(d.getDate() + Math.round(n));
        return d;
    };
    const diffD = (a, b) => Math.round((b.getTime() - a.getTime()) / 86_400_000);
    const toISO = d =>
        `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const fmtD  = d => `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

    /* ── Bolivia holidays (cualquier año) ───────────
       Calcula Semana Santa con algoritmo de Gauss   */
    const getHolidays = year => {
        const a=year%19, b=Math.floor(year/100), c=year%100;
        const d=Math.floor(b/4), e=b%4, f=Math.floor((b+8)/25);
        const g=Math.floor((b-f+1)/3);
        const h=(19*a+b-d-g+15)%30;
        const i=Math.floor(c/4), k=c%4;
        const l=(32+2*e+2*i-h-k)%7;
        const m2=Math.floor((a+11*h+22*l)/451);
        const mes=Math.floor((h+l-7*m2+114)/31);
        const dia=((h+l-7*m2+114)%31)+1;
        const easter    = new Date(year, mes-1, dia);
        const NAMES     = {
            [`${year}-01-01`]: 'Año Nuevo',
            [`${year}-01-22`]: 'Estado Plurinacional',
            [toISO(gAdd(easter,-48))]: 'Lunes de Carnaval',
            [toISO(gAdd(easter,-47))]: 'Martes de Carnaval',
            [toISO(gAdd(easter,-2))]:  'Viernes Santo',
            [`${year}-05-01`]: 'Día del Trabajo',
            [toISO(gAdd(easter, 60))]: 'Corpus Christi',
            [`${year}-06-21`]: 'Año Nuevo Andino',
            [`${year}-08-06`]: 'Día de la Patria',
            [`${year}-11-02`]: 'Día de Difuntos',
            [`${year}-12-25`]: 'Navidad',
        };
        return NAMES;
    };

    const projStart = parseDate(fecha_inicio_proyecto);
    const projEnd   = parseDate(fecha_fin_proyecto);

    if (!projStart || !projEnd || items.length === 0) {
        return (
            <GlassCard className="p-5">
                <SectionTitle icon={Clock} title="Cronograma" />
                <div className="py-8 text-center text-sm text-slate-600">
                    No hay {gantt.tipo === 'social' ? 'productos contractuales' : 'fases'} configuradas
                </div>
            </GlassCard>
        );
    }

    const totalD = dias_totales || diffD(projStart, projEnd) || 1;

    /* ── Collect holidays for all years in range ─── */
    const allHolidays = {};
    for (let y = projStart.getFullYear(); y <= projEnd.getFullYear(); y++) {
        Object.assign(allHolidays, getHolidays(y));
    }
    const isHoliday  = d => allHolidays[toISO(d)] || null;
    const isWeekend  = d => d.getDay() === 0 || d.getDay() === 6;

    /* ── Build columns (siempre días individuales) ── */
    const CELL_W = totalD > 180 ? 13 : totalD > 120 ? 15 : totalD > 60 ? 17 : 20;

    const cols = [];
    let cur = new Date(projStart.getTime());
    while (cur <= projEnd) {
        cols.push({ start: new Date(cur) });
        cur = gAdd(cur, 1);
    }

    /* ── Month header groups ─────────────────────── */
    const MES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const months = [];
    let curMes = null;
    cols.forEach((col, i) => {
        const key = `${col.start.getFullYear()}-${col.start.getMonth()}`;
        if (!curMes || curMes.key !== key) {
            curMes = { key, label: `${MES[col.start.getMonth()]} ${col.start.getFullYear()}`, start: i, count: 1 };
            months.push(curMes);
        } else { curMes.count++; }
    });

    /* ── Map item → column range (cada col = 1 día) ── */
    const itemCols = item => {
        const startOff = Math.round((item.left / 100) * totalD);
        const durD     = Math.round((item.width / 100) * totalD);
        const s = Math.max(0, startOff);
        const e = Math.min(cols.length - 1, startOff + durD - 1);
        return { s, e: Math.max(s, e) };
    };

    /* ── Today column ────────────────────────────── */
    const today = new Date();
    today.setHours(0,0,0,0);
    let todayIdx = -1;
    if (today >= projStart && today <= projEnd) {
        todayIdx = diffD(projStart, today);
    }

    const totalW = cols.length * CELL_W;
    const btnCls = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all';
    const btnSt  = { background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)' };

    // Estado de "hoy" respecto al proyecto
    const diasHastaInicio = today < projStart ? diffD(today, projStart) : 0;
    const diasDesdeInicio = today > projEnd   ? diffD(projEnd, today)   : 0;
    const hoyChip = todayIdx >= 0
        ? { text: `Hoy · día ${todayIdx + 1}`, cls: 'text-amber-400 bg-amber-400/10 border-amber-400/25' }
        : diasHastaInicio > 0
        ? { text: `Hoy (inicio en ${diasHastaInicio}d)`, cls: 'text-slate-400 bg-white/[0.04] border-white/10' }
        : { text: `Hoy (terminó hace ${diasDesdeInicio}d)`, cls: 'text-slate-500 bg-white/[0.03] border-white/[0.06]' };

    return (
        <GlassCard>
            {/* ── Header ─────────────────────────────── */}
            <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-4 flex-wrap"
                style={{ borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.2)' }}>
                        <Clock size={14} className="text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-200">Cronograma</h2>
                    <span className="text-[11px] text-slate-500">{totalD} días · {fmtD(projStart)} → {fmtD(projEnd)}</span>
                    {/* Chip de hoy */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${hoyChip.cls}`}>
                        {hoyChip.text}
                    </span>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    {/* Leyenda */}
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-amber-400/50 inline-block"/>Hoy
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-red-400/40 inline-block"/>Feriado
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm bg-white/[0.06] inline-block"/>Fin semana
                        </span>
                    </div>
                    {onExport && (
                        <div className="flex gap-1.5">
                            <button onClick={() => onExport('pdf')}   className={btnCls} style={btnSt}><FileText size={12}/> PDF</button>
                            <button onClick={() => onExport('excel')} className={btnCls} style={btnSt}><Table2  size={12}/> Excel</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollbar personalizado oscuro */}
            <style>{`
                .gantt-scroll::-webkit-scrollbar{height:5px}
                .gantt-scroll::-webkit-scrollbar-track{background:transparent}
                .gantt-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:10px}
                .gantt-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.22)}
            `}</style>

            {/* ── Body scrollable ──────────────────────── */}
            <div className="gantt-scroll overflow-x-auto"
                style={{ scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.12) transparent' }}>
                <div style={{ minWidth: LEFT_W + totalW + 24 }}>

                    {/* Meses */}
                    <div className="flex border-b border-white/[0.05]"
                        style={{ paddingLeft: LEFT_W, background:'rgba(255,255,255,0.012)' }}>
                        {/* Hoy (fuera de rango): etiqueta en panel izquierdo */}
                        <div style={{ width: LEFT_W, minWidth: LEFT_W, marginLeft: -LEFT_W }}
                            className="absolute flex items-center">
                        </div>
                        {months.map(mg => (
                            <div key={mg.key} style={{ width: mg.count * CELL_W, minWidth: mg.count * CELL_W }}
                                className="text-[10px] font-bold text-slate-400 px-2 py-1.5 border-r border-white/[0.04] shrink-0 whitespace-nowrap overflow-hidden">
                                {mg.label}
                            </div>
                        ))}
                    </div>

                    {/* Días: letra + número */}
                    <div className="flex border-b-2 border-white/[0.07]" style={{ paddingLeft: LEFT_W }}>
                        {cols.map((col, i) => {
                            const hol     = isHoliday(col.start);
                            const wknd    = isWeekend(col.start);
                            const isToday = i === todayIdx;
                            const dayNum  = col.start.getDate();
                            const letra   = ['D','L','M','M','J','V','S'][col.start.getDay()];
                            const colorCls = hol     ? 'text-red-400'   :
                                             isToday ? 'text-amber-400' :
                                             wknd    ? 'text-slate-700'  : 'text-slate-500';
                            const bgCls    = hol     ? 'bg-red-400/[0.1]'    :
                                             isToday ? 'bg-amber-400/[0.13]' :
                                             wknd    ? 'bg-white/[0.02]'     : '';
                            return (
                                <div key={i}
                                    style={{ width: CELL_W, minWidth: CELL_W }}
                                    title={hol ? `🎉 ${hol}` : col.start.toLocaleDateString('es-BO')}
                                    className={`flex flex-col items-center justify-center gap-px py-1 border-r border-white/[0.035] shrink-0 relative cursor-default ${bgCls} ${hol || isToday ? 'font-bold' : ''}`}>
                                    <span style={{ fontSize: 7.5, lineHeight: 1 }} className={colorCls}>{letra}</span>
                                    <span style={{ fontSize: 7.5, lineHeight: 1 }} className={colorCls}>{dayNum}</span>
                                    {hol && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-0.5 rounded-full bg-red-400"/>}
                                </div>
                            );
                        })}
                    </div>

                    {/* Filas de tareas */}
                    <div className="divide-y divide-white/[0.04]">
                        {items.map(item => {
                            const meta  = item.tipo === 'fase'
                                ? FASE_ESTADO_META[item.estado] ?? FASE_ESTADO_META.pendiente
                                : { color: '#22d3ee' };
                            const color = item.vencida ? '#f87171' : meta.color;
                            const pct   = parseFloat(item.porcentaje_avance ?? item.porcentaje ?? 0);
                            const { s, e } = itemCols(item);
                            const barLeft  = s * CELL_W + 2;
                            const barWidth = Math.max(CELL_W - 4, (e - s + 1) * CELL_W - 4);

                            return (
                                <div key={item.id} className="flex hover:bg-white/[0.015] transition-colors"
                                    style={{ height: ROW_H }}>

                                    {/* Panel nombre */}
                                    <div style={{ width: LEFT_W, minWidth: LEFT_W }}
                                        className="flex items-center gap-2 px-3 shrink-0 border-r border-white/[0.06]">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }}/>
                                        <button
                                            className={`text-[11px] text-slate-300 truncate text-left flex-1 transition-colors ${canEdit && item.editable ? 'hover:text-emerald-400 cursor-pointer' : 'cursor-default'}`}
                                            onClick={() => canEdit && item.editable && onEditItem?.(item)}>
                                            {item.nombre}
                                        </button>
                                        <span className="text-[10px] font-mono shrink-0 ml-1" style={{ color }}>
                                            {pct.toFixed(0)}%
                                        </span>
                                        {item.vencida && <AlertTriangle size={10} className="text-red-400 shrink-0"/>}
                                    </div>

                                    {/* Zona calendario: celdas de fondo + barra overlay continua */}
                                    <div className="relative flex shrink-0" style={{ height: ROW_H, width: totalW }}>

                                        {/* Celdas: solo fondo + línea hoy */}
                                        {cols.map((col, i) => {
                                            const hol     = isHoliday(col.start);
                                            const wknd    = isWeekend(col.start);
                                            const isToday = i === todayIdx;
                                            return (
                                                <div key={i} style={{ width: CELL_W, minWidth: CELL_W, height: ROW_H }}
                                                    className={`relative border-r border-white/[0.03] shrink-0 ${
                                                        hol     ? 'bg-red-400/[0.05]' :
                                                        isToday ? 'bg-amber-400/[0.04]' :
                                                        wknd    ? 'bg-white/[0.015]' : ''
                                                    }`}>
                                                    {isToday && (
                                                        <div className="absolute inset-y-0 z-20 pointer-events-none"
                                                            style={{
                                                                left: CELL_W / 2 - 0.5,
                                                                width: 1.5,
                                                                background: 'rgba(251,191,36,0.85)',
                                                                boxShadow: '0 0 6px rgba(251,191,36,0.5)',
                                                            }}>
                                                            <div className="absolute -top-0.5 -left-[3px] w-2 h-2 rounded-full bg-amber-400"/>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Barra de tarea: un único div absoluto sobre las celdas */}
                                        <div className="absolute pointer-events-none overflow-hidden"
                                            style={{
                                                top: 9, bottom: 9,
                                                left: barLeft,
                                                width: barWidth,
                                                background: color + '20',
                                                border: `1.5px solid ${color}55`,
                                                borderRadius: 6,
                                            }}>
                                            {/* Fill de progreso */}
                                            <div style={{ width: `${pct}%`, height: '100%', background: color + '45' }}/>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="flex px-3 py-2 text-[10px] text-slate-600 border-t border-white/[0.04]"
                        style={{ paddingLeft: LEFT_W + 8 }}>
                        <span>{toISO(projStart)}</span>
                        <span className="mx-auto text-slate-700">{totalD} días calendarios</span>
                        <span>{toISO(projEnd)}</span>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Almacén card
═══════════════════════════════════════════════════ */
const AlmacenCard = ({ almacen, proyectoId, navigate }) => {
    const estadoMeta = almacen.estado === 'activo'
        ? { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', color: '#22c55e' }
        : { bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', color: '#64748b' };

    const itemsRegistrados = almacen.items_registrados ?? 0;
    const movimientosMes   = almacen.movimientos_mes ?? 0;
    const itemsCriticos    = almacen.items_criticos ?? 0;

    return (
        <GlassCard onClick={() => navigate(`/dashboard/proyectos/${proyectoId}/almacen`)}
            className="group p-5 hover:scale-[1.01]" style={{ transition: 'all 0.2s' }}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <Package size={18} className="text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Almacén del Proyecto</h3>
                        {almacen.existe && <p className="text-[10px] text-slate-500 font-mono">{almacen.codigo}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    {almacen.existe && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ background: estadoMeta.bg, border: `1px solid ${estadoMeta.border}`, color: estadoMeta.color }}>
                            {almacen.estado}
                        </span>
                    )}
                    <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
            </div>

            {almacen.existe ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <p className="text-xl font-bold text-amber-400">{itemsRegistrados}</p>
                            <p className="text-[10px] text-slate-500">Ítems en stock</p>
                        </div>
                        <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                            <p className="text-xl font-bold text-slate-300">{movimientosMes}</p>
                            <p className="text-[10px] text-slate-500">Movimientos/mes</p>
                        </div>
                    </div>

                    {itemsCriticos > 0 && (
                        <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                            style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                            <AlertTriangle size={12} className="text-red-400 shrink-0" />
                            <span className="text-[11px] text-red-400">
                                {itemsCriticos} {itemsCriticos === 1 ? 'ítem' : 'ítems'} con stock crítico
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate">{almacen.nombre}</p>
                        {almacen.ubicacion && (
                            <p className="text-[10px] text-slate-600 truncate shrink-0">{almacen.ubicacion}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-amber-400 font-medium">
                        <span>Ir al almacén del proyecto</span>
                        <ChevronRight size={11} />
                    </div>
                </div>
            ) : (
                <div className="text-center py-4">
                    <p className="text-sm text-slate-500 mb-1">Sin almacén asignado</p>
                    <p className="text-[10px] text-slate-600">Se genera automáticamente al crear el proyecto</p>
                </div>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Beneficiarios card (social)
═══════════════════════════════════════════════════ */
const BeneficiariosCard = ({ resumen, proyectoId, navigate }) => {
    const { total_registrados, cupo_total, cupos_restantes, ultimos = [] } = resumen;
    const pct = cupo_total > 0 ? Math.round((total_registrados / cupo_total) * 100) : 0;

    return (
        <GlassCard onClick={() => navigate(`/dashboard/proyectos/${proyectoId}/beneficiarios`)}
            className="group p-5 hover:scale-[1.01]" style={{ transition: 'all 0.2s' }}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.2)' }}>
                        <Users size={18} className="text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Beneficiarios</h3>
                        <p className="text-[10px] text-slate-500">{cupos_restantes} cupos disponibles</p>
                    </div>
                </div>
                <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
            </div>

            <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">{total_registrados} de {cupo_total} registrados</span>
                    <span className="text-cyan-400 font-bold">{pct}%</span>
                </div>
                <ProgressBar pct={pct} color="#22d3ee" height="6px" />
            </div>

            <div className="space-y-1.5">
                {ultimos.slice(0, 4).map(b => (
                    <div key={b.id} className="flex items-center gap-2 py-1">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                            style={{ background: 'rgba(34,211,238,0.2)' }}>
                            {b.nombre?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-300 flex-1 truncate">{b.nombre} {b.apellido_paterno}</span>
                        <EstadoPill estado={b.estado_seleccion} meta={BENEF_ESTADO_META} />
                    </div>
                ))}
                {total_registrados === 0 && (
                    <p className="text-sm text-slate-600 text-center py-2">Sin beneficiarios aún</p>
                )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-medium mt-3">
                <span>Gestionar beneficiarios</span>
                <ChevronRight size={11} />
            </div>
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Hitos card (privado — en lugar de beneficiarios)
═══════════════════════════════════════════════════ */
const HitosCard = ({ hitos = [] }) => (
    <GlassCard className="p-5">
        <SectionTitle icon={Flag} title="Hitos Próximos" />
        {hitos.length === 0 ? (
            <div className="text-center py-6">
                <Flag size={24} className="text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-600">Sin hitos próximos registrados</p>
            </div>
        ) : (
            <div className="space-y-2">
                {hitos.map(h => (
                    <div key={h.id} className="flex items-center gap-3 py-2 rounded-xl px-3"
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className={`w-2 h-2 rounded-full shrink-0 ${h.es_critico ? 'bg-red-400' : 'bg-slate-500'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-200 truncate">{h.nombre}</p>
                            <p className="text-[10px] text-slate-600">{h.fecha_planificada}</p>
                        </div>
                        {h.vencido && <AlertTriangle size={12} className="text-red-400 shrink-0" />}
                        {h.es_critico && <span className="text-[9px] text-red-400 font-bold shrink-0">CRÍTICO</span>}
                    </div>
                ))}
            </div>
        )}
    </GlassCard>
);

/* ══════════════════════════════════════════════════
   Seguimiento técnico — card individual de unidad
═══════════════════════════════════════════════════ */
const UnidadCard = ({ unidad, esSocial, pctPlazo, onReporteTecnico }) => {
    const [abierto,    setAbierto]    = useState(false);
    const [timeline,   setTimeline]   = useState(null);
    const [loadingTL,  setLoadingTL]  = useState(false);
    const [verTimeline, setVerTimeline] = useState(false);
    const meta = esSocial ? VIV_ESTADO_META : FASE_ESTADO_META;
    const estadoInfo = meta[unidad.estado] ?? { label: unidad.estado, color: '#94a3b8' };
    const pct = parseFloat(unidad.porcentaje_avance ?? unidad.avance_porcentaje ?? 0);
    const color = pct >= 80 ? '#34d399' : pct >= 40 ? '#60a5fa' : '#fbbf24';
    const tipo  = esSocial ? 'vivienda' : 'fase';

    const cargarTimeline = async () => {
        if (timeline !== null || loadingTL) return;
        setLoadingTL(true);
        try {
            const data = await reporteTecnicoService.listarPorUnidad(tipo, unidad.id, 10);
            setTimeline(data.data ?? []);
        } catch { toast.error('Error al cargar reportes'); setTimeline([]); }
        finally { setLoadingTL(false); }
    };

    const toggleTimeline = () => {
        setVerTimeline(v => !v);
        if (!verTimeline) cargarTimeline();
    };

    const INC_COLOR = { baja: '#34d399', media: '#fbbf24', alta: '#f97316', critica: '#f87171' };

    return (
        <GlassCard className="overflow-hidden">
            {/* Header clickable */}
            <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                onClick={() => setAbierto(a => !a)}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: estadoInfo.color + '1a', border: `1px solid ${estadoInfo.color}33` }}>
                    {esSocial
                        ? <Building size={14} style={{ color: estadoInfo.color }} />
                        : <Layers  size={14} style={{ color: estadoInfo.color }} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-200 truncate">
                            {esSocial && unidad.beneficiario ? unidad.beneficiario : unidad.nombre}
                        </span>
                        <EstadoPill estado={unidad.estado} meta={meta} />
                        <SaludChip avanceReal={pct} pctPlazo={pctPlazo} />
                    </div>
                    {esSocial && unidad.beneficiario && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{unidad.nombre}</p>
                    )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden sm:flex items-center gap-2 min-w-[100px]">
                        <ProgressBar pct={pct} color={color} height="5px" />
                        <span className="text-[11px] font-bold w-9 text-right" style={{ color }}>{pct.toFixed(0)}%</span>
                    </div>
                    <div className="text-[10px] text-slate-600 hidden md:block">
                        {unidad.checklist_completados}/{unidad.checklist_total} items
                    </div>
                    <ChevronDown size={14} className="text-slate-500 transition-transform"
                        style={{ transform: abierto ? 'rotate(180deg)' : 'none' }} />
                </div>
            </button>

            {/* Contenido expandido */}
            {abierto && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Avance mobile */}
                    <div className="sm:hidden flex items-center gap-2 mt-3 mb-3">
                        <ProgressBar pct={pct} color={color} height="6px" />
                        <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
                    </div>

                    {/* Checklist con items reales desde presupuesto_items_proyecto (vivienda) o items_checklist (fase) */}
                    {esSocial ? (
                        <div className="mt-3">
                            <ChecklistVivienda
                                viviendaId={unidad.id}
                                viviendaCodigo={unidad.nombre ?? unidad.codigo}
                            />
                        </div>
                    ) : (
                        unidad.items_checklist?.length > 0 ? (
                            <div className="mt-3 space-y-1.5">
                                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Checklist</p>
                                {unidad.items_checklist.map(item => {
                                    const iPct = parseFloat(item.porcentaje_avance ?? 0);
                                    const ic = iPct >= 100 ? '#34d399' : iPct > 0 ? '#60a5fa' : '#64748b';
                                    return (
                                        <div key={item.id} className="flex items-center gap-2.5 py-1.5 px-3 rounded-lg"
                                            style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${item.estado === 'completado' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                                                {item.estado === 'completado' && <Check size={9} className="text-white" />}
                                            </div>
                                            <span className={`text-xs flex-1 min-w-0 truncate ${item.estado === 'completado' ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                                                {item.nombre}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <div className="w-16 h-1.5 rounded-full overflow-hidden"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, iPct)}%`, background: ic }} />
                                                </div>
                                                <span className="text-[10px] font-bold w-7 text-right" style={{ color: ic }}>
                                                    {iPct.toFixed(0)}%
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-600 shrink-0">p:{item.ponderacion}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-600 mt-3">Sin ítems de checklist</p>
                        )
                    )}

                    {/* Acciones — solo se muestran para fases (no-social); en viviendas sociales
                        el ChecklistVivienda tiene su propio registro e historial por ítem */}
                    {!esSocial && (
                        <div className="flex flex-wrap gap-2 mt-4">
                            <button onClick={() => onReporteTecnico(unidad, tipo)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }}>
                                <ClipboardList size={12} /> Nuevo reporte
                            </button>
                            <button onClick={toggleTimeline}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                                style={{ background: verTimeline ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.05)', border: `1px solid ${verTimeline ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.08)'}`, color: verTimeline ? '#a78bfa' : '#94a3b8' }}>
                                {loadingTL ? <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" /> : <History size={12} />}
                                {verTimeline ? 'Ocultar' : 'Ver reportes'}
                            </button>
                        </div>
                    )}

                    {/* Exportaciones PDF — solo para viviendas sociales */}
                    {esSocial && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <BotonExportar
                                url={`/viviendas/${unidad.id}/reportes-avance/exportar-fotografico`}
                                formatos={[{ tipo: 'pdf', label: 'Fotos PDF' }]}
                                label="Fotos PDF"
                                className="!bg-white/[0.05] !border-white/[0.08] !text-slate-400 !px-3 !py-1.5 !rounded-lg !text-xs hover:!text-white"
                            />
                            <BotonExportar
                                url={`/viviendas/${unidad.id}/reportes-avance/exportar-concluidos`}
                                formatos={[{ tipo: 'pdf', label: 'Concluidos PDF' }]}
                                label="Concluidos PDF"
                                className="!bg-white/[0.05] !border-white/[0.08] !text-emerald-400 !px-3 !py-1.5 !rounded-lg !text-xs hover:!text-white"
                            />
                        </div>
                    )}

                    {/* Timeline de reportes técnicos (solo fases no-sociales) */}
                    {!esSocial && verTimeline && (
                        <div className="mt-4 space-y-2">
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Historial de reportes</p>
                            {loadingTL && (
                                <div className="flex items-center gap-2 py-4 justify-center">
                                    <span className="w-4 h-4 border-2 border-slate-700 border-t-blue-400 rounded-full animate-spin" />
                                    <span className="text-xs text-slate-500">Cargando...</span>
                                </div>
                            )}
                            {!loadingTL && timeline?.length === 0 && (
                                <p className="text-xs text-slate-600 text-center py-3">Sin reportes aún</p>
                            )}
                            {!loadingTL && timeline?.map(rep => (
                                <div key={rep.id} className="rounded-xl p-3"
                                    style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[11px] font-semibold text-slate-300">
                                                {rep.fecha_reporte ? new Date(rep.fecha_reporte).toLocaleDateString('es-BO') : '—'}
                                            </span>
                                            <span className="text-[10px] text-slate-500">
                                                {rep.usuario?.nombre} {rep.usuario?.apellido_paterno}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {rep.alerta_distancia && (
                                                <AlertTriangle size={11} className="text-amber-400" title="Fuera de rango GPS" />
                                            )}
                                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${rep.estado === 'aprobado' ? 'text-emerald-400' : 'text-blue-400'}`}
                                                style={{ background: rep.estado === 'aprobado' ? 'rgba(52,211,153,0.1)' : 'rgba(96,165,250,0.1)' }}>
                                                {rep.estado}
                                            </span>
                                        </div>
                                    </div>
                                    {rep.descripcion && (
                                        <p className="text-[10px] text-slate-400 line-clamp-2">{rep.descripcion}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-1.5">
                                        {rep.fotos?.length > 0 && (
                                            <span className="text-[10px] text-slate-600">
                                                {rep.fotos.length} foto(s)
                                            </span>
                                        )}
                                        {rep.incidencias?.length > 0 && (
                                            <div className="flex gap-1 flex-wrap">
                                                {rep.incidencias.map((inc, ii) => (
                                                    <span key={ii} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                                        style={{ background: INC_COLOR[inc.gravedad] + '15', color: INC_COLOR[inc.gravedad] }}>
                                                        {inc.tipo}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Galería fotográfica del proyecto (nuevo sistema)
═══════════════════════════════════════════════════ */
const GaleriaModal = ({ proyectoId, onCerrar }) => {
    const [grupos,    setGrupos]    = useState([]);
    const [cargando,  setCargando]  = useState(true);
    const [desde,     setDesde]     = useState('');
    const [hasta,     setHasta]     = useState('');
    const [lightbox,  setLightbox]  = useState(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const res = await api.get(`/proyectos/${proyectoId}/reportes-avance/galeria`, { params });
            setGrupos(res.data.data ?? []);
        } catch { toast.error('Error al cargar la galería'); }
        finally { setCargando(false); }
    }, [proyectoId, desde, hasta]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') lightbox ? setLightbox(null) : onCerrar(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [lightbox, onCerrar]);

    const modal = (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-5"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)' }}
            onClick={onCerrar}>
            <div className="w-full max-w-5xl flex flex-col rounded-2xl overflow-hidden"
                style={{
                    maxHeight: 'min(92vh, 820px)',
                    background: 'rgba(8,15,32,0.98)',
                    border: '1px solid rgba(167,139,250,0.18)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(167,139,250,0.08)',
                }}
                onClick={e => e.stopPropagation()}>

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="shrink-0 flex items-center justify-between px-5 py-4"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{
                                background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(139,92,246,0.12))',
                                border: '1px solid rgba(167,139,250,0.3)',
                            }}>
                            <Eye size={17} style={{ color: '#a78bfa' }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Galería Fotográfica</h3>
                            <p className="text-[10px]" style={{ color: '#64748b' }}>
                                {cargando ? 'Cargando…' : `${grupos.length} foto${grupos.length !== 1 ? 's' : ''} de avance`}
                            </p>
                        </div>
                    </div>
                    <button onClick={onCerrar}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-110 hover:rotate-90"
                        style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}>
                        <X size={15} />
                    </button>
                </div>

                {/* ── Filtros de fecha ────────────────────────────────── */}
                <div className="shrink-0 flex items-center gap-2 px-5 py-3 flex-wrap"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Calendar size={13} style={{ color: '#a78bfa' }} />
                    <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Desde</span>
                    <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors focus:border-violet-400"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', colorScheme: 'dark' }} />
                    <span className="text-[11px]" style={{ color: '#334155' }}>—</span>
                    <span className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>Hasta</span>
                    <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                        className="px-2.5 py-1.5 rounded-lg text-xs outline-none transition-colors focus:border-violet-400"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', colorScheme: 'dark' }} />
                    {(desde || hasta) && (
                        <button onClick={() => { setDesde(''); setHasta(''); }}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all hover:scale-105"
                            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                            <X size={9} /> Limpiar
                        </button>
                    )}
                </div>

                {/* ── Grid de fotos ───────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(167,139,250,0.3) transparent' }}>
                    {cargando ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: '#a78bfa', borderTopColor: 'transparent' }} />
                            <p className="text-xs" style={{ color: '#475569' }}>Cargando evidencias fotográficas…</p>
                        </div>
                    ) : grupos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <ImageIcon size={26} style={{ color: '#334155' }} />
                            </div>
                            <p className="text-sm font-semibold" style={{ color: '#475569' }}>Sin fotos en este período</p>
                            <p className="text-xs text-center max-w-xs" style={{ color: '#334155' }}>
                                Registra avances fotográficos desde el checklist de cada vivienda
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {grupos.map((g, idx) => {
                                const thumbUrl = getImgUrl(g.foto_thumb_url ?? g.foto_url);
                                const fullUrl  = getImgUrl(g.foto_url);
                                const completado = g.items?.every(i => i.porcentaje >= 100);
                                return (
                                    <div key={idx}
                                        className="group relative rounded-2xl overflow-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                                        style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            border: completado
                                                ? '1px solid rgba(52,211,153,0.35)'
                                                : '1px solid rgba(255,255,255,0.07)',
                                            boxShadow: completado ? '0 0 12px rgba(52,211,153,0.12)' : 'none',
                                        }}
                                        onClick={() => setLightbox({ url: fullUrl, grupo: g })}>

                                        {/* Foto */}
                                        {thumbUrl ? (
                                            <img src={thumbUrl} alt=""
                                                className="w-full aspect-square object-cover"
                                                loading="lazy" />
                                        ) : (
                                            <div className="w-full aspect-square flex items-center justify-center"
                                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                <ImageIcon size={24} style={{ color: '#334155' }} />
                                            </div>
                                        )}

                                        {/* Badge completado */}
                                        {completado && (
                                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                                                style={{ background: 'rgba(52,211,153,0.85)', color: 'white' }}>
                                                <CheckCircle2 size={10} /> 100%
                                            </div>
                                        )}

                                        {/* Overlay hover */}
                                        <div className="absolute inset-0 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 50%, rgba(0,0,0,0.2) 100%)' }}>
                                            <div className="p-2.5 space-y-1.5">
                                                {/* Beneficiario + vivienda */}
                                                {(g.beneficiario || g.vivienda_codigo) && (
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold"
                                                            style={{ background: 'rgba(167,139,250,0.3)', color: '#c4b5fd' }}>
                                                            {(g.beneficiario ?? g.vivienda_codigo ?? 'V')[0].toUpperCase()}
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-white truncate">
                                                            {g.beneficiario ?? g.vivienda_codigo}
                                                        </span>
                                                        {g.vivienda_codigo && (
                                                            <span className="text-[9px] shrink-0 font-mono px-1.5 py-0.5 rounded"
                                                                style={{ background: 'rgba(167,139,250,0.2)', color: '#c4b5fd' }}>
                                                                {g.vivienda_codigo}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Ítems */}
                                                {g.items?.slice(0, 2).map((it, i) => (
                                                    <div key={i} className="flex items-center justify-between gap-1">
                                                        <span className="text-[9px] text-slate-300 truncate flex-1">
                                                            {it.codigo ? `${it.codigo} — ` : ''}{it.nombre}
                                                        </span>
                                                        <span className="text-[10px] font-bold shrink-0"
                                                            style={{ color: it.porcentaje >= 100 ? '#34d399' : it.porcentaje > 0 ? '#60a5fa' : '#94a3b8' }}>
                                                            {it.porcentaje}%
                                                        </span>
                                                    </div>
                                                ))}
                                                {g.items?.length > 2 && (
                                                    <p className="text-[9px]" style={{ color: '#475569' }}>+{g.items.length - 2} ítem(s) más</p>
                                                )}
                                                {/* Fecha + ampliar */}
                                                <div className="flex items-center justify-between pt-0.5">
                                                    <span className="text-[9px]" style={{ color: '#475569' }}>
                                                        {g.fecha ? new Date(g.fecha).toLocaleDateString('es-BO') : '—'}
                                                    </span>
                                                    <div className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: '#a78bfa' }}>
                                                        <ZoomIn size={11} /> Ampliar
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Lightbox ──────────────────────────────────────────── */}
            {lightbox && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(14px)' }}
                    onClick={() => setLightbox(null)}>
                    <div className="flex flex-col items-center gap-4 max-w-3xl w-full" onClick={e => e.stopPropagation()}>
                        <img src={lightbox.url} alt=""
                            className="max-h-[72vh] max-w-full rounded-2xl object-contain"
                            style={{ boxShadow: '0 40px 100px rgba(0,0,0,0.8)' }} />
                        {/* Info debajo */}
                        <div className="flex flex-wrap items-center justify-center gap-3">
                            {lightbox.grupo.beneficiario && (
                                <span className="text-xs font-semibold text-white px-3 py-1.5 rounded-xl"
                                    style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)' }}>
                                    {lightbox.grupo.beneficiario}
                                </span>
                            )}
                            {lightbox.grupo.vivienda_codigo && (
                                <span className="text-xs font-mono text-white px-3 py-1.5 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    {lightbox.grupo.vivienda_codigo}
                                </span>
                            )}
                            {lightbox.grupo.fecha && (
                                <span className="text-xs text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Calendar size={11} />
                                    {new Date(lightbox.grupo.fecha).toLocaleDateString('es-BO', { dateStyle: 'long' })}
                                </span>
                            )}
                            {lightbox.grupo.tecnico && (
                                <span className="text-xs text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <User size={11} />
                                    {lightbox.grupo.tecnico}
                                </span>
                            )}
                        </div>
                        {lightbox.grupo.items?.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {lightbox.grupo.items.map((it, i) => (
                                    <span key={i} className="text-[11px] px-3 py-1 rounded-xl font-semibold"
                                        style={{
                                            background: it.porcentaje >= 100 ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.06)',
                                            border: `1px solid ${it.porcentaje >= 100 ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                            color: it.porcentaje >= 100 ? '#34d399' : '#94a3b8',
                                        }}>
                                        {it.nombre} — {it.porcentaje}%
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={() => setLightbox(null)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', backdropFilter: 'blur(4px)' }}>
                        <X size={17} />
                    </button>
                </div>
            )}
        </div>
    );
    return createPortal(modal, document.body);
};

/* ══════════════════════════════════════════════════
   Sección de seguimiento técnico
═══════════════════════════════════════════════════ */
const SeguimientoSection = ({ avancePorUnidad, esSocial, proyectoId, pctPlazo }) => {
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [modalReporte, setModalReporte] = useState(null);
    const [modalTipo,    setModalTipo]    = useState('vivienda');
    const [galeriaOpen,  setGaleriaOpen]  = useState(false);
    const metaMap = esSocial ? VIV_ESTADO_META : FASE_ESTADO_META;

    const filtrados = avancePorUnidad.filter(u =>
        filtroEstado === 'todos' || u.estado === filtroEstado
    );

    const handleReporteTecnico = (unidad, tipo) => {
        setModalTipo(tipo);
        setModalReporte(unidad);
    };

    const filtrosPills = [
        { key: 'todos', label: 'Todos', color: '#a78bfa', count: avancePorUnidad.length },
        ...Object.entries(metaMap)
            .map(([k, v]) => ({ key: k, label: v.label, color: v.color, count: avancePorUnidad.filter(u => u.estado === k).length }))
            .filter(f => f.count > 0),
    ];

    return (
        <div>
            {/* ── Encabezado ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            {esSocial ? <Building size={14} className="text-emerald-400" /> : <Layers size={14} className="text-emerald-400" />}
                        </div>
                        <h2 className="text-sm font-bold text-slate-200">
                            {esSocial ? 'Seguimiento de Viviendas' : 'Seguimiento de Fases'}
                        </h2>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}>
                            {avancePorUnidad.length}
                        </span>
                    </div>
                    <button
                        onClick={() => setGaleriaOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:scale-105 active:scale-95 shrink-0"
                        style={{
                            background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.12))',
                            border: '1px solid rgba(167,139,250,0.3)',
                            color: '#a78bfa',
                            boxShadow: '0 2px 10px rgba(167,139,250,0.18)',
                        }}>
                        <Eye size={13} />
                        <span className="hidden sm:inline">Galería fotográfica</span>
                        <span className="sm:hidden">Galería</span>
                    </button>
                </div>

                {/* ── Pills de filtro ───────────────────────────────────── */}
                {filtrosPills.length > 2 && (
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                        {filtrosPills.map(f => {
                            const active = filtroEstado === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFiltroEstado(f.key)}
                                    className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all"
                                    style={active ? {
                                        background: `${f.color}20`,
                                        border: `1px solid ${f.color}55`,
                                        color: f.color,
                                        boxShadow: `0 2px 8px ${f.color}25`,
                                    } : {
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#64748b',
                                    }}>
                                    {f.label}
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                        style={{
                                            background: active ? `${f.color}30` : 'rgba(255,255,255,0.06)',
                                            color: active ? f.color : '#475569',
                                        }}>
                                        {f.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {avancePorUnidad.length === 0 ? (
                <GlassCard className="py-12 flex flex-col items-center gap-3">
                    {esSocial ? <Building size={32} className="text-slate-700" /> : <Layers size={32} className="text-slate-700" />}
                    <p className="text-slate-500 text-sm">Sin {esSocial ? 'viviendas' : 'fases'} registradas</p>
                </GlassCard>
            ) : (
                <div className="space-y-2">
                    {filtrados.map(u => (
                        <UnidadCard key={u.id} unidad={u} esSocial={esSocial}
                            pctPlazo={pctPlazo} onReporteTecnico={handleReporteTecnico} />
                    ))}
                    {filtrados.length === 0 && (
                        <GlassCard className="py-8 text-center">
                            <p className="text-slate-500 text-sm">No hay unidades con ese estado</p>
                        </GlassCard>
                    )}
                </div>
            )}

            {modalReporte && (
                <ReporteTecnicoModal
                    unidad={modalReporte}
                    tipo={modalTipo}
                    proyectoId={proyectoId}
                    onCerrar={() => setModalReporte(null)}
                    onGuardado={() => setModalReporte(null)}
                />
            )}

            {galeriaOpen && (
                <GaleriaModal proyectoId={proyectoId} onCerrar={() => setGaleriaOpen(false)} />
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Sub-fase B2 — Personal Asignado al Proyecto
═══════════════════════════════════════════════════ */
const ROL_PALETTE = ['#a78bfa', '#60a5fa', '#34d399', '#fbbf24', '#f97316', '#f43f5e', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6'];
const rolColor = (id) => ROL_PALETTE[(id ?? 0) % ROL_PALETTE.length];

function AsignarPersonalModal({ proyectoId, onClose, onGuardado }) {
    const [query, setQuery]               = useState('');
    const [resultados, setResultados]     = useState([]);
    const [buscando, setBuscando]         = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [responsable, setResponsable]   = useState(false);
    const [guardando, setGuardando]       = useState(false);
    const timerRef = useRef(null);
    const today = new Date().toISOString().slice(0, 10);
    const todayLabel = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });

    useEffect(() => {
        if (!query.trim() || seleccionado) { setResultados([]); return; }
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            setBuscando(true);
            try { setResultados(await asignacionPersonalService.buscarPersonal(query)); }
            catch { setResultados([]); }
            finally { setBuscando(false); }
        }, 300);
    }, [query, seleccionado]);

    const guardar = async () => {
        if (!seleccionado) { toast.error('Selecciona un empleado'); return; }
        if (!seleccionado.rol_id) { toast.error('Este empleado no tiene rol asignado. Edítalo primero en Gestión de Personal.'); return; }
        setGuardando(true);
        try {
            await asignacionPersonalService.asignar(proyectoId, {
                personal_id: seleccionado.id,
                rol_id: seleccionado.rol_id,
                es_responsable_principal: responsable,
                fecha_inicio: today,
            });
            toast.success(`${seleccionado.nombre} asignado al proyecto`);
            onGuardado();
        } catch (e) {
            toast.error(e.response?.data?.message || e.response?.data?.errors?.personal_id?.[0] || 'Error al asignar');
        } finally { setGuardando(false); }
    };

    const ini = (p) => `${p.nombre?.[0] || ''}${p.apellido_paterno?.[0] || ''}`.toUpperCase();
    const canAssign = seleccionado?.rol_id;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full max-w-2xl rounded-2xl flex flex-col max-h-[90vh]"
                style={{ background: 'rgba(8,15,35,0.98)', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 40px 80px rgba(0,0,0,0.75)' }}>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.07]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}>
                            <UserCheck size={18} className="text-blue-400" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Asignar Personal al Proyecto</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Inicio automático: <span className="text-slate-400">{todayLabel}</span>
                                {seleccionado?.rol?.nombre_visible && (
                                    <> · <span className="text-violet-400">{seleccionado.rol.nombre_visible}</span></>
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/8 transition-colors">
                        <X size={16} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">
                    {/* Búsqueda */}
                    <div className="px-6 pt-5 pb-4">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                            Buscar empleado activo
                        </label>
                        <div className="relative">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            <input
                                value={query}
                                onChange={e => { setQuery(e.target.value); setSeleccionado(null); setResponsable(false); }}
                                placeholder="Nombre, apellido o CI…"
                                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all text-slate-200 placeholder-slate-600"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Resultados en cards */}
                    {!seleccionado && (resultados.length > 0 || buscando) && (
                        <div className="px-6 pb-4">
                            {buscando ? (
                                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                                    <Loader2 className="animate-spin w-5 h-5" />
                                    <span className="text-sm">Buscando personal…</span>
                                </div>
                            ) : (
                                <>
                                    <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mb-3">
                                        {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                                        {resultados.map(p => (
                                            <button key={p.id} onClick={() => setSeleccionado(p)}
                                                className="w-full text-left rounded-2xl p-4 transition-all duration-150 group"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.14)'; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.border = '1px solid rgba(255,255,255,0.07)'; }}>
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                                                        style={{ background: 'rgba(148,163,184,0.12)', color: '#94a3b8' }}>
                                                        {ini(p)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-sm text-slate-200 group-hover:text-white transition-colors">
                                                            {p.nombre} {p.apellido_paterno}
                                                        </p>
                                                        <p className="text-xs text-slate-600 mt-0.5">CI: {p.ci}</p>
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {p.rol?.nombre_visible ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                                                    style={{ background: 'rgba(167,139,250,0.15)', color: '#c4b5fd' }}>
                                                                    {p.rol.nombre_visible}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full"
                                                                    style={{ background: 'rgba(248,113,113,0.12)', color: '#fca5a5' }}>
                                                                    Sin rol
                                                                </span>
                                                            )}
                                                            {p.usuario_id ? (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                                                                    style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd' }}>
                                                                    <Bell size={8} /> Sistema
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] px-2 py-0.5 rounded-full"
                                                                    style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b' }}>
                                                                    Solo registro
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Sin resultados */}
                    {!seleccionado && query.trim().length >= 2 && !buscando && resultados.length === 0 && (
                        <div className="px-6 pb-6 text-center py-10">
                            <Users size={32} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-sm text-slate-500">Sin resultados para "{query}"</p>
                            <p className="text-xs text-slate-600 mt-1">Verifica el nombre o CI del empleado</p>
                        </div>
                    )}

                    {/* Empty state */}
                    {!query && !seleccionado && (
                        <div className="px-6 pb-8 text-center pt-2">
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <Users size={32} className="text-slate-700" />
                            </div>
                            <p className="text-sm text-slate-500">Escribe el nombre o CI del empleado</p>
                            <p className="text-xs text-slate-600 mt-1">El rol y la fecha se asignan automáticamente desde el perfil</p>
                        </div>
                    )}

                    {/* ── Empleado seleccionado ── */}
                    {seleccionado && (
                        <div className="px-6 pb-6">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Empleado seleccionado
                            </p>
                            <div className="rounded-2xl p-5"
                                style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.22)' }}>
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold shrink-0"
                                        style={{ background: 'rgba(52,211,153,0.14)', color: '#6ee7b7' }}>
                                        {ini(seleccionado)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-white text-[15px]">
                                            {seleccionado.nombre} {seleccionado.apellido_paterno} {seleccionado.apellido_materno || ''}
                                        </p>
                                        <p className="text-sm text-slate-400 mt-0.5">CI: {seleccionado.ci}</p>
                                        {seleccionado.especialidad && (
                                            <p className="text-xs text-slate-500 mt-0.5">{seleccionado.especialidad}</p>
                                        )}
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {seleccionado.rol?.nombre_visible ? (
                                                <span className="text-xs px-3 py-1 rounded-full font-medium"
                                                    style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.25)', color: '#c4b5fd' }}>
                                                    {seleccionado.rol.nombre_visible}
                                                </span>
                                            ) : (
                                                <span className="text-xs px-3 py-1 rounded-full font-medium"
                                                    style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.22)', color: '#fca5a5' }}>
                                                    ⚠ Sin rol — edita en Gestión de Personal
                                                </span>
                                            )}
                                            {seleccionado.usuario_id ? (
                                                <span className="text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5"
                                                    style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.22)', color: '#93c5fd' }}>
                                                    <Bell size={11} /> Recibirá notificación
                                                </span>
                                            ) : (
                                                <span className="text-xs px-3 py-1 rounded-full"
                                                    style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(100,116,139,0.2)', color: '#64748b' }}>
                                                    Solo registro
                                                </span>
                                            )}
                                        </div>
                                        <label className="flex items-center gap-2.5 mt-4 cursor-pointer group w-fit">
                                            <div className="relative flex items-center justify-center w-5 h-5 rounded border transition-all shrink-0"
                                                style={{ background: responsable ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)', borderColor: responsable ? 'rgba(52,211,153,0.5)' : 'rgba(255,255,255,0.15)' }}>
                                                <input type="checkbox" className="absolute opacity-0 cursor-pointer w-full h-full" checked={responsable} onChange={e => setResponsable(e.target.checked)} />
                                                {responsable && <Check size={11} className="text-emerald-400" />}
                                            </div>
                                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors select-none">
                                                Es responsable principal del proyecto
                                            </span>
                                        </label>
                                    </div>
                                    <button onClick={() => { setSeleccionado(null); setQuery(''); setResponsable(false); }}
                                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors shrink-0 mt-1">
                                        <X size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex gap-3 px-6 py-5 border-t border-white/[0.07]">
                    <button onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        Cancelar
                    </button>
                    <SpinBtn
                        loading={guardando}
                        onClick={guardar}
                        disabled={!canAssign}
                        className="flex-1 justify-center"
                        style={{
                            background: canAssign ? 'rgba(96,165,250,0.18)' : 'rgba(100,116,139,0.1)',
                            border: `1px solid ${canAssign ? 'rgba(96,165,250,0.35)' : 'rgba(100,116,139,0.18)'}`,
                        }}>
                        <UserCheck size={15} /> Asignar al proyecto
                    </SpinBtn>
                </div>
            </div>
        </div>
    );
}

function PersonalAsignadoSection({ proyectoId, canEdit }) {
    const [asignaciones, setAsignaciones] = useState(null);
    const [modalAsignar, setModalAsignar] = useState(false);
    const [finalizando, setFinalizando] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const res = await asignacionPersonalService.listarPorProyecto(proyectoId);
            setAsignaciones(res.data ?? res);
        } catch { setAsignaciones([]); }
    }, [proyectoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleFinalizar = async (asignacion) => {
        setFinalizando(asignacion.id);
        try {
            await asignacionPersonalService.finalizar(asignacion.id);
            toast.success('Asignación finalizada');
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
        finally { setFinalizando(null); }
    };

    const handleEliminar = async (asignacion) => {
        if (!window.confirm(`¿Eliminar la asignación de ${asignacion.personal?.nombre}?`)) return;
        try {
            await asignacionPersonalService.eliminar(asignacion.id);
            toast.success('Asignación eliminada');
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    const asignacionesList = Array.isArray(asignaciones) ? asignaciones : [];
    const activas    = asignacionesList.filter(a => a.estado === 'activa');
    const finalizadas = asignacionesList.filter(a => a.estado !== 'activa');

    return (
        <>
            <GlassCard className="p-5">
                <SectionTitle
                    icon={UserCheck}
                    title="Personal Asignado"
                    action={canEdit && (
                        <button onClick={() => setModalAsignar(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                            style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)' }}>
                            <Plus size={12} /> Asignar
                        </button>
                    )}
                />

                {asignaciones === null ? (
                    <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
                ) : activas.length === 0 && finalizadas.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-2">
                        <User size={32} className="text-slate-600" />
                        <p className="text-slate-500 text-sm">Sin personal asignado</p>
                        {canEdit && (
                            <button onClick={() => setModalAsignar(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-blue-400 hover:text-blue-300 mt-1 transition-colors">
                                <Plus size={12} /> Asignar primer empleado
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {activas.map(a => {
                            const color = rolColor(a.rol_id);
                            const rolLabel = a.rol?.nombre_visible || `Rol #${a.rol_id}`;
                            const rolSistema = a.personal?.usuario?.rol?.nombre_visible;
                            return (
                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl group"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white"
                                        style={{ background: color + '20', border: `1px solid ${color}30` }}>
                                        {a.personal?.nombre?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-medium text-white truncate">
                                                {a.personal?.nombre} {a.personal?.apellido_paterno}
                                            </span>
                                            {a.es_responsable_principal && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide"
                                                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                                                    Principal
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                                                style={{ background: color + '15', color }}>
                                                {rolLabel}
                                            </span>
                                            {rolSistema && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                                    {rolSistema}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-slate-500">desde {a.fecha_inicio}</span>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleFinalizar(a)} disabled={finalizando === a.id}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 transition-all"
                                                title="Finalizar asignación">
                                                {finalizando === a.id
                                                    ? <span className="w-3.5 h-3.5 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin block" />
                                                    : <Check size={13} />}
                                            </button>
                                            <button onClick={() => handleEliminar(a)}
                                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                                                title="Eliminar asignación">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {finalizadas.length > 0 && (
                            <details className="mt-1">
                                <summary className="text-[11px] text-slate-500 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-1 py-1">
                                    <ChevronRight size={12} className="transition-transform" style={{ transform: 'none' }} />
                                    {finalizadas.length} asignación{finalizadas.length !== 1 ? 'es' : ''} finalizada{finalizadas.length !== 1 ? 's' : ''}
                                </summary>
                                <div className="space-y-1.5 mt-1.5">
                                    {finalizadas.map(a => {
                                        const rolLabelFin = a.rol?.nombre_visible || `Rol #${a.rol_id}`;
                                        return (
                                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50"
                                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-400"
                                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    {a.personal?.nombre?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-400">{a.personal?.nombre} {a.personal?.apellido_paterno}</p>
                                                    <p className="text-[10px] text-slate-600">{rolLabelFin} · Finalizado {a.fecha_fin || ''}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </details>
                        )}
                    </div>
                )}
            </GlassCard>

            {modalAsignar && (
                <AsignarPersonalModal
                    proyectoId={proyectoId}
                    onClose={() => setModalAsignar(false)}
                    onGuardado={() => { setModalAsignar(false); cargar(); }}
                />
            )}
        </>
    );
}

/* ══════════════════════════════════════════════════
   Placeholder sections (futuras sub-fases)
═══════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════
   Modificatorios
═══════════════════════════════════════════════════ */
const MOD_ESTADO_META = {
    borrador:              { label: 'Borrador',            color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
    pendiente_aprobacion:  { label: 'Pendiente',           color: '#fbbf24', bg: 'rgba(251,191,36,0.1)'  },
    aprobado:              { label: 'Aprobado',            color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
    rechazado:             { label: 'Rechazado',           color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    aplicado:              { label: 'Aplicado',            color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
};

function ModalModificatorioMonto({ proyectoId, onGuardado, onCerrar }) {
    const [step, setStep] = useState(0); // 0=motivo, 1=items, 2=validacion, 3=justificativo
    const [form, setForm] = useState({ motivo: '', justificacion: '', subtipo: 'redistribucion' });
    const [items, setItems] = useState([{ nombre: '', unidad: '', cantidad_original: 0, precio_unitario: 0, cantidad_nueva: 0 }]);
    const [justificativo, setJustificativo] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [generando, setGenerando] = useState(false);

    const calcItem = (it) => {
        const mo = (parseFloat(it.cantidad_original) || 0) * (parseFloat(it.precio_unitario) || 0);
        const mn = (parseFloat(it.cantidad_nueva) || 0) * (parseFloat(it.precio_unitario) || 0);
        return { ...it, monto_original: mo, monto_nuevo: mn, delta: mn - mo };
    };
    const itemsCalc = useMemo(() => items.map(calcItem), [items]);
    const deltaTotal = useMemo(() => itemsCalc.reduce((s, i) => s + i.delta, 0), [itemsCalc]);
    const sumaZero = Math.abs(deltaTotal) < 0.01;

    const steps = ['Motivo', 'Ítems', 'Validación', 'Justificativo'];

    const handleSave = async () => {
        setSaving(true);
        try {
            const datos = {
                ...form,
                justificativo_legal: justificativo,
                items: itemsCalc.map(({ nombre, unidad, cantidad_original, precio_unitario, cantidad_nueva }) => ({
                    nombre, unidad, cantidad_original: parseFloat(cantidad_original), precio_unitario: parseFloat(precio_unitario), cantidad_nueva: parseFloat(cantidad_nueva),
                })),
            };
            await modificatorioService.crearMonto(proyectoId, datos);
            toast.success('Modificatorio creado');
            onGuardado();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error al crear modificatorio');
        } finally { setSaving(false); }
    };

    const handleGenerarJustificativo = () => {
        const texto = `MODIFICATORIO DE REDISTRIBUCIÓN DE MONTOS\n\nEn virtud de lo establecido en el contrato de obra N° [CONTRATO], las partes acuerdan la redistribución de ítems presupuestarios del proyecto, manteniendo invariable el monto total del contrato. La presente redistribución se justifica en razón de: ${form.justificacion}\n\nFirmado en conformidad por ambas partes.`;
        setJustificativo(texto);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-full max-w-3xl rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <h2 className="text-base font-bold text-white">Modificatorio de Montos</h2>
                        <p className="text-xs text-slate-500">Redistribución suma cero del contrato</p>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                {/* Steps */}
                <div className="flex items-center gap-0 px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    {steps.map((s, i) => (
                        <React.Fragment key={i}>
                            <div className={`flex items-center gap-1.5 text-xs font-semibold ${i === step ? 'text-emerald-400' : i < step ? 'text-slate-400' : 'text-slate-600'}`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${i === step ? 'bg-emerald-500 text-black' : i < step ? 'bg-slate-700 text-slate-300' : 'bg-slate-800 text-slate-600'}`}>{i < step ? '✓' : i + 1}</span>
                                {s}
                            </div>
                            {i < steps.length - 1 && <div className="flex-1 h-px mx-2" style={{ background: 'rgba(255,255,255,0.07)' }} />}
                        </React.Fragment>
                    ))}
                </div>
                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                    {step === 0 && (
                        <>
                            <GF label="Motivo" required error={errors.motivo}>
                                <input value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} className={gI(!!errors.motivo)} placeholder="Motivo del modificatorio..." />
                            </GF>
                            <GF label="Justificación técnica" required>
                                <textarea value={form.justificacion} onChange={e => setForm(p => ({ ...p, justificacion: e.target.value }))} rows={4} className={gI()} placeholder="Describir la razón técnica..." />
                            </GF>
                            <GF label="Subtipo">
                                <select value={form.subtipo} onChange={e => setForm(p => ({ ...p, subtipo: e.target.value }))} className={gI()}>
                                    <option value="redistribucion">Redistribución de ítems</option>
                                    <option value="ampliacion">Ampliación de ítem</option>
                                    <option value="reduccion">Reducción de ítem</option>
                                </select>
                            </GF>
                        </>
                    )}
                    {step === 1 && (
                        <div className="space-y-3">
                            <div className="text-xs text-slate-400">Ingrese los ítems que se modificarán. La suma de deltas debe ser cero.</div>
                            {items.map((it, idx) => (
                                <div key={idx} className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-slate-400">Ítem {idx + 1}</span>
                                        {items.length > 1 && (
                                            <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300 text-xs">× Eliminar</button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input placeholder="Nombre del ítem" value={it.nombre} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, nombre: e.target.value } : x))} className={gI()} />
                                        <input placeholder="Unidad (m², ml, glb...)" value={it.unidad} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, unidad: e.target.value } : x))} className={gI()} />
                                        <input type="number" placeholder="Cantidad original" value={it.cantidad_original} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, cantidad_original: e.target.value } : x))} className={gI()} />
                                        <input type="number" placeholder="Precio unitario (Bs.)" value={it.precio_unitario} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, precio_unitario: e.target.value } : x))} className={gI()} />
                                        <input type="number" placeholder="Cantidad nueva" value={it.cantidad_nueva} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, cantidad_nueva: e.target.value } : x))} className={gI()} />
                                        <div className={`px-3 py-2.5 rounded-xl text-sm font-semibold ${calcItem(it).delta > 0 ? 'text-emerald-400' : calcItem(it).delta < 0 ? 'text-red-400' : 'text-slate-400'}`} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            Delta: {calcItem(it).delta >= 0 ? '+' : ''}{calcItem(it).delta.toFixed(2)} Bs.
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setItems(p => [...p, { nombre: '', unidad: '', cantidad_original: 0, precio_unitario: 0, cantidad_nueva: 0 }])}
                                className="w-full py-2 rounded-xl text-xs text-blue-400 hover:text-blue-300 transition-colors" style={{ border: '1px dashed rgba(96,165,250,0.3)' }}>
                                + Agregar ítem
                            </button>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-xl text-center ${sumaZero ? 'text-emerald-400' : 'text-red-400'}`} style={{ background: sumaZero ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)', border: `1px solid ${sumaZero ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}` }}>
                                <div className="text-2xl font-bold">{deltaTotal >= 0 ? '+' : ''}{deltaTotal.toFixed(2)} Bs.</div>
                                <div className="text-sm mt-1">{sumaZero ? '✓ Suma cero — listo para enviar' : '✗ La suma debe ser exactamente 0.00'}</div>
                            </div>
                            <table className="w-full text-xs">
                                <thead><tr className="text-left text-slate-500">
                                    <th className="pb-1">Ítem</th><th className="pb-1 text-right">Monto Orig.</th><th className="pb-1 text-right">Monto Nuevo</th><th className="pb-1 text-right">Delta</th>
                                </tr></thead>
                                <tbody>{itemsCalc.map((it, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                        <td className="py-1.5 text-slate-300">{it.nombre || `Ítem ${i + 1}`}</td>
                                        <td className="text-right text-slate-400">{it.monto_original.toFixed(2)}</td>
                                        <td className="text-right text-slate-400">{it.monto_nuevo.toFixed(2)}</td>
                                        <td className={`text-right font-semibold ${it.delta > 0 ? 'text-emerald-400' : it.delta < 0 ? 'text-red-400' : 'text-slate-500'}`}>{it.delta >= 0 ? '+' : ''}{it.delta.toFixed(2)}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-400">Texto del justificativo legal (editable)</span>
                                <button onClick={handleGenerarJustificativo} className="text-xs text-blue-400 hover:text-blue-300">
                                    ↻ Auto-generar
                                </button>
                            </div>
                            <textarea value={justificativo} onChange={e => setJustificativo(e.target.value)} rows={10} className={gI()} placeholder="El justificativo legal será generado automáticamente o puede ingresar uno personalizado..." />
                        </div>
                    )}
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={() => step > 0 ? setStep(s => s - 1) : onCerrar()} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">
                        {step > 0 ? '← Anterior' : 'Cancelar'}
                    </button>
                    {step < steps.length - 1 ? (
                        <button onClick={() => {
                            if (step === 0 && !form.motivo.trim()) return setErrors({ motivo: 'Requerido' });
                            if (step === 2 && !sumaZero) return toast.error('La suma de deltas debe ser cero');
                            setErrors({});
                            setStep(s => s + 1);
                        }} className="px-5 py-2 rounded-xl text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 transition-colors">
                            Siguiente →
                        </button>
                    ) : (
                        <SpinBtn loading={saving} onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold text-black bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50">
                            Crear Modificatorio
                        </SpinBtn>
                    )}
                </div>
            </div>
        </div>
    );
}

function ModalAmpliacionPlazo({ proyectoId, proyecto, onGuardado, onCerrar }) {
    const [form, setForm] = useState({ motivo: '', justificacion: '', dias_ampliacion: '', justificativo_legal: '' });
    const [saving, setSaving] = useState(false);

    const diasAmp = parseInt(form.dias_ampliacion) || 0;
    const plazoOriginal = proyecto?.plazo_dias || 0;
    const plazoNuevo = plazoOriginal + diasAmp;
    const fechaFinOriginal = proyecto?.fecha_fin_planificada ? new Date(proyecto.fecha_fin_planificada) : null;
    const fechaFinNueva = fechaFinOriginal ? new Date(fechaFinOriginal.getTime() + diasAmp * 86400000) : null;
    const fmtDate = (d) => d ? d.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

    const handleSave = async () => {
        if (!form.motivo.trim()) return toast.error('Ingrese el motivo');
        if (!diasAmp || diasAmp < 1) return toast.error('Los días de ampliación deben ser mayor a 0');
        setSaving(true);
        try {
            await modificatorioService.crearPlazo(proyectoId, { ...form, dias_ampliacion: diasAmp });
            toast.success('Ampliación de plazo creada');
            onGuardado();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Error');
        } finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div>
                        <h2 className="text-base font-bold text-white">Ampliación de Plazo</h2>
                        <p className="text-xs text-slate-500">Modificatorio de plazo contractual</p>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Resumen visual */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { label: 'Plazo original', val: `${plazoOriginal} días`, sub: `Vence: ${fmtDate(fechaFinOriginal)}`, color: '#94a3b8' },
                            { label: '+ Ampliación', val: diasAmp > 0 ? `+${diasAmp} días` : '—', sub: 'días calendario', color: '#fbbf24' },
                            { label: 'Plazo nuevo', val: diasAmp > 0 ? `${plazoNuevo} días` : '—', sub: fechaFinNueva ? `Vence: ${fmtDate(fechaFinNueva)}` : '—', color: '#34d399' },
                        ].map(({ label, val, sub, color }) => (
                            <div key={label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}20` }}>
                                <div className="text-xs text-slate-500 mb-1">{label}</div>
                                <div className="text-base font-bold" style={{ color }}>{val}</div>
                                <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>
                            </div>
                        ))}
                    </div>
                    <GF label="Días de ampliación" required>
                        <input type="number" min="1" value={form.dias_ampliacion} onChange={e => setForm(p => ({ ...p, dias_ampliacion: e.target.value }))} className={gI()} placeholder="Ej: 30" />
                    </GF>
                    <GF label="Motivo" required>
                        <input value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} className={gI()} placeholder="Motivo de la ampliación..." />
                    </GF>
                    <GF label="Justificación técnica" required>
                        <textarea value={form.justificacion} onChange={e => setForm(p => ({ ...p, justificacion: e.target.value }))} rows={3} className={gI()} placeholder="Causa técnica o de fuerza mayor..." />
                    </GF>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em]">Justificativo legal (opcional)</label>
                            <button onClick={() => {
                                const texto = `MODIFICATORIO DE AMPLIACIÓN DE PLAZO\n\nEn virtud de lo establecido en el contrato de obra N° [CONTRATO], las partes acuerdan ampliar el plazo de ejecución de la obra en ${diasAmp} días calendario. Esta ampliación se justifica en razón de: ${form.justificacion}\n\nFirmado en conformidad por ambas partes.`;
                                setForm(p => ({ ...p, justificativo_legal: texto }));
                            }} className="text-[11px] text-blue-400 hover:text-blue-300">↻ Auto-generar</button>
                        </div>
                        <textarea value={form.justificativo_legal} onChange={e => setForm(p => ({ ...p, justificativo_legal: e.target.value }))} rows={3} className={gI()} placeholder="Texto legal adicional..." />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition-colors">Cancelar</button>
                    <SpinBtn loading={saving} onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50">
                        Crear Ampliación
                    </SpinBtn>
                </div>
            </div>
        </div>
    );
}

function ModificatoriosSection({ proyectoId, proyecto, canEdit }) {
    const [lista, setLista] = useState(null);
    const [modalMonto, setModalMonto] = useState(false);
    const [modalPlazo, setModalPlazo] = useState(false);
    const [menuAbierto, setMenuAbierto] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const data = await modificatorioService.listarPorProyecto(proyectoId);
            setLista(data);
        } catch { setLista([]); }
    }, [proyectoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleAccion = async (accion, id) => {
        try {
            if (accion === 'enviar') await modificatorioService.enviarAprobacion(id);
            else if (accion === 'aprobar') await modificatorioService.aprobar(id);
            else if (accion === 'aplicar') await modificatorioService.aplicar(id);
            toast.success('Acción realizada');
            cargar();
        } catch (e) { toast.error(e.response?.data?.message || 'Error'); }
    };

    return (
        <>
            <GlassCard className="p-5">
                <SectionTitle
                    icon={Wrench}
                    title="Modificatorios Contractuales"
                    action={canEdit && (
                        <div className="relative">
                            <button onClick={() => setMenuAbierto(p => !p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
                                style={{ background: 'rgba(249,115,22,0.2)', border: '1px solid rgba(249,115,22,0.4)' }}>
                                <Plus size={12} /> Nuevo <ChevronDown size={11} />
                            </button>
                            {menuAbierto && (
                                <div className="absolute right-0 top-full mt-1 z-20 rounded-xl overflow-hidden py-1 min-w-[180px]"
                                    style={{ background: '#1a2030', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                    <button onClick={() => { setMenuAbierto(false); setModalMonto(true); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                                        <span className="font-semibold text-orange-400">Modificatorio de Montos</span><br/>
                                        <span className="text-slate-500">Redistribución suma cero</span>
                                    </button>
                                    <button onClick={() => { setMenuAbierto(false); setModalPlazo(true); }} className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
                                        <span className="font-semibold text-amber-400">Ampliación de Plazo</span><br/>
                                        <span className="text-slate-500">Ampliar fecha fin del contrato</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                />

                {lista === null ? (
                    <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
                ) : lista.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-2">
                        <Wrench size={28} className="text-slate-700" />
                        <p className="text-slate-500 text-sm">Sin modificatorios</p>
                        <p className="text-slate-600 text-xs text-center max-w-xs">Los modificatorios contractuales aparecerán aquí cuando se creen</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {lista.map(m => {
                            const meta = MOD_ESTADO_META[m.estado] || MOD_ESTADO_META.borrador;
                            return (
                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: m.tipo === 'plazo' ? 'rgba(251,191,36,0.1)' : 'rgba(249,115,22,0.1)', border: m.tipo === 'plazo' ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(249,115,22,0.2)' }}>
                                        {m.tipo === 'plazo' ? <Calendar size={14} className="text-amber-400" /> : <FileText size={14} className="text-orange-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white truncate">{m.numero}</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate">{m.motivo}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {m.estado === 'borrador' && canEdit && (
                                            <button onClick={() => handleAccion('enviar', m.id)} className="px-2 py-1 rounded text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                                                style={{ background: 'rgba(96,165,250,0.1)' }}>Enviar</button>
                                        )}
                                        {m.estado === 'pendiente_aprobacion' && canEdit && (
                                            <button onClick={() => handleAccion('aprobar', m.id)} className="px-2 py-1 rounded text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                                                style={{ background: 'rgba(52,211,153,0.1)' }}>Aprobar</button>
                                        )}
                                        {m.estado === 'aprobado' && canEdit && (
                                            <button onClick={() => handleAccion('aplicar', m.id)} className="px-2 py-1 rounded text-[10px] font-semibold text-violet-400 hover:text-violet-300 transition-colors"
                                                style={{ background: 'rgba(167,139,250,0.1)' }}>Aplicar</button>
                                        )}
                                        <BotonExportar
                                            url={`/modificatorios/${m.id}/pdf`}
                                            formatos={[{ tipo: 'pdf', label: 'PDF' }]}
                                            label="PDF"
                                            className="text-[10px] px-2 py-1 rounded"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </GlassCard>

            {modalMonto && (
                <ModalModificatorioMonto
                    proyectoId={proyectoId}
                    onGuardado={() => { setModalMonto(false); cargar(); }}
                    onCerrar={() => setModalMonto(false)}
                />
            )}
            {modalPlazo && (
                <ModalAmpliacionPlazo
                    proyectoId={proyectoId}
                    proyecto={proyecto}
                    onGuardado={() => { setModalPlazo(false); cargar(); }}
                    onCerrar={() => setModalPlazo(false)}
                />
            )}
        </>
    );
}

const PlaceholderSection = ({ icon: Icon, color, title, badge, desc, sketch }) => (
    <GlassCard className="p-5">
        <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '1a', border: `1px solid ${color}33` }}>
                <Icon size={16} style={{ color }} />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-white">{title}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: color + '15', border: `1px solid ${color}30`, color }}>
                        {badge}
                    </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
            </div>
        </div>
        {/* micro-sketch del contenido futuro */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: 'rgba(255,255,255,0.02)' }}>
            {sketch.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full shrink-0" style={{ width: `${s.w}%`, background: color + '30' }} />
                    <div className="h-1.5 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.04)' }} />
                </div>
            ))}
        </div>
    </GlassCard>
);

/* ══════════════════════════════════════════════════
   Exportar dropdown
═══════════════════════════════════════════════════ */
const ExportarDropdown = ({ proyectoId }) => (
    <BotonExportar
        url={`/exportar/proyectos/${proyectoId}/avance`}
        formatos={[
            { tipo: 'pdf',   label: 'Avance PDF'   },
            { tipo: 'excel', label: 'Avance Excel' },
        ]}
        label="Exportar"
    />
);

/* ══════════════════════════════════════════════════
   MAIN — Dashboard del Proyecto
═══════════════════════════════════════════════════ */
const DetalleProyecto = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();

    const [dash, setDash] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [modalEstado, setModalEstado] = useState(false);
    const [modalFase, setModalFase] = useState(null);
    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            const data = await proyectoService.dashboard(id);
            setDash(data);
        } catch {
            toast.error('Error al cargar el dashboard del proyecto');
            navigate('/dashboard/proyectos');
        } finally { setCargando(false); }
    }, [id, navigate]);

    useEffect(() => { cargar(); }, [cargar]);

    if (cargando) return (
        <div className="space-y-4 max-w-7xl mx-auto animate-fade-in">
            <Skeleton height="24px" className="rounded-xl w-32" />
            <Skeleton height="180px" className="rounded-2xl" />
            <Skeleton height="220px" className="rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Skeleton height="160px" className="rounded-2xl" />
                <Skeleton height="160px" className="rounded-2xl" />
            </div>
            <Skeleton height="300px" className="rounded-2xl" />
        </div>
    );

    if (!dash) return null;

    const { proyecto, avance, gantt, almacen, beneficiarios_resumen, hitos_proximos, transiciones_permitidas, hitos_cobro = [] } = dash;
    const esSocial  = proyecto.categoria === 'social';
    const estadoM   = ESTADO_META[proyecto.estado] ?? ESTADO_META.formulacion;
    const isEditableState = !['finalizado', 'cancelado', 'pausado'].includes(proyecto.estado);
    const canEdit   = hasPermission('proyectos.editar') && isEditableState;
    const pctAvance = parseFloat(avance.global ?? 0);
    const avanceColor = pctAvance >= 80 ? '#34d399' : pctAvance >= 40 ? '#60a5fa' : '#fbbf24';
    const contraparte = esSocial ? proyecto.entidad_estatal?.nombre : (proyecto.cliente?.nombre_completo ?? proyecto.cliente?.nombre_visible);

    return (
        <div className="animate-fade-in max-w-7xl mx-auto space-y-5 pb-8">
            {/* ── Back ── */}
            <button onClick={() => navigate('/dashboard/proyectos')}
                className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-400 transition-colors">
                <ArrowLeft size={16} /> Proyectos
            </button>

            {/* ══════════════════════════════════════════════════
                HERO + SALUD FINANCIERA — same row
            ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 items-stretch">

                {/* ── Hero card (3 of 5 cols) ── */}
                <div className="xl:col-span-3 rounded-2xl relative overflow-hidden flex flex-col"
                    style={{
                        background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)',
                        border: `1px solid ${estadoM.border}`,
                        boxShadow: `0 0 60px ${estadoM.color}08`,
                    }}>
                    {/* glow orb */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-[0.05] blur-3xl pointer-events-none"
                        style={{ background: estadoM.color }} />

                    {/* Title row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h1 className="text-lg font-bold text-white leading-tight truncate">{proyecto.nombre}</h1>
                            <EstadoPill estado={proyecto.estado} />
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                style={{ background: esSocial ? 'rgba(34,211,238,0.1)' : 'rgba(167,139,250,0.1)', border: `1px solid ${esSocial ? 'rgba(34,211,238,0.2)' : 'rgba(167,139,250,0.2)'}`, color: esSocial ? '#22d3ee' : '#a78bfa' }}>
                                {esSocial ? 'Social' : 'Privado'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-600">{proyecto.codigo}</span>
                            {contraparte && (
                                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                    <Building size={9} /><span className="truncate max-w-[100px]">{contraparte}</span>
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            {proyecto.responsable && (
                                <div className="hidden sm:flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                        style={{ background: 'rgba(52,211,153,0.2)' }}>
                                        {proyecto.responsable.nombre?.[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-[11px] text-slate-500">{proyecto.responsable.nombre}</span>
                                </div>
                            )}
                            {canEdit && (
                                <button onClick={() => navigate(`/dashboard/proyectos/${id}/editar`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                                    <Edit size={12} /> Editar
                                </button>
                            )}
                            {transiciones_permitidas.length > 0 && (
                                <button onClick={() => setModalEstado(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                                    style={{ background: estadoM.bg, border: `1px solid ${estadoM.border}`, color: estadoM.color }}>
                                    <Activity size={12} /> Estado
                                </button>
                            )}
                            <ExportarDropdown proyectoId={id} />
                        </div>
                    </div>

                    {/* KPI strip — 3 cols */}
                    <div className="grid grid-cols-3 gap-px" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {/* Avance */}
                        <div className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'rgba(15,23,42,0.97)' }}>
                            <RadialProgress pct={pctAvance} color={avanceColor} size={54} strokeWidth={5} />
                            <div className="min-w-0">
                                <p className="text-[9px] text-slate-500 uppercase tracking-wide">Avance</p>
                                <p className="text-xl font-black leading-none" style={{ color: avanceColor }}>
                                    {pctAvance.toFixed(1)}<span className="text-xs font-bold text-slate-500">%</span>
                                </p>
                                {avance.porcentaje_plazo != null && (
                                    <p className={`text-[9px] mt-0.5 ${pctAvance >= (avance.porcentaje_plazo ?? 0) ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        Esp.{(avance.porcentaje_plazo ?? 0).toFixed(0)}%
                                        {avance.hay_retraso && (
                                            <span className="text-red-400"> −{((avance.porcentaje_plazo ?? 0) - pctAvance).toFixed(0)}%</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Plazo */}
                        {(() => {
                            const plazoColor = avance.hay_retraso ? '#f87171' : '#60a5fa';
                            const diasRestantes = avance.dias_totales != null
                                ? Math.max(0, avance.dias_totales - (avance.dias_transcurridos ?? 0)) : null;
                            return (
                                <div className="flex flex-col justify-center px-4 py-3.5" style={{ background: 'rgba(15,23,42,0.97)' }}>
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wide">Plazo</p>
                                        {avance.hay_retraso && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-red-400 font-semibold">
                                                <AlertTriangle size={8} /> Retraso
                                            </span>
                                        )}
                                    </div>
                                    {avance.dias_totales != null ? (
                                        <>
                                            <p className="text-xl font-black leading-none mb-1.5" style={{ color: plazoColor }}>
                                                {avance.dias_transcurridos}
                                                <span className="text-xs text-slate-600">/{avance.dias_totales}d</span>
                                            </p>
                                            <ProgressBar pct={avance.porcentaje_plazo ?? 0} color={plazoColor} height="4px" />
                                            {diasRestantes !== null && (
                                                <p className="text-[9px] text-slate-600 mt-1">
                                                    {diasRestantes > 0 ? `${diasRestantes}d restantes` : 'Plazo vencido'}
                                                </p>
                                            )}
                                        </>
                                    ) : <p className="text-xs text-slate-600">Sin fechas</p>}
                                </div>
                            );
                        })()}

                        {/* Unidades */}
                        {(() => {
                            const unidades = avance.avance_por_unidad ?? [];
                            return (
                                <div className="flex flex-col justify-center px-4 py-3.5" style={{ background: 'rgba(15,23,42,0.97)' }}>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-1">
                                        {esSocial ? 'Viviendas' : 'Fases'}
                                    </p>
                                    <p className="text-xl font-black text-white leading-none mb-1.5">
                                        {avance.unidades_completadas}
                                        <span className="text-xs text-slate-600">/{avance.total_unidades}</span>
                                    </p>
                                    <div className="flex flex-wrap gap-0.5">
                                        {unidades.slice(0, 30).map((u, i) => {
                                            const p = parseFloat(u.porcentaje_avance ?? 0);
                                            const c = p >= 100 ? '#34d399' : p >= 50 ? '#60a5fa' : p > 0 ? '#fbbf24' : 'rgba(255,255,255,0.1)';
                                            return (
                                                <div key={i} className="w-2 h-2 rounded-sm transition-colors duration-300"
                                                    style={{ background: c }}
                                                    title={`${u.codigo}: ${p.toFixed(0)}%`} />
                                            );
                                        })}
                                        {unidades.length > 30 && (
                                            <span className="text-[9px] text-slate-600 self-center">+{unidades.length - 30}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* AreaChart — hitos o distribución de unidades */}
                    {(() => {
                        const hasHitos = hitos_cobro.length > 0;
                        const hitoData = [...hitos_cobro]
                            .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                            .map(h => ({
                                name: (h.nombre ?? `P${h.orden}`).slice(0, 14),
                                prog: h.avance_planificado != null ? parseFloat(h.avance_planificado) : 0,
                                real: parseFloat(h.avance_real ?? 0),
                            }));
                        const unitData = [...(avance.avance_por_unidad ?? [])]
                            .sort((a, b) => parseFloat(a.porcentaje_avance) - parseFloat(b.porcentaje_avance))
                            .map(u => ({ name: u.codigo, avance: parseFloat(u.porcentaje_avance ?? 0) }));
                        const chartData = hasHitos ? hitoData : unitData;
                        if (!chartData.length) return null;
                        return (
                            <div className="flex-1 px-4 pt-3 pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[9px] text-slate-600 uppercase tracking-wide">
                                        {hasHitos ? 'Avance por producto contractual' : `Distribución — ${esSocial ? 'viviendas' : 'fases'}`}
                                    </p>
                                    {hasHitos && (
                                        <div className="flex items-center gap-3 text-[9px] text-slate-600">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-0.5 rounded inline-block" style={{ background: '#475569' }} /> Obj. hoy
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-3 h-0.5 rounded inline-block" style={{ background: avanceColor }} /> Completado
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <ResponsiveContainer width="100%" height={110}>
                                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="heroProg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#475569" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="heroReal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={avanceColor} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={avanceColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#475569' }}
                                            axisLine={false} tickLine={false}
                                            interval={hasHitos ? 0 : 'preserveStartEnd'} />
                                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569' }}
                                            axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                                        <Tooltip content={<HeroAreaTooltip />}
                                            cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                                        {hasHitos ? (
                                            <>
                                                <Area type="monotone" dataKey="prog" name="Objetivo hoy"
                                                    stroke="#475569" strokeWidth={1.5} fill="url(#heroProg)"
                                                    dot={false} isAnimationActive animationDuration={1200} />
                                                <Area type="monotone" dataKey="real" name="Completado"
                                                    stroke={avanceColor} strokeWidth={2.5} fill="url(#heroReal)"
                                                    dot={{ r: 3, fill: avanceColor, strokeWidth: 0 }}
                                                    activeDot={{ r: 5, fill: avanceColor, strokeWidth: 0 }}
                                                    isAnimationActive animationDuration={1200} />
                                            </>
                                        ) : (
                                            <Area type="monotone" dataKey="avance" name="Avance"
                                                stroke={avanceColor} strokeWidth={2.5} fill="url(#heroReal)"
                                                dot={false} activeDot={{ r: 4, fill: avanceColor, strokeWidth: 0 }}
                                                isAnimationActive animationDuration={1500} />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        );
                    })()}
                </div>

                {/* ── Salud Financiera (2 of 5 cols) ── */}
                <div className="xl:col-span-2">
                    <SaludFinancieraCard proyecto={proyecto} canEdit={canEdit} onRefresh={cargar} />
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                FINANZAS — FLUJO DE COBRO
            ═══════════════════════════════════════════════════ */}
            <FinanzasSection proyecto={proyecto} hitosCobro={hitos_cobro} />

            {/* ══════════════════════════════════════════════════
                CRONOGRAMA / GANTT
            ═══════════════════════════════════════════════════ */}
            <GanttChart
                gantt={{ ...gantt, tipo: esSocial ? 'social' : 'privado' }}
                canEdit={canEdit}
                onEditItem={item => setModalFase(item)}
                onExport={async (tipo) => {
                    try {
                        const res = await api.get(`/proyectos/${id}/exportar`, { params: { tipo }, responseType: 'blob' });
                        const blob = new Blob([res.data]);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `exportacion.${tipo === 'excel' ? 'csv' : 'pdf'}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        toast.success('Exportación descargada');
                    } catch (e) {
                        toast.error('Error al exportar el cronograma');
                    }
                }}
            />

            {/* ══════════════════════════════════════════════════
                DOS COLUMNAS: Almacén + Beneficiarios/Hitos
            ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AlmacenCard almacen={almacen} proyectoId={id} navigate={navigate} />
                {esSocial && beneficiarios_resumen ? (
                    <BeneficiariosCard resumen={beneficiarios_resumen} proyectoId={id} navigate={navigate} />
                ) : (
                    <HitosCard hitos={hitos_proximos} />
                )}
            </div>

            {/* ══════════════════════════════════════════════════
                SEGUIMIENTO TÉCNICO
            ═══════════════════════════════════════════════════ */}
            <SeguimientoSection
                avancePorUnidad={avance.avance_por_unidad ?? []}
                esSocial={esSocial}
                proyectoId={id}
                pctPlazo={avance.porcentaje_plazo}
            />

            {/* ══════════════════════════════════════════════════
                DOS COLUMNAS: Ítems→Productos + Trazabilidad
            ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                <MatrizItemsProductosSection proyectoId={id} canEdit={canEdit} />
                <div className="flex flex-col gap-3">
                    <PresupuestoMaterialesSection proyectoId={id} canEdit={canEdit} />
                    {canEdit && (
                        <button
                            onClick={() => navigate(`/dashboard/proyectos/${id}/items`)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', color: '#c4b5fd' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,92,246,0.15)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(139,92,246,0.08)'}>
                            <Layers size={14} />
                            Configurar ítems del proyecto
                        </button>
                    )}
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                DOS COLUMNAS: Personal Asignado + Próximas
            ═══════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <PersonalAsignadoSection proyectoId={id} canEdit={canEdit} />
                <ModificatoriosSection proyectoId={id} proyecto={proyecto} canEdit={canEdit} />
            </div>

            {/* ── Modales ── */}
            {modalEstado && (
                <CambiarEstadoModal
                    proyecto={proyecto}
                    transiciones={transiciones_permitidas}
                    onGuardado={() => { setModalEstado(false); cargar(); }}
                    onCerrar={() => setModalEstado(false)}
                />
            )}
            {modalFase && (
                <EditarFaseModal
                    fase={modalFase}
                    onGuardado={() => { setModalFase(null); cargar(); }}
                    onCerrar={() => setModalFase(null)}
                />
            )}
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Matriz Items × Productos
═══════════════════════════════════════════════════ */
const MatrizItemsProductosSection = ({ proyectoId, canEdit }) => {
    const [matriz,    setMatriz]    = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [asignando, setAsignando] = useState(null); // item_constructivo_id being saved
    const [autoAsign, setAutoAsign] = useState(false);
    const [expandido, setExpandido] = useState(false);
    const [filtro,    setFiltro]    = useState('todos'); // 'todos' | 'sin_asignar' | hito.id (number)

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/proyectos/${proyectoId}/matriz-items-agrupada`);
            const data = res.data.data;
            setMatriz(data);
            if ((data?.totales?.items_sin_asignar ?? 0) > 0) setExpandido(true);
        } catch { /* items section may not exist yet */ }
        finally { setLoading(false); }
    }, [proyectoId]);

    useEffect(() => { cargar(); }, [cargar]);

    const handleAsignar = useCallback(async (icId, hitoCobroId) => {
        setAsignando(icId);
        try {
            await api.patch(`/proyectos/${proyectoId}/items-constructivos/${icId}/producto-contractual`, {
                hito_cobro_id: hitoCobroId ?? null,
            });
            // Optimistic local update — no refetch needed
            setMatriz(prev => {
                if (!prev) return prev;
                const items = prev.items.map(i =>
                    i.item_constructivo_id === icId ? { ...i, hito_cobro_id: hitoCobroId ?? null, mixto: false } : i
                );
                const asignados = items.filter(i => i.hito_cobro_id != null).length;
                return { ...prev, items, totales: { ...prev.totales, items_asignados: asignados, items_sin_asignar: items.length - asignados } };
            });
        } catch { toast.error('Error al asignar ítem'); }
        finally { setAsignando(null); }
    }, [proyectoId]);

    const handleAutoAsignar = async () => {
        setAutoAsign(true);
        try {
            const r = await proyectoService.asignacionAutomatica(proyectoId);
            toast.success(r.message || 'Asignación automática completada');
            await cargar();
        } catch { toast.error('Error en asignación automática'); }
        finally { setAutoAsign(false); }
    };

    if (loading) return (
        <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
                <Table2 size={15} className="text-slate-500" />
                <span className="text-sm font-bold text-white">Asignación Ítems → Productos</span>
            </div>
            <Skeleton height="60px" className="rounded-xl" />
        </GlassCard>
    );

    if (!matriz || !matriz.items?.length) return null;

    const { hitos = [], items = [], totales = {} } = matriz;
    const pctAsignados = totales.items_total > 0 ? Math.round(totales.items_asignados / totales.items_total * 100) : 0;
    const pctColor = pctAsignados === 100 ? '#34d399' : pctAsignados >= 60 ? '#60a5fa' : '#fbbf24';

    // Group items by category
    const categorias = items.reduce((acc, item) => {
        const cat = item.categoria_nombre ?? 'Sin categoría';
        if (!acc[cat]) acc[cat] = { color: item.categoria_color, items: [] };
        acc[cat].items.push(item);
        return acc;
    }, {});

    // Apply filter
    const filtrarItems = (list) => {
        if (filtro === 'todos') return list;
        if (filtro === 'sin_asignar') return list.filter(i => i.hito_cobro_id == null);
        return list.filter(i => i.hito_cobro_id === filtro);
    };

    return (
        <GlassCard className="p-5">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <button onClick={() => setExpandido(p => !p)} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                        <Table2 size={14} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Asignación Ítems → Productos</h3>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-[11px] text-slate-500">
                        {totales.items_asignados}/{totales.items_total} tipos asignados
                        <span className="font-bold ml-1" style={{ color: pctColor }}>({pctAsignados}%)</span>
                    </span>
                    {canEdit && hitos.length > 0 && (
                        <button onClick={handleAutoAsignar} disabled={autoAsign}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white transition-all disabled:opacity-50"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <RefreshCw size={10} className={autoAsign ? 'animate-spin' : ''} />
                            {autoAsign ? 'Asignando…' : 'Auto-asignar'}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Progress bar ────────────────────────────────────────── */}
            <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pctAsignados}%`, background: pctColor }} />
            </div>

            {expandido && (
                <>
                    {/* ── Filtros por producto ─────────────────────────── */}
                    {hitos.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {[
                                { key: 'todos', label: 'Todos', count: totales.items_total, color: '#94a3b8' },
                                ...hitos.map((h, i) => ({
                                    key: h.id,
                                    label: h.nombre,
                                    pct: parseFloat(h.porcentaje_contrato ?? 0).toFixed(0),
                                    count: items.filter(it => it.hito_cobro_id === h.id).length,
                                    color: HITO_COLORS[i % HITO_COLORS.length],
                                })),
                                { key: 'sin_asignar', label: 'Sin asignar', count: totales.items_sin_asignar, color: '#475569' },
                            ].map(f => {
                                const active = filtro === f.key;
                                return (
                                    <button key={f.key} onClick={() => setFiltro(f.key)}
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all"
                                        style={active ? {
                                            background: f.color + '22',
                                            border: `1px solid ${f.color}55`,
                                            color: f.color,
                                        } : {
                                            background: 'rgba(255,255,255,0.04)',
                                            border: '1px solid rgba(255,255,255,0.07)',
                                            color: '#475569',
                                        }}>
                                        {f.label}{f.pct ? ` · ${f.pct}%` : ''}
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                            style={{ background: active ? f.color + '30' : 'rgba(255,255,255,0.05)', color: active ? f.color : '#334155' }}>
                                            {f.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ── Items por categoría ─────────────────────────── */}
                    <div className="max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                    <div className="space-y-4">
                        {Object.entries(categorias).map(([catNombre, catData]) => {
                            const visibles = filtrarItems(catData.items);
                            if (!visibles.length) return null;
                            return (
                                <div key={catNombre}>
                                    {/* Category header */}
                                    <div className="flex items-center gap-2 mb-2">
                                        {catData.color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: catData.color }} />}
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{catNombre}</span>
                                        <span className="text-[9px] text-slate-700">({visibles.length})</span>
                                        <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                    </div>

                                    {/* Item rows */}
                                    <div className="space-y-1">
                                        {visibles.map(item => {
                                            const hitoIdx = hitos.findIndex(h => h.id === item.hito_cobro_id);
                                            const activeColor = hitoIdx >= 0 ? HITO_COLORS[hitoIdx % HITO_COLORS.length] : null;
                                            const isSaving = asignando === item.item_constructivo_id;

                                            return (
                                                <div key={item.item_constructivo_id}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                                                    style={{
                                                        background: activeColor ? activeColor + '08' : 'rgba(255,255,255,0.025)',
                                                        border: `1px solid ${activeColor ? activeColor + '20' : 'rgba(255,255,255,0.06)'}`,
                                                    }}>

                                                    {/* Item info */}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-medium text-slate-200 truncate">{item.nombre}</p>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="text-[10px] text-slate-600">
                                                                {parseFloat(item.cantidad_total).toFixed(2)} {item.unidad_base}
                                                            </span>
                                                            {item.viviendas_count > 1 && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: 'rgba(255,255,255,0.04)', color: '#475569' }}>
                                                                    {item.viviendas_count} viviendas
                                                                </span>
                                                            )}
                                                            {item.mixto && (
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full"
                                                                    style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.2)' }}>
                                                                    mixto
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Assignment pills */}
                                                    {hitos.length > 0 && (
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {isSaving ? (
                                                                <span className="text-[10px] text-slate-600 w-24 text-center">Guardando…</span>
                                                            ) : canEdit ? (
                                                                <>
                                                                    {hitos.map((h, i) => {
                                                                        const c = HITO_COLORS[i % HITO_COLORS.length];
                                                                        const active = item.hito_cobro_id === h.id;
                                                                        return (
                                                                            <button key={h.id}
                                                                                onClick={() => handleAsignar(item.item_constructivo_id, active ? null : h.id)}
                                                                                title={active ? `Quitar de ${h.nombre}` : `Asignar a ${h.nombre}`}
                                                                                className="px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                                                                                style={active ? {
                                                                                    background: c + '28',
                                                                                    border: `1px solid ${c}60`,
                                                                                    color: c,
                                                                                    boxShadow: `0 2px 6px ${c}30`,
                                                                                } : {
                                                                                    background: 'rgba(255,255,255,0.04)',
                                                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                                                    color: '#334155',
                                                                                }}>
                                                                                P{i + 1}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </>
                                                            ) : (
                                                                <span className="text-[11px] px-2 py-0.5 rounded-lg font-semibold"
                                                                    style={{
                                                                        background: activeColor ? activeColor + '20' : 'rgba(255,255,255,0.04)',
                                                                        color: activeColor ?? '#475569',
                                                                    }}>
                                                                    {hitos.find(h => h.id === item.hito_cobro_id)?.nombre ?? '—'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {filtrarItems(items).length === 0 && (
                            <p className="text-xs text-center py-6 text-slate-600">Sin ítems en este filtro</p>
                        )}
                    </div>
                    </div>
                </>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Modal de Detalle de Movimientos (Liquid Glass)
═══════════════════════════════════════════════════ */
const ModalDetalleMaterial = ({ isOpen, onClose, proyectoId, material, tipo }) => {
    const [detalles, setDetalles] = useState(null);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (!isOpen || !material || !tipo) return;
        setLoading(true);
        presupuestoMaterialService.detalleMaterial(proyectoId, material.id, tipo)
            .then(res => setDetalles(res.data))
            .catch(() => toast.error('Error al cargar detalle'))
            .finally(() => setLoading(false));
    }, [isOpen, material, tipo, proyectoId]);

    if (!isOpen) return null;

    const titulos = {
        compras: 'Compras',
        transferencias: 'Transferencias al Central (Devoluciones)',
        entregas: 'Entregas a Obra',
        mermas: 'Mermas y Retrabajos'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl animate-fade-in"
                style={{
                    background: 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}>
                <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Package className="text-blue-400" size={20} />
                                {material?.nombre}
                            </h3>
                            <p className="text-slate-400 text-sm mt-1">{titulos[tipo]}</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 animate-pulse">Cargando movimientos...</div>
                        ) : detalles?.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">No hay movimientos registrados de este tipo.</div>
                        ) : (
                            <div className="max-h-[60vh] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-white/5 text-slate-300 text-xs uppercase sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Fecha</th>
                                            <th className="px-4 py-3 font-medium">Código Mov.</th>
                                            <th className="px-4 py-3 font-medium">Tipo</th>
                                            <th className="px-4 py-3 font-medium text-right">Cantidad</th>
                                            {tipo === 'compras' && <th className="px-4 py-3 font-medium text-right">P. Unit.</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {detalles?.map(d => (
                                            <tr key={d.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-slate-400">{d.fecha ? new Date(d.fecha).toLocaleDateString() : '—'}</td>
                                                <td className="px-4 py-3 font-mono text-xs text-blue-300">{d.movimiento_codigo || '—'}</td>
                                                <td className="px-4 py-3 text-slate-300 capitalize">{d.tipo ? d.tipo.replace('_', ' ') : '—'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-white">{Number(d.cantidad).toFixed(2)}</td>
                                                {tipo === 'compras' && <td className="px-4 py-3 text-right text-slate-400">Bs {Number(d.precio_unitario).toFixed(2)}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════════════
   Presupuesto de Materiales (mini-vista en detalle)
═══════════════════════════════════════════════════ */
const PresupuestoMaterialesSection = ({ proyectoId, canEdit }) => {
    const [items, setItems]         = useState([]);
    const [totales, setTotales]     = useState({ total_materiales: 0, monto_total: 0, materiales_con_desfase: 0 });
    const [loading, setLoading]     = useState(true);
    const [reconsolidando, setReconsolidando] = useState(false);
    const [busqueda, setBusqueda]   = useState('');
    const [expandido, setExpandido] = useState(false);

    // Modal state
    const [modalInfo, setModalInfo] = useState({ isOpen: false, material: null, tipo: null });

    const cargar = () => {
        setLoading(true);
        presupuestoMaterialService.listarPorProyecto(proyectoId)
            .then(r => {
                setItems(r.data?.items || []);
                setTotales(r.data?.totales || {});
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { cargar(); }, [proyectoId]);

    const handleReconsolidar = async () => {
        setReconsolidando(true);
        try {
            const r = await presupuestoMaterialService.reconsolidar(proyectoId);
            toast.success(`Reconciliación completa: ${r.data?.corregidos} corregidos.`);
            await cargar();
        } catch { toast.error('Error al reconsolidar.'); }
        finally { setReconsolidando(false); }
    };

    const itemsFiltrados = busqueda
        ? items.filter(i => i.material?.nombre?.toLowerCase().includes(busqueda.toLowerCase())
            || i.material?.codigo?.toLowerCase().includes(busqueda.toLowerCase()))
        : items;

    const montoTotal = totales.monto_total || 0;

    return (
        <GlassCard className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <button onClick={() => setExpandido(p => !p)} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Package size={14} className="text-violet-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Trazabilidad de Materiales</h3>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                        {totales.total_materiales} ítems
                    </span>
                    {totales.materiales_con_desfase > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} /> {totales.materiales_con_desfase} con desfase
                        </span>
                    )}
                    {canEdit && (
                        <button onClick={handleReconsolidar} disabled={reconsolidando}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-400 hover:text-sky-300 transition-all disabled:opacity-50"
                            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
                            title="Recalcular todo desde los movimientos de almacén reales">
                            <RefreshCw size={12} className={reconsolidando ? 'animate-spin' : ''} />
                            {reconsolidando ? 'Reconciliando…' : 'Reconsolidar Todo'}
                        </button>
                    )}
                    <BotonExportar
                        url={`/proyectos/${proyectoId}/reportes/balance-consolidado`}
                        filtros={{ search: busqueda }}
                        formatos={['pdf', 'excel']}
                        label="Balance Oficial"
                    />
                </div>
            </div>

            {expandido && (<>
            {/* Buscador inline */}
            {items.length > 5 && (
                <div className="relative mt-3">
                    <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                        placeholder="Buscar material…"
                        className="w-full pl-8 pr-3 py-2 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none transition-all focus:border-violet-500/50"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
            )}

            {loading ? (
                <div className="text-slate-500 text-xs py-8 text-center animate-pulse">Cargando trazabilidad…</div>
            ) : items.length === 0 ? (
                <div className="text-center py-8">
                    <Package size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-500 text-sm">Sin materiales presupuestados</p>
                </div>
            ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-white/5 scrollbar-thin">
                    <table className="w-full text-xs min-w-[520px]">
                        <thead className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}>
                            <tr className="border-b border-white/10">
                                <th className="text-left text-slate-400 py-2 px-3 font-semibold">Material</th>
                                <th className="text-right text-slate-400 py-2 px-2 font-semibold w-[72px] whitespace-nowrap">Planif.</th>
                                <th className="text-right text-blue-400 py-2 px-2 font-semibold w-[72px] whitespace-nowrap">Comprado</th>
                                <th className="text-right text-sky-400 py-2 px-2 font-semibold w-[72px] whitespace-nowrap">Almacén</th>
                                <th className="text-right text-purple-400 py-2 px-2 font-semibold w-[72px] whitespace-nowrap">Devuelto</th>
                                <th className="text-right text-emerald-400 py-2 px-2 font-semibold w-[72px] whitespace-nowrap">Entregado</th>
                                <th className="text-right text-orange-400 py-2 px-2 font-semibold w-[60px] whitespace-nowrap">Merma</th>
                                <th className="text-center text-slate-400 py-2 px-2 font-semibold w-8" title="Identidad Contable: Comprado = EnAlmacen + Devuelto + Entregado + Merma">✓</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(() => {
                                const fmtN = (v) => { const n = Number(v || 0); return n === 0 ? '—' : n.toFixed(2); };
                                return itemsFiltrados.map(item => {
                                    const catColor = item.material?.categoria?.color || '#6366f1';
                                    const tieneDesfase = !item.identidad_contable_ok;
                                    const openModal = (tipo) => setModalInfo({ isOpen: true, material: item.material, tipo });

                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="py-1.5 px-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: catColor, boxShadow: `0 0 6px ${catColor}` }} />
                                                    <span className="text-white font-medium truncate max-w-[220px]">{item.material?.nombre}</span>
                                                </div>
                                                <div className="text-slate-500 text-[10px] pl-3.5">{item.material?.codigo} · {item.material?.unidadMedida?.simbolo}</div>
                                            </td>
                                            <td className="py-1.5 px-2 text-right text-slate-300 font-medium tabular-nums whitespace-nowrap">
                                                {Number(item.planificado || item.cantidad_total_planificada || 0).toFixed(2)}
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                                                <button onClick={() => openModal('compras')} className="text-blue-300 font-bold hover:text-blue-200 hover:underline transition-all">
                                                    {fmtN(item.comprado)}
                                                </button>
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                                                <span className="text-sky-300 font-bold">{fmtN(item.en_almacen)}</span>
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                                                <button onClick={() => openModal('transferencias')} className="text-purple-300 font-bold hover:text-purple-200 hover:underline transition-all">
                                                    {fmtN(item.devuelto_central)}
                                                </button>
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                                                <button onClick={() => openModal('entregas')} className="text-emerald-300 font-bold hover:text-emerald-200 hover:underline transition-all">
                                                    {fmtN(item.entregado_obra)}
                                                </button>
                                            </td>
                                            <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap">
                                                <button onClick={() => openModal('mermas')} className="text-orange-300 font-bold hover:text-orange-200 hover:underline transition-all">
                                                    {fmtN((parseFloat(item.merma) || 0) + (parseFloat(item.retrabajo) || 0))}
                                                </button>
                                            </td>
                                            <td className="py-1.5 px-2 text-center">
                                                {tieneDesfase ? (
                                                    <div className="flex items-center justify-center text-red-400" title={`Desfase contable: ${item.desfase}`}>
                                                        <AlertTriangle size={13} />
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center text-emerald-500" title="Identidad Contable OK">
                                                        <Check size={13} />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                    {busqueda && itemsFiltrados.length === 0 && (
                        <p className="text-slate-600 text-xs py-4 text-center">Sin resultados para "{busqueda}"</p>
                    )}
                </div>
            )}
            </>)}

            <ModalDetalleMaterial
                isOpen={modalInfo.isOpen}
                onClose={() => setModalInfo({ isOpen: false, material: null, tipo: null })}
                proyectoId={proyectoId}
                material={modalInfo.material}
                tipo={modalInfo.tipo}
            />
        </GlassCard>
    );
};

export default DetalleProyecto;
