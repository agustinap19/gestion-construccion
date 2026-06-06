import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import competenciaService from '../../../services/competenciaService';
import PageHeader from '../../../components/layout/PageHeader';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import Skeleton from '../../../components/ui/Skeleton';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { Award, Plus, Edit, Trash, RefreshCw, CheckCircle, X, ChevronDown } from '../../../components/icons/Icons';

const TIPOS = [
    { id: 'tecnico',       label: 'Técnico' },
    { id: 'seguridad',     label: 'Seguridad' },
    { id: 'laboral',       label: 'Laboral' },
    { id: 'certificacion', label: 'Certificación' },
    { id: 'otro',          label: 'Otro' },
];

const TIPO_COLORS = {
    tecnico:       'info',
    seguridad:     'danger',
    laboral:       'success',
    certificacion: 'warning',
    otro:          'neutral',
};

const tipoLabel = (t) => TIPOS.find(x => x.id === t)?.label ?? t;

// Glass select dropdown
const GlassSelect = ({ value, onChange, options, placeholder, hasErr, disabled }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => String(o.id) === String(value));

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={() => !disabled && setOpen(v => !v)}
                className={[
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm outline-none text-left transition-all duration-200',
                    'bg-white border-slate-200 text-slate-900 dark:bg-slate-900/50 dark:border-slate-700/50 dark:text-slate-200',
                    hasErr ? 'ring-2 ring-red-500/40 border border-red-500/30' : 'border focus:ring-2 focus:ring-emerald-500/30',
                    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}>
                <span className="flex-1">{selected ? selected.label : <span className="text-slate-400">{placeholder}</span>}</span>
                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="absolute left-0 top-full mt-1 w-full z-[100] rounded-xl overflow-hidden"
                    style={{ background: 'rgba(8,12,26,0.99)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 16px 40px rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)' }}>
                    {options.map(opt => (
                        <button key={opt.id} type="button"
                            onClick={() => { onChange(opt.id); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-all"
                            style={{
                                color: String(value) === String(opt.id) ? '#34d399' : '#cbd5e1',
                                background: String(value) === String(opt.id) ? 'rgba(16,185,129,0.18)' : 'transparent',
                            }}
                            onMouseEnter={e => { if (String(value) !== String(opt.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                            onMouseLeave={e => { if (String(value) !== String(opt.id)) e.currentTarget.style.background = 'transparent'; }}>
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Modal glass para crear/editar
const CompetenciaModal = ({ competencia, onClose, onSuccess }) => {
    const isEdit = !!competencia;
    const [form, setForm] = useState({
        nombre:              competencia?.nombre ?? '',
        descripcion:         competencia?.descripcion ?? '',
        tipo:                competencia?.tipo ?? '',
        requiere_renovacion: competencia?.requiere_renovacion ?? false,
        vigencia_meses:      competencia?.vigencia_meses ?? '',
    });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const validar = () => {
        const e = {};
        if (!form.nombre.trim()) e.nombre = 'Obligatorio';
        if (!form.tipo) e.tipo = 'Obligatorio';
        if (form.requiere_renovacion && !form.vigencia_meses) e.vigencia_meses = 'Obligatorio cuando requiere renovación';
        if (form.vigencia_meses && (isNaN(form.vigencia_meses) || Number(form.vigencia_meses) < 1)) e.vigencia_meses = 'Debe ser un número mayor a 0';
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        try {
            setGuardando(true);
            const datos = {
                nombre:              form.nombre.trim(),
                descripcion:         form.descripcion.trim() || null,
                tipo:                form.tipo,
                requiere_renovacion: form.requiere_renovacion,
                vigencia_meses:      form.requiere_renovacion && form.vigencia_meses ? Number(form.vigencia_meses) : null,
            };
            if (isEdit) await competenciaService.actualizar(competencia.id, datos);
            else await competenciaService.crear(datos);
            toast.success(isEdit ? 'Competencia actualizada' : 'Competencia creada');
            onSuccess();
            onClose();
        } catch (e) {
            const data = e.response?.data;
            if (data?.errors) setErrores(data.errors);
            else toast.error(data?.message ?? 'Error al guardar');
        } finally { setGuardando(false); }
    };

    const inputCls = (name) => [
        'w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
        'bg-white border-slate-200 text-slate-900 dark:bg-slate-900/50 dark:border-slate-700/50 dark:text-slate-200',
        errores[name] ? 'ring-2 ring-red-500/40 border border-red-500/30' : 'border focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40',
    ].join(' ');

    // Glass overlay
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="w-full max-w-lg rounded-2xl overflow-visible"
                style={{
                    background: 'rgba(12,18,36,0.92)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                            <Award size={18} style={{ color: '#34d399' }} />
                        </div>
                        <h2 className="text-base font-bold text-white">{isEdit ? 'Editar Competencia' : 'Nueva Competencia'}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                            Nombre <span className="text-red-400">*</span>
                        </label>
                        <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                            placeholder="Ej: Soldadura MIG, Trabajo en Altura…" className={inputCls('nombre')} />
                        {errores.nombre && <p className="text-xs text-red-400 mt-1">{errores.nombre}</p>}
                    </div>

                    {/* Tipo */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                            Tipo <span className="text-red-400">*</span>
                        </label>
                        <GlassSelect value={form.tipo} onChange={v => set('tipo', v)}
                            options={TIPOS} placeholder="Seleccionar tipo…" hasErr={!!errores.tipo} />
                        {errores.tipo && <p className="text-xs text-red-400 mt-1">{errores.tipo}</p>}
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">Descripción</label>
                        <textarea value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                            rows={2} placeholder="Descripción opcional…"
                            className={inputCls('descripcion') + ' resize-none'} />
                    </div>

                    {/* Requiere renovación */}
                    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="relative flex-shrink-0">
                            <input type="checkbox" checked={form.requiere_renovacion}
                                onChange={e => { set('requiere_renovacion', e.target.checked); if (!e.target.checked) set('vigencia_meses', ''); }}
                                className="sr-only" />
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${form.requiere_renovacion ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-600'}`}>
                                {form.requiere_renovacion && <CheckCircle size={13} className="text-white" />}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-200">Requiere renovación periódica</p>
                            <p className="text-xs text-slate-500">Habilita el control de vencimiento por meses</p>
                        </div>
                    </label>

                    {/* Vigencia meses */}
                    {form.requiere_renovacion && (
                        <div className="animate-fade-in">
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                                Vigencia (meses) <span className="text-red-400">*</span>
                            </label>
                            <input type="number" min="1" max="600" value={form.vigencia_meses}
                                onChange={e => set('vigencia_meses', e.target.value)}
                                placeholder="12" className={inputCls('vigencia_meses')} />
                            {errores.vigencia_meses && <p className="text-xs text-red-400 mt-1">{errores.vigencia_meses}</p>}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                    <button type="button" onClick={onClose} disabled={guardando}
                        className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 transition-all"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Cancelar
                    </button>
                    <button type="button" onClick={handleGuardar} disabled={guardando}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.9),rgba(5,150,105,0.85))', boxShadow: '0 4px 16px rgba(16,185,129,0.25)' }}>
                        {guardando ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear competencia')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CompetenciasPage = () => {
    const { user } = useAuth();
    const [competencias, setCompetencias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [paginacion, setPaginacion] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [modal, setModal] = useState(null); // null | { competencia: object|null }
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);
    const [eliminando, setEliminando] = useState(false);

    const cargar = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            const params = { page };
            if (busqueda) params.busqueda = busqueda;
            if (filtroTipo) params.tipo = filtroTipo;
            const res = await competenciaService.listar(params, 20);
            const d = res.data;
            setCompetencias(d.data ?? []);
            setPaginacion({ current_page: d.current_page, last_page: d.last_page, total: d.total });
        } catch {
            toast.error('Error al cargar competencias');
        } finally {
            setLoading(false);
        }
    }, [busqueda, filtroTipo]);

    useEffect(() => { cargar(); }, [cargar]);

    useEffect(() => {
        const t = setTimeout(() => cargar(), 350);
        return () => clearTimeout(t);
    }, [busqueda, filtroTipo]);

    const handleEliminar = async () => {
        try {
            setEliminando(true);
            await competenciaService.eliminar(confirmarEliminar.id);
            toast.success('Competencia eliminada');
            setConfirmarEliminar(null);
            cargar(paginacion.current_page);
        } catch (e) {
            toast.error(e.response?.data?.message ?? 'Error al eliminar');
        } finally {
            setEliminando(false);
        }
    };

    const renderPaginacion = () => {
        if (paginacion.last_page <= 1) return null;
        const pages = Array.from({ length: paginacion.last_page }, (_, i) => i + 1);
        return (
            <div className="flex items-center justify-between mt-6">
                <span className="text-sm text-slate-500 dark:text-slate-400">Total: {paginacion.total} competencias</span>
                <div className="flex gap-1">
                    {pages.map(p => (
                        <button key={p} onClick={() => cargar(p)}
                            className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === paginacion.current_page
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
            <PageHeader
                title="Catálogo de Competencias"
                subtitle="Gestiona las competencias y certificaciones del sistema"
                icon={<Award size={24} className="text-emerald-600 dark:text-emerald-400" />}
                actions={
                    <Button leftIcon={<Plus size={18} />} onClick={() => setModal({ competencia: null })}>
                        Nueva Competencia
                    </Button>
                }
            />

            {/* Filtros */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
                <SearchInput value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre o tipo…" className="w-full sm:w-72" />
                <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
                    className="h-[42px] px-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-sm text-slate-900 dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-600/50">
                    <option value="">Todos los tipos</option>
                    {TIPOS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                {(busqueda || filtroTipo) && (
                    <Button variant="ghost" size="sm" onClick={() => { setBusqueda(''); setFiltroTipo(''); }}>
                        Limpiar filtros
                    </Button>
                )}
                <span className="text-sm text-slate-500 dark:text-slate-400 ml-auto">
                    {paginacion.total} competencia{paginacion.total !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-hidden">
                    <div className="p-4 space-y-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} width="100%" height="3rem" />
                        ))}
                    </div>
                </div>
            ) : competencias.length === 0 ? (
                <EmptyState
                    icon={<Award size={32} />}
                    title="No hay competencias"
                    description={busqueda || filtroTipo ? 'Ninguna competencia coincide con los filtros.' : 'Crea la primera competencia del catálogo.'}
                    action={<Button leftIcon={<Plus size={16} />} onClick={() => setModal({ competencia: null })}>Nueva Competencia</Button>}
                />
            ) : (
                <div className="bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800/50">
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium">Nombre</th>
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium">Tipo</th>
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium">Renovación</th>
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium">Vigencia</th>
                                <th className="p-4 text-left text-slate-500 dark:text-slate-400 font-medium">Descripción</th>
                                <th className="p-4 w-24"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {competencias.map(c => (
                                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="p-4">
                                        <span className="font-medium text-slate-900 dark:text-white">{c.nombre}</span>
                                    </td>
                                    <td className="p-4">
                                        <Badge variant={TIPO_COLORS[c.tipo] ?? 'neutral'}>{tipoLabel(c.tipo)}</Badge>
                                    </td>
                                    <td className="p-4">
                                        {c.requiere_renovacion
                                            ? <Badge variant="warning">Sí</Badge>
                                            : <Badge variant="neutral">No</Badge>}
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">
                                        {c.requiere_renovacion && c.vigencia_meses ? `${c.vigencia_meses} meses` : '—'}
                                    </td>
                                    <td className="p-4 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                                        {c.descripcion || '—'}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setModal({ competencia: c })}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                                title="Editar">
                                                <Edit size={15} />
                                            </button>
                                            <button onClick={() => setConfirmarEliminar(c)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                                title="Eliminar">
                                                <Trash size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {renderPaginacion()}

            {/* Modal crear/editar */}
            {modal !== null && (
                <CompetenciaModal
                    competencia={modal.competencia}
                    onClose={() => setModal(null)}
                    onSuccess={() => cargar(paginacion.current_page)}
                />
            )}

            {/* Confirm eliminar */}
            <ConfirmDialog
                open={!!confirmarEliminar}
                onCancel={() => setConfirmarEliminar(null)}
                onConfirm={handleEliminar}
                title="Eliminar Competencia"
                confirmText="Eliminar"
                danger
                loading={eliminando}
                message={`¿Eliminar "${confirmarEliminar?.nombre}"? Solo es posible si no tiene asignaciones activas.`}
            />
        </div>
    );
};

export default CompetenciasPage;
