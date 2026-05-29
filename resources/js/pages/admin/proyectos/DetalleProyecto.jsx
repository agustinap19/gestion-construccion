import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import {
    Briefcase, Edit, ArrowLeft, Users, Building, MapPin, Calendar,
    Clock, Package, TrendingUp, BarChart2, Activity, ChevronDown, ChevronRight,
    X, Check, CheckCircle, AlertTriangle, Download, FileText, Table2, UserCheck,
    ClipboardList, Wrench, Flag, Plus, ExternalLink, Layers, Trash2, Upload,
    History, Eye, Search, User, RefreshCw
} from '../../../components/icons/Icons';
import { Loader2 } from 'lucide-react';

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
            porcentaje_gastos_generales:   String(parseFloat(proyecto.porcentaje_gastos_generales ?? 0)),
            porcentaje_utilidad_esperada:  String(parseFloat(proyecto.porcentaje_utilidad_esperada ?? 0)),
            usa_monto_fijo_mo:             proyecto.usa_monto_fijo_mo   ?? false,
            usa_monto_fijo_gg:             proyecto.usa_monto_fijo_gg   ?? false,
            usa_monto_fijo_util:           proyecto.usa_monto_fijo_util  ?? false,
            presupuesto_mano_obra:         String(parseFloat(proyecto.presupuesto_mano_obra         ?? 0)),
            presupuesto_gastos_generales:  String(parseFloat(proyecto.presupuesto_gastos_generales  ?? 0)),
            presupuesto_utilidad_esperada: String(parseFloat(proyecto.presupuesto_utilidad_esperada ?? 0)),
            justificacion_rentabilidad_baja: proyecto.justificacion_rentabilidad_baja ?? '',
        });
        setEditando(true);
    };

    // Live calculation in edit mode
    const calcLive = useMemo(() => {
        const porMO   = parseFloat(form.porcentaje_mano_obra        || 0);
        const porGG   = parseFloat(form.porcentaje_gastos_generales || 0);
        const porUtil = parseFloat(form.porcentaje_utilidad_esperada || 0);
        const pMO     = form.usa_monto_fijo_mo   ? parseFloat(form.presupuesto_mano_obra         || 0) : monto * porMO   / 100;
        const pGG     = form.usa_monto_fijo_gg   ? parseFloat(form.presupuesto_gastos_generales  || 0) : monto * porGG   / 100;
        const pUtil   = form.usa_monto_fijo_util  ? parseFloat(form.presupuesto_utilidad_esperada || 0) : monto * porUtil / 100;
        const pMat    = Math.max(0, monto - pMO - pGG - pUtil);
        const rentPct = monto > 0 ? ((monto - pMat - pMO - pGG) / monto * 100) : 0;
        return { pMO, pGG, pUtil, pMat, rentPct };
    }, [form, monto]);

    const handleGuardar = async () => {
        try {
            setGuardando(true);
            const payload = {
                porcentaje_mano_obra:          parseFloat(form.porcentaje_mano_obra        || 0),
                porcentaje_gastos_generales:   parseFloat(form.porcentaje_gastos_generales || 0),
                porcentaje_utilidad_esperada:  parseFloat(form.porcentaje_utilidad_esperada || 0),
                usa_monto_fijo_mo:             form.usa_monto_fijo_mo,
                usa_monto_fijo_gg:             form.usa_monto_fijo_gg,
                usa_monto_fijo_util:           form.usa_monto_fijo_util,
                presupuesto_mano_obra:         parseFloat(form.presupuesto_mano_obra         || 0),
                presupuesto_gastos_generales:  parseFloat(form.presupuesto_gastos_generales  || 0),
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

                {/* Gastos Generales */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-semibold text-yellow-300">Gastos Generales</span>
                        <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer">
                            <input type="checkbox" checked={form.usa_monto_fijo_gg} onChange={e => setF('usa_monto_fijo_gg', e.target.checked)} className="accent-yellow-500 w-3 h-3" />
                            Monto fijo
                        </label>
                    </div>
                    {form.usa_monto_fijo_gg ? (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">Bs.</span>
                            <input type="number" min="0" step="100" value={form.presupuesto_gastos_generales}
                                onChange={e => setF('presupuesto_gastos_generales', e.target.value)}
                                className="flex-1 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1 focus:ring-yellow-500/40" />
                            <span className="text-[10px] text-slate-500 w-16 text-right">{pct(calcLive.pGG).toFixed(1)}% del total</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input type="number" min="0" max="100" step="0.5" value={form.porcentaje_gastos_generales}
                                onChange={e => setF('porcentaje_gastos_generales', e.target.value)}
                                className="w-20 px-2 py-1.5 rounded-lg text-xs text-white outline-none bg-white/[0.06] border border-white/[0.1] focus:ring-1 focus:ring-yellow-500/40" />
                            <span className="text-[10px] text-slate-500">%</span>
                            <span className="text-[10px] text-slate-500 ml-auto">{bs(calcLive.pGG)}</span>
                        </div>
                    )}
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
    const barras = [
        { label: 'Materiales',                    monto: presupMat,  color: '#60a5fa' },
        { label: `MO (${pctMO.toFixed(1)}%)`,     monto: presupMO,   color: '#a78bfa' },
        { label: `GG (${pctGG.toFixed(1)}%)`,     monto: presupGG,   color: '#fbbf24' },
        { label: `Utilidad (${pctUtil.toFixed(1)}%)`, monto: presupUtil, color: sm.color },
    ];

    return (
        <GlassCard className="p-5" style={{ borderColor: sm.border, background: sm.bg }}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: sm.color }} />
                    <h3 className="text-sm font-bold text-white">Salud Financiera</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">{bs(monto)} contractual</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: sm.color + '20', color: sm.color, border: `1px solid ${sm.color}40` }}>
                        {sm.label}
                    </span>
                    {canEdit && (
                        <button onClick={iniciarEdicion} title="Editar presupuesto"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Edit size={13} />
                        </button>
                    )}
                </div>
            </div>
            <div className="space-y-3">
                {barras.map(({ label, monto: m, color }) => (
                    <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] text-slate-400">{label}</span>
                            <span className="text-[11px] font-medium text-slate-300">{bs(m)} <span className="text-slate-600">({pct(m).toFixed(1)}%)</span></span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct(m)}%`, background: color }} />
                        </div>
                    </div>
                ))}
            </div>
            {proyecto.justificacion_rentabilidad_baja && (
                <div className="mt-3 p-2.5 rounded-xl flex items-start gap-2" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <AlertTriangle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-red-300 leading-relaxed">{proyecto.justificacion_rentabilidad_baja}</p>
                </div>
            )}
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Finanzas section (hitos de cobro + flujo)
═══════════════════════════════════════════════════ */
const HITO_ESTADO_META = {
    planificado:      { label: 'Planificado',      color: '#94a3b8', bg: 'rgba(148,163,184,0.1)'  },
    listo_para_cobro: { label: 'Listo para cobrar', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)'  },
    cobrado:          { label: 'Cobrado',           color: '#34d399', bg: 'rgba(52,211,153,0.1)'  },
};

const FinanzasSection = ({ proyecto, hitosCobro = [] }) => {
    const monto = parseFloat(proyecto.monto_contractual || proyecto.presupuesto_referencial || 0);
    if (monto <= 0 && hitosCobro.length === 0) return null;

    const bs = n => `Bs. ${Math.round(n || 0).toLocaleString('es-BO')}`;

    const cobrado      = hitosCobro.filter(h => h.estado === 'cobrado').reduce((s, h) => s + parseFloat(h.monto_calculado || 0), 0);
    const listo        = hitosCobro.filter(h => h.estado === 'listo_para_cobro').reduce((s, h) => s + parseFloat(h.monto_calculado || 0), 0);
    const pendiente    = monto - cobrado - listo;
    const pctCobrado   = monto > 0 ? Math.min(100, cobrado   / monto * 100) : 0;
    const pctListo     = monto > 0 ? Math.min(100, listo     / monto * 100) : 0;
    const pctPendiente = Math.max(0, 100 - pctCobrado - pctListo);

    return (
        <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <BarChart2 size={14} className="text-blue-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-200">Finanzas — Flujo de Cobro</h3>
                {monto > 0 && (
                    <span className="ml-auto text-xs text-slate-500">{bs(monto)} contractual</span>
                )}
            </div>

            {/* Barra acumulada */}
            {monto > 0 && (
                <div className="mb-5">
                    <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
                        <div style={{ width: `${pctCobrado}%`, background: '#34d399' }} className="rounded-full transition-all duration-700" title={`Cobrado: ${pctCobrado.toFixed(1)}%`} />
                        <div style={{ width: `${pctListo}%`, background: '#60a5fa' }} className="rounded-full transition-all duration-700" title={`Listo: ${pctListo.toFixed(1)}%`} />
                        <div style={{ width: `${pctPendiente}%`, background: 'rgba(255,255,255,0.06)' }} className="rounded-full transition-all duration-700" />
                    </div>
                    <div className="flex gap-4 text-[11px]">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            Cobrado {bs(cobrado)} ({pctCobrado.toFixed(1)}%)
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-400">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            Listo para cobrar {bs(listo)} ({pctListo.toFixed(1)}%)
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-white/20 shrink-0" />
                            Pendiente {bs(Math.max(0, pendiente))} ({pctPendiente.toFixed(1)}%)
                        </span>
                    </div>
                </div>
            )}

            {/* Lista de hitos */}
            {hitosCobro.length > 0 ? (
                <div className="space-y-2">
                    {hitosCobro.map((h, i) => {
                        const meta   = HITO_ESTADO_META[h.estado] ?? HITO_ESTADO_META.planificado;
                        const montoH = parseFloat(h.monto_calculado || 0);
                        const pctH   = monto > 0 ? (montoH / monto * 100).toFixed(1) : h.porcentaje_contrato?.toFixed(1);
                        return (
                            <div key={h.id ?? i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                style={{ background: meta.bg, border: `1px solid ${meta.color}25` }}>
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                                    style={{ background: meta.color + '20', color: meta.color }}>
                                    {i + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-white truncate">{h.nombre}</div>
                                    {h.fecha_planificada && (
                                        <div className="text-[10px] text-slate-500">
                                            {h.fecha_cobrado
                                                ? `Cobrado: ${h.fecha_cobrado}`
                                                : `Planificado: ${h.fecha_planificada}`}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-xs font-semibold text-slate-200">{bs(montoH)}</div>
                                    <div className="text-[10px] text-slate-500">{pctH}% del contrato</div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
                                    style={{ background: meta.color + '20', color: meta.color }}>
                                    {meta.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-xs text-slate-500 text-center py-4">Sin hitos de cobro registrados</p>
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
   Gantt Chart
═══════════════════════════════════════════════════ */
const GanttChart = ({ gantt, canEdit, onEditItem, onExport }) => {
    const { items = [], pos_hoy, fecha_inicio_proyecto, fecha_fin_proyecto, dias_totales } = gantt;

    return (
        <GlassCard>
            <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <SectionTitle icon={Clock} title="Cronograma" />
                <div className="flex gap-2">
                    {onExport && (
                        <>
                            <button onClick={() => onExport('pdf')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <FileText size={13} /> PDF
                            </button>
                            <button onClick={() => onExport('excel')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <Table2 size={13} /> Excel
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="p-5">
                {/* Eje de fechas */}
                {fecha_inicio_proyecto && fecha_fin_proyecto && (
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1.5 px-0.5">
                        <span>{fecha_inicio_proyecto}</span>
                        <span className="text-slate-500 font-medium">
                            {dias_totales != null ? `${dias_totales} días totales` : ''}
                        </span>
                        <span>{fecha_fin_proyecto}</span>
                    </div>
                )}

                {/* Container de barras */}
                <div className="relative" style={{ minHeight: items.length * 40 + 32 }}>
                    {/* Background track */}
                    <div className="absolute inset-x-0 top-0 bottom-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }} />

                    {/* Línea de hoy */}
                    {pos_hoy != null && (
                        <div className="absolute top-0 bottom-8 w-px z-10"
                            style={{ left: `${pos_hoy}%`, background: 'rgba(251,191,36,0.6)' }}>
                            <div className="absolute -top-1 -left-[3px] w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <div className="absolute -bottom-5 text-[9px] text-amber-400 font-bold whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>HOY</div>
                        </div>
                    )}

                    {/* Barras */}
                    {items.map((item, idx) => {
                        const meta = item.tipo === 'fase'
                            ? FASE_ESTADO_META[item.estado] ?? FASE_ESTADO_META.pendiente
                            : { color: '#22d3ee' };
                        const color = item.vencida ? '#f87171' : meta.color;
                        const topPx = idx * 40 + 8;

                        return (
                            <div key={item.id} className="absolute h-7"
                                style={{ left: `${item.left}%`, width: `${item.width}%`, top: topPx }}>
                                {/* Barra base */}
                                <div className="absolute inset-0 rounded-lg overflow-hidden"
                                    style={{ background: color + '20', border: `1px solid ${color}40` }}>
                                    {/* Fill de avance */}
                                    <div className="absolute left-0 top-0 bottom-0 rounded-l-lg"
                                        style={{ width: `${item.porcentaje_avance ?? item.porcentaje ?? 0}%`, background: color + '50', transition: 'width 0.6s ease' }} />
                                </div>
                                {/* Label y botón editar */}
                                <div className="absolute inset-0 flex items-center px-2 gap-1 overflow-hidden">
                                    <span className="text-[10px] font-semibold truncate flex-1" style={{ color }}>{item.nombre}</span>
                                    {item.tipo === 'fase' && (
                                        <span className="text-[9px] text-slate-500 shrink-0">{(item.porcentaje_avance ?? 0).toFixed(0)}%</span>
                                    )}
                                    {canEdit && item.editable && (
                                        <button onClick={() => onEditItem(item)}
                                            className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 transition-all"
                                            title="Editar fase">
                                            <Edit size={10} style={{ color }} />
                                        </button>
                                    )}
                                </div>
                                {/* Marker de fecha cobro (productos sociales) */}
                                {item.pos_marker != null && (
                                    <div className="absolute top-0 bottom-0 w-px z-10"
                                        style={{ left: `${((item.pos_marker - item.left) / item.width) * 100}%`, background: color, opacity: 0.8 }} />
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Leyenda */}
                {items.length > 0 && (
                    <div className="mt-8 flex flex-wrap gap-3">
                        {items.map((item) => {
                            const meta = item.tipo === 'fase'
                                ? FASE_ESTADO_META[item.estado] ?? FASE_ESTADO_META.pendiente
                                : { color: '#22d3ee' };
                            const color = item.vencida ? '#f87171' : meta.color;
                            return (
                                <button key={item.id}
                                    onClick={() => canEdit && item.editable && onEditItem(item)}
                                    className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${canEdit && item.editable ? 'hover:text-white cursor-pointer' : ''} transition-colors`}>
                                    <span className="w-2 h-2 rounded-sm" style={{ background: color }} />
                                    {item.nombre}
                                    {item.vencida && <AlertTriangle size={9} className="text-red-400" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {items.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-600">
                        No hay {gantt.tipo === 'social' ? 'productos contractuales' : 'fases'} configuradas
                    </div>
                )}
            </div>
        </GlassCard>
    );
};

/* ══════════════════════════════════════════════════
   Almacén card
═══════════════════════════════════════════════════ */
const AlmacenCard = ({ almacen, proyectoId, navigate }) => (
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
            <ExternalLink size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
        </div>
        {almacen.existe ? (
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xl font-bold text-amber-400">0</p>
                        <p className="text-[10px] text-slate-600">Ítems registrados</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xl font-bold text-slate-400">{almacen.movimientos_mes ?? 0}</p>
                        <p className="text-[10px] text-slate-600">Movimientos/mes</p>
                    </div>
                </div>
                <p className="text-[11px] text-slate-500">{almacen.nombre}</p>
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

                    {/* Checklist con % por ítem */}
                    {unidad.items_checklist?.length > 0 ? (
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
                    )}

                    {/* Acciones */}
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
                        {esSocial && (
                            <>
                                <BotonExportar
                                    url={`/reportes-tecnicos/vivienda/${unidad.id}/exportar-avance`}
                                    formatos={[{ tipo: 'pdf', label: 'Avance PDF' }]}
                                    label="Avance PDF"
                                    className="!bg-white/[0.05] !border-white/[0.08] !text-slate-400 !px-3 !py-1.5 !rounded-lg !text-xs hover:!text-white"
                                />
                                <BotonExportar
                                    url={`/reportes-tecnicos/vivienda/${unidad.id}/exportar-fotos`}
                                    formatos={[{ tipo: 'pdf', label: 'Fotos PDF' }]}
                                    label="Fotos PDF"
                                    className="!bg-white/[0.05] !border-white/[0.08] !text-slate-400 !px-3 !py-1.5 !rounded-lg !text-xs hover:!text-white"
                                />
                            </>
                        )}
                    </div>

                    {/* Timeline de reportes */}
                    {verTimeline && (
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
   Galería fotográfica del proyecto
═══════════════════════════════════════════════════ */
const GaleriaModal = ({ proyectoId, onCerrar }) => {
    const [fotos,     setFotos]     = useState([]);
    const [cargando,  setCargando]  = useState(true);
    const [filtros,   setFiltros]   = useState({ desde: '', hasta: '' });

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const f = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
            const data = await reporteTecnicoService.galeriaProyecto(proyectoId, f);
            setFotos(data.data ?? []);
        } catch { toast.error('Error al cargar la galería'); }
        finally { setCargando(false); }
    }, [proyectoId, filtros]);

    useEffect(() => { cargar(); }, [cargar]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
                style={{ background: 'rgba(8,18,36,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}>

                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
                            <Eye size={16} className="text-violet-400" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Galería Fotográfica del Proyecto</h3>
                    </div>
                    <button onClick={onCerrar} className="text-slate-500 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Filtros */}
                <div className="flex items-center gap-3 px-5 py-3 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <input type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#cbd5e1' }} />
                    <span className="text-slate-600 text-xs">—</span>
                    <input type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))}
                        className="px-3 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#cbd5e1' }} />
                    <span className="text-xs text-slate-500">{fotos.length} foto(s)</span>
                </div>

                {/* Grid de fotos */}
                <div className="overflow-y-auto flex-1 p-4">
                    {cargando ? (
                        <div className="flex justify-center py-12">
                            <span className="w-8 h-8 border-2 border-slate-700 border-t-violet-400 rounded-full animate-spin" />
                        </div>
                    ) : fotos.length === 0 ? (
                        <div className="text-center py-12">
                            <Eye size={32} className="text-slate-700 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Sin fotos para este período</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {fotos.map(foto => (
                                <div key={foto.id} className="group relative">
                                    <img src={foto.url_thumbnail ?? foto.url_original} alt={foto.caption ?? ''}
                                        className="w-full aspect-square object-cover rounded-xl cursor-pointer"
                                        style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                                        onClick={() => window.open(foto.url_original, '_blank')} />
                                    {foto.caption && (
                                        <div className="absolute bottom-0 left-0 right-0 p-1.5 rounded-b-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                                            <p className="text-[9px] text-white line-clamp-2">{foto.caption}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                        {esSocial ? <Building size={14} className="text-emerald-400" /> : <Layers size={14} className="text-emerald-400" />}
                    </div>
                    <h2 className="text-sm font-bold text-slate-200">
                        {esSocial ? 'Seguimiento de Viviendas' : 'Seguimiento de Fases'}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setGaleriaOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                        <Eye size={12} /> Galería
                    </button>
                    <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                        className="text-xs rounded-lg px-2 py-1 outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: '#cbd5e1' }}>
                        <option value="todos">Todos</option>
                        {Object.entries(metaMap).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                </div>
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
const ROL_META = {
    director_obra:       { label: 'Director de Obra',       color: '#a78bfa' },
    supervisor:          { label: 'Supervisor',             color: '#60a5fa' },
    tecnico_residente:   { label: 'Técnico Residente',      color: '#34d399' },
    albanil_especialista:{ label: 'Albañil Especialista',   color: '#fbbf24' },
    albanil:             { label: 'Albañil',                color: '#f97316' },
    ayudante:            { label: 'Ayudante',               color: '#94a3b8' },
    otro:                { label: 'Otro',                   color: '#94a3b8' },
};

const ROLES_OPCIONES = Object.entries(ROL_META).map(([v, m]) => ({ value: v, label: m.label }));

function AsignarPersonalModal({ proyectoId, onClose, onGuardado }) {
    const [query, setQuery]         = useState('');
    const [resultados, setResultados] = useState([]);
    const [buscando, setBuscando]   = useState(false);
    const [seleccionado, setSeleccionado] = useState(null);
    const [rol, setRol]             = useState('');
    const [responsable, setResponsable] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10));
    const [guardando, setGuardando] = useState(false);
    const timerRef = useRef(null);

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
        if (!rol) { toast.error('Selecciona el rol en obra'); return; }
        setGuardando(true);
        try {
            await asignacionPersonalService.asignar(proyectoId, {
                personal_id: seleccionado.id,
                rol_en_proyecto: rol,
                es_responsable_principal: responsable,
                fecha_inicio: fechaInicio,
            });
            toast.success('Personal asignado al proyecto');
            onGuardado();
        } catch (e) {
            toast.error(e.response?.data?.message || e.response?.data?.errors?.personal_id?.[0] || 'Error al asignar');
        } finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-md rounded-2xl flex flex-col max-h-[88vh]"
                style={{ background: 'rgba(10,20,40,0.97)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                    <h3 className="text-base font-bold text-white">Asignar Personal al Proyecto</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Búsqueda */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Buscar empleado activo
                        </label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input value={query} onChange={e => { setQuery(e.target.value); setSeleccionado(null); }}
                                placeholder="Escribe nombre o CI…" className={gI() + ' pl-10 h-11 text-base'}
                                autoFocus />
                        </div>
                        {/* Resultados */}
                        {(resultados.length > 0 || buscando) && !seleccionado && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-slate-700 max-h-56 overflow-y-auto shadow-2xl bg-slate-900">
                                {buscando && <div className="px-4 py-4 text-sm text-slate-400 flex items-center justify-center gap-2"><Loader2 className="animate-spin w-4 h-4"/> Buscando…</div>}
                                {resultados.map(p => (
                                    <button key={p.id} onClick={() => { setSeleccionado(p); setQuery(p.nombre + ' ' + p.apellido_paterno); setResultados([]); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors text-left border-b border-slate-800 last:border-0">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-cyan-300 bg-cyan-900/40">
                                            {p.nombre?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-200">{p.nombre} {p.apellido_paterno}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{p.tipo || 'Personal'} · CI: {p.ci}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {/* Seleccionado */}
                        {seleccionado && (
                            <div className="mt-3 flex items-center gap-3 p-3 rounded-xl bg-emerald-900/20 border border-emerald-500/30">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-emerald-400 bg-emerald-500/20">
                                    {seleccionado.nombre?.[0]?.toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-emerald-100 font-semibold">{seleccionado.nombre} {seleccionado.apellido_paterno}</p>
                                    <p className="text-xs text-emerald-400/70">CI: {seleccionado.ci}</p>
                                </div>
                                <button onClick={() => { setSeleccionado(null); setQuery(''); }} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"><X size={16} /></button>
                            </div>
                        )}
                    </div>
                    {/* Rol */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rol en obra <span className="text-rose-400">*</span></label>
                        <select value={rol} onChange={e => setRol(e.target.value)} className={gI(!rol && guardando) + ' h-11 text-base'}>
                            <option value="">— Seleccionar rol —</option>
                            {ROLES_OPCIONES.map(r => <option key={r.value} value={r.value} style={{ background: '#0f172a' }}>{r.label}</option>)}
                        </select>
                    </div>
                    {/* Fecha inicio */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fecha de inicio</label>
                        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className={gI() + ' h-11 text-base'} style={{ colorScheme: 'dark' }} />
                    </div>
                    {/* Responsable principal */}
                    <div className="pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center w-6 h-6 rounded border transition-colors bg-slate-800/50 border-slate-600 group-hover:border-slate-500">
                                <input type="checkbox" className="absolute opacity-0 cursor-pointer w-full h-full" checked={responsable} onChange={e => setResponsable(e.target.checked)} />
                                {responsable && <Check size={14} className="text-emerald-400" />}
                            </div>
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Es Responsable principal del proyecto</span>
                        </label>
                    </div>
                </div>
                {/* Footer */}
                <div className="flex gap-3 p-5 border-t border-white/[0.08]">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-slate-400 hover:text-white transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Cancelar
                    </button>
                    <SpinBtn loading={guardando} onClick={guardar} className="flex-1 justify-center"
                        style={{ background: 'rgba(96,165,250,0.2)', border: '1px solid rgba(96,165,250,0.4)' }}>
                        <UserCheck size={15} /> Asignar
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
                            const rolM = ROL_META[a.rol_en_proyecto] || { label: a.rol_en_proyecto, color: '#94a3b8' };
                            return (
                                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl group"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold text-white"
                                        style={{ background: rolM.color + '20', border: `1px solid ${rolM.color}30` }}>
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
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                                                style={{ background: rolM.color + '15', color: rolM.color }}>
                                                {rolM.label}
                                            </span>
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
                                        const rolM = ROL_META[a.rol_en_proyecto] || { label: a.rol_en_proyecto, color: '#64748b' };
                                        return (
                                            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50"
                                                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-slate-400"
                                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    {a.personal?.nombre?.[0]?.toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-400">{a.personal?.nombre} {a.personal?.apellido_paterno}</p>
                                                    <p className="text-[10px] text-slate-600">{rolM.label} · Finalizado {a.fecha_fin || ''}</p>
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
                HERO HEADER
            ═══════════════════════════════════════════════════ */}
            <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
                style={{
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.95) 100%)',
                    border: `1px solid ${estadoM.border}`,
                    boxShadow: `0 0 60px ${estadoM.color}10`,
                }}>
                {/* glow orb */}
                <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-[0.06] blur-3xl pointer-events-none"
                    style={{ background: estadoM.color }} />

                <div className="flex flex-col xl:flex-row xl:items-start gap-5">
                    {/* Left: nombre + metadata */}
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{proyecto.nombre}</h1>
                            <EstadoPill estado={proyecto.estado} />
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                                style={{ background: esSocial ? 'rgba(34,211,238,0.1)' : 'rgba(167,139,250,0.1)', border: `1px solid ${esSocial ? 'rgba(34,211,238,0.25)' : 'rgba(167,139,250,0.25)'}`, color: esSocial ? '#22d3ee' : '#a78bfa' }}>
                                {esSocial ? 'Social' : 'Privado'}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                            <span className="font-mono text-slate-400">{proyecto.codigo}</span>
                            {proyecto.prioridad && <span className="capitalize">{proyecto.prioridad}</span>}
                            {contraparte && (
                                <span className="flex items-center gap-1">
                                    <Building size={11} /> {contraparte}
                                </span>
                            )}
                            {proyecto.zona && (
                                <span className="flex items-center gap-1"><MapPin size={11} /> {proyecto.zona.nombre}</span>
                            )}
                            {proyecto.fecha_inicio_planificada && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={11} />
                                    {proyecto.fecha_inicio_planificada} → {proyecto.fecha_fin_planificada ?? '?'}
                                </span>
                            )}
                        </div>

                        {/* Responsable */}
                        {proyecto.responsable && (
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                                    style={{ background: 'rgba(52,211,153,0.2)' }}>
                                    {proyecto.responsable.nombre?.[0]?.toUpperCase()}
                                </div>
                                <span className="text-xs text-slate-400">{proyecto.responsable.nombre} {proyecto.responsable.apellido_paterno}</span>
                                <span className="text-[10px] text-slate-600">· Responsable</span>
                            </div>
                        )}

                        {/* Avance global grande */}
                        <div className="space-y-2">
                            <div className="flex items-end justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-500 uppercase tracking-wide">Avance Real</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black" style={{ color: avanceColor }}>{pctAvance.toFixed(1)}</span>
                                        <span className="text-xl font-bold text-slate-400">%</span>
                                    </div>
                                    {avance.porcentaje_plazo != null && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-slate-500">Esperado por tiempo:</span>
                                            <span className={`text-[10px] font-bold ${pctAvance >= (avance.porcentaje_plazo ?? 0) ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {(avance.porcentaje_plazo ?? 0).toFixed(1)}%
                                            </span>
                                            {pctAvance < (avance.porcentaje_plazo ?? 0) && (
                                                <span className="text-[10px] text-red-400">
                                                    (−{((avance.porcentaje_plazo ?? 0) - pctAvance).toFixed(1)}% atrás)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right text-xs text-slate-500">
                                    <div>{avance.unidades_completadas}/{avance.total_unidades} {esSocial ? 'viviendas' : 'fases'}</div>
                                    {(proyecto.monto_contractual || proyecto.presupuesto_referencial) && (
                                        <div className="text-slate-600">Bs. {parseFloat(proyecto.monto_contractual || proyecto.presupuesto_referencial).toLocaleString('es-BO')}</div>
                                    )}
                                </div>
                            </div>
                            <ProgressBar pct={pctAvance} color={avanceColor} height="10px" />
                            {avance.porcentaje_plazo != null && (
                                <ProgressBar pct={avance.porcentaje_plazo ?? 0} color="rgba(148,163,184,0.35)" height="4px" />
                            )}
                        </div>
                    </div>

                    {/* Right: plazo + KPIs + acciones */}
                    <div className="xl:w-72 shrink-0 space-y-4">
                        {/* Plazo */}
                        {avance.dias_totales != null && (
                            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                                    <span>Plazo transcurrido</span>
                                    <span className={avance.hay_retraso ? 'text-red-400 font-bold' : 'text-slate-400'}>
                                        Día {avance.dias_transcurridos} de {avance.dias_totales}
                                    </span>
                                </div>
                                <ProgressBar pct={avance.porcentaje_plazo ?? 0} color={avance.hay_retraso ? '#f87171' : '#60a5fa'} height="6px" />
                                {avance.hay_retraso && (
                                    <div className="flex items-center gap-1 mt-1.5 text-[10px] text-red-400">
                                        <AlertTriangle size={10} /> Proyecto con retraso
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Acciones */}
                        <div className="flex flex-wrap gap-2">
                            {canEdit && (
                                <button onClick={() => navigate(`/dashboard/proyectos/${id}/editar`)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Edit size={14} /> Editar
                                </button>
                            )}
                            {transiciones_permitidas.length > 0 && (
                                <button onClick={() => setModalEstado(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                                    style={{ background: estadoM.bg, border: `1px solid ${estadoM.border}`, color: estadoM.color }}>
                                    <Activity size={14} /> Estado
                                </button>
                            )}
                            <ExportarDropdown proyectoId={id} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════
                SALUD FINANCIERA
            ═══════════════════════════════════════════════════ */}
            <SaludFinancieraCard proyecto={proyecto} canEdit={canEdit} onRefresh={cargar} />

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
                MATRIZ ÍTEMS × PRODUCTOS
            ═══════════════════════════════════════════════════ */}
            <MatrizItemsProductosSection proyectoId={id} canEdit={canEdit} />

            {/* ══════════════════════════════════════════════════
                PRESUPUESTO DE MATERIALES
            ═══════════════════════════════════════════════════ */}
            <PresupuestoMaterialesSection proyectoId={id} canEdit={canEdit} />

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
    const [matriz, setMatriz]         = useState(null);
    const [loading, setLoading]       = useState(true);
    const [asignando, setAsignando]   = useState({});
    const [autoAsign, setAutoAsign]   = useState(false);
    const [expandido, setExpandido]   = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const data = await proyectoService.obtenerMatrizItemsProductos(proyectoId);
            setMatriz(data);
            // Auto-expand if there are unassigned items
            if ((data?.totales?.items_sin_asignar ?? 0) > 0) setExpandido(true);
        } catch { /* items section may not exist yet */ }
        finally { setLoading(false); }
    }, [proyectoId]);

    useEffect(() => { cargar(); }, [cargar]);

    if (loading) return (
        <GlassCard className="p-5">
            <div className="flex items-center gap-2 mb-2">
                <Table2 size={15} className="text-slate-500" />
                <span className="text-sm font-bold text-white">Matriz Items × Productos</span>
            </div>
            <Skeleton height="80px" className="rounded-xl" />
        </GlassCard>
    );

    if (!matriz || !matriz.items || matriz.items.length === 0) return null;

    const { hitos = [], items = [], totales = {} } = matriz;

    const handleAsignar = async (itemId, hitoCobro_id) => {
        setAsignando(p => ({ ...p, [itemId]: true }));
        try {
            await proyectoService.asignarItemAProducto(proyectoId, itemId, hitoCobro_id || null);
            await cargar();
        } catch { toast.error('Error al asignar ítem'); }
        finally { setAsignando(p => ({ ...p, [itemId]: false })); }
    };

    const handleAutoAsignar = async () => {
        setAutoAsign(true);
        try {
            const r = await proyectoService.asignacionAutomatica(proyectoId);
            toast.success(r.message || 'Asignación automática completada');
            await cargar();
        } catch { toast.error('Error en asignación automática'); }
        finally { setAutoAsign(false); }
    };

    const pctAsignados = totales.items_total > 0 ? Math.round(totales.items_asignados / totales.items_total * 100) : 0;

    return (
        <GlassCard className="p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <button onClick={() => setExpandido(p => !p)} className="flex items-center gap-2 group">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                        <Table2 size={14} className="text-blue-400" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-200">Matriz Ítems × Productos</h3>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
                </button>
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                    <span className="text-[11px] text-slate-500">
                        {totales.items_asignados}/{totales.items_total} asignados
                        <span className="text-blue-400 font-semibold ml-1">({pctAsignados}%)</span>
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

            {/* Progress bar */}
            <div className="h-1.5 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pctAsignados}%`, background: '#60a5fa' }} />
            </div>

            {!expandido ? null : (
                <>
                    {/* Productos legend */}
                    {hitos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {hitos.map((h, i) => {
                                const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24'];
                                const c = colors[i % colors.length];
                                return (
                                    <span key={h.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: c + '20', color: c, border: `1px solid ${c}40` }}>
                                        {h.nombre} · {parseFloat(h.porcentaje_contrato ?? 0).toFixed(0)}%
                                    </span>
                                );
                            })}
                            <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-600" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                Sin asignar ({totales.items_sin_asignar})
                            </span>
                        </div>
                    )}

                    {/* Items table */}
                    <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-[10px] text-slate-600 uppercase tracking-wide">
                                    <th className="text-left pb-2 pl-1">Ítem</th>
                                    <th className="text-left pb-2">Unidad</th>
                                    <th className="text-right pb-2">Cantidad</th>
                                    {hitos.length > 0 && <th className="text-left pb-2 pl-2">Producto</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {items.map(item => {
                                    const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24'];
                                    const hitoIdx = hitos.findIndex(h => h.id === item.hito_cobro_id);
                                    const c = hitoIdx >= 0 ? colors[hitoIdx % colors.length] : null;
                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="py-1.5 pl-1">
                                                <div className="flex items-center gap-1.5">
                                                    {item.item_constructivo?.categoria?.color && (
                                                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.item_constructivo.categoria.color }} />
                                                    )}
                                                    <span className="text-slate-300 font-medium truncate max-w-[180px]">
                                                        {item.item_constructivo?.nombre ?? `Ítem #${item.id}`}
                                                    </span>
                                                    {item.vivienda && (
                                                        <span className="text-slate-600 shrink-0">· {item.vivienda.codigo}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-1.5 text-slate-500">{item.item_constructivo?.unidad_base ?? '—'}</td>
                                            <td className="py-1.5 text-right text-slate-400">{parseFloat(item.cantidad_planificada ?? 0).toFixed(2)}</td>
                                            {hitos.length > 0 && (
                                                <td className="py-1.5 pl-2">
                                                    {asignando[item.id] ? (
                                                        <span className="text-slate-600 text-[10px]">Guardando…</span>
                                                    ) : canEdit ? (
                                                        <select value={item.hito_cobro_id ?? ''}
                                                            onChange={e => handleAsignar(item.id, e.target.value ? parseInt(e.target.value) : null)}
                                                            className="px-1.5 py-0.5 rounded-lg text-[10px] outline-none cursor-pointer"
                                                            style={{ background: c ? c + '20' : 'rgba(255,255,255,0.05)', color: c ?? '#94a3b8', border: `1px solid ${c ? c + '40' : 'rgba(255,255,255,0.1)'}` }}>
                                                            <option value="">— Sin asignar —</option>
                                                            {hitos.map((h, i) => (
                                                                <option key={h.id} value={h.id} style={{ background: '#0f172a' }}>{h.nombre}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background: c ? c + '20' : 'rgba(255,255,255,0.04)', color: c ?? '#64748b' }}>
                                                            {item.hito_cobro?.nombre ?? '—'}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    <Package size={16} className="text-violet-400" />
                    <h3 className="text-sm font-bold text-white">Trazabilidad de Materiales</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 font-medium">
                        {totales.total_materiales} ítems
                    </span>
                    {totales.materiales_con_desfase > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold flex items-center gap-1">
                            <AlertTriangle size={12} /> {totales.materiales_con_desfase} con desfase
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
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

            {/* Buscador inline */}
            {items.length > 5 && (
                <div className="relative mb-3">
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
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 z-10" style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)' }}>
                            <tr className="border-b border-white/10">
                                <th className="text-left text-slate-400 py-3 px-3 font-semibold">Material</th>
                                <th className="text-right text-slate-400 py-3 px-2 font-semibold">Planificado</th>
                                <th className="text-right text-blue-400 py-3 px-2 font-semibold">Comprado</th>
                                <th className="text-right text-sky-400 py-3 px-2 font-semibold">En Almacén</th>
                                <th className="text-right text-purple-400 py-3 px-2 font-semibold">Devuelto</th>
                                <th className="text-right text-emerald-400 py-3 px-2 font-semibold">Entregado</th>
                                <th className="text-right text-orange-400 py-3 px-2 font-semibold">Merma/Retr.</th>
                                <th className="text-center text-slate-400 py-3 px-2 font-semibold" title="Identidad Contable: Comprado = EnAlmacen + Devuelto + Entregado + Merma">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {itemsFiltrados.map(item => {
                                const catColor = item.material?.categoria?.color || '#6366f1';
                                const desfase = parseFloat(item.desfase) !== 0;
                                const openModal = (tipo) => setModalInfo({ isOpen: true, material: item.material, tipo });
                                
                                return (
                                    <tr key={item.id} className="hover:bg-white/[0.03] transition-colors group">
                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: catColor, boxShadow: `0 0 8px ${catColor}` }} />
                                                <span className="text-white font-medium truncate max-w-[150px]">{item.material?.nombre}</span>
                                            </div>
                                            <div className="text-slate-500 text-[10px] pl-4">{item.material?.codigo} · {item.material?.unidadMedida?.simbolo}</div>
                                        </td>
                                        <td className="py-2 px-2 text-right text-slate-300 font-medium">
                                            {Number(item.planificado || item.cantidad_total_planificada).toFixed(2)}
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <button onClick={() => openModal('compras')} className="text-blue-300 font-bold hover:text-blue-200 hover:underline transition-all">
                                                {Number(item.comprado || 0).toFixed(2)}
                                            </button>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <span className="text-sky-300 font-bold">
                                                {Number(item.en_almacen || 0).toFixed(2)}
                                            </span>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <button onClick={() => openModal('transferencias')} className="text-purple-300 font-bold hover:text-purple-200 hover:underline transition-all">
                                                {Number(item.devuelto_central || 0).toFixed(2)}
                                            </button>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <button onClick={() => openModal('entregas')} className="text-emerald-300 font-bold hover:text-emerald-200 hover:underline transition-all">
                                                {Number(item.entregado_obra || 0).toFixed(2)}
                                            </button>
                                        </td>
                                        <td className="py-2 px-2 text-right">
                                            <button onClick={() => openModal('mermas')} className="text-orange-300 font-bold hover:text-orange-200 hover:underline transition-all">
                                                {Number((parseFloat(item.merma) || 0) + (parseFloat(item.retrabajo) || 0)).toFixed(2)}
                                            </button>
                                        </td>
                                        <td className="py-2 px-2 text-center">
                                            {desfase ? (
                                                <div className="flex items-center justify-center gap-1 text-red-400 font-bold" title={`Desfase de ${item.desfase}`}>
                                                    <AlertTriangle size={14} />
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center text-emerald-500" title="Identidad Contable OK">
                                                    <Check size={14} />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {busqueda && itemsFiltrados.length === 0 && (
                        <p className="text-slate-600 text-xs py-4 text-center">Sin resultados para "{busqueda}"</p>
                    )}
                </div>
            )}
            
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
