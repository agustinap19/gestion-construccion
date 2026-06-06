import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import rolService from '../../../services/rolService';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import SearchInput from '../../../components/ui/SearchInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import { Shield, X, Check, AlertTriangle, Key, ChevronLeft, ChevronRight } from '../../../components/icons/Icons';

const PERMISOS_CRITICOS = ['roles.crear', 'roles.eliminar', 'usuarios.crear', 'usuarios.eliminar'];

const glassInputCls = (hasError) => [
    'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'text-slate-100 placeholder-slate-600 bg-white/[0.04]',
    hasError
        ? 'ring-2 ring-red-500/40 border border-red-500/30'
        : 'border border-white/[0.08] hover:border-white/[0.14] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

/* ─── Stepper ─── */
const Stepper = ({ paso }) => {
    const labels = ['Información', 'Permisos', 'Revisión'];
    return (
        <div className="flex items-center justify-center">
            {labels.map((label, idx) => {
                const num = idx + 1;
                const activo = num === paso;
                const completado = num < paso;
                return (
                    <React.Fragment key={num}>
                        <div className="flex flex-col items-center">
                            <div className={[
                                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300',
                                completado
                                    ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                    : activo
                                        ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                                        : 'bg-white/[0.06] text-slate-500 border border-white/[0.10]',
                            ].join(' ')}>
                                {completado ? <Check size={13} /> : num}
                            </div>
                            <span className={`text-[11px] mt-1 font-medium whitespace-nowrap ${activo || completado ? 'text-emerald-400' : 'text-slate-600'}`}>
                                {label}
                            </span>
                        </div>
                        {idx < 2 && (
                            <div className={`w-14 sm:w-20 h-px mx-1.5 mb-5 rounded-full transition-colors duration-500 ${completado ? 'bg-emerald-500' : 'bg-white/[0.08]'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

/* ─── Main component ─── */
const CrearRol = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [paso, setPaso] = useState(1);

    const [form, setForm] = useState({ nombre_visible: '', descripcion: '' });
    const [errores, setErrores] = useState({});
    const [todosPermisos, setTodosPermisos] = useState({});
    const [rolesDisponibles, setRolesDisponibles] = useState([]);
    const [permisoIds, setPermisoIds] = useState([]);
    const [copiaDeRolId, setCopiaDeRolId] = useState('');
    const [busquedaPermisos, setBusquedaPermisos] = useState('');
    const [modulosAbiertos, setModulosAbiertos] = useState({});
    const [guardando, setGuardando] = useState(false);

    const esGerente = user?.rol?.nombre === 'gerente' || user?.rol?.nombre === 'super_admin';

    useEffect(() => {
        const cargar = async () => {
            try {
                const [permisosRes, rolesRes] = await Promise.all([
                    rolService.obtenerPermisosAgrupados(),
                    rolService.listar(),
                ]);
                setTodosPermisos(permisosRes.data || {});
                setRolesDisponibles(rolesRes.data?.data || []);
                const modulos = {};
                Object.keys(permisosRes.data || {}).forEach(m => { modulos[m] = true; });
                setModulosAbiertos(modulos);
            } catch { toast.error('Error al cargar datos'); }
        };
        cargar();
    }, []);

    const validarPaso1 = () => {
        const err = {};
        if (!form.nombre_visible.trim()) err.nombre_visible = 'El nombre es obligatorio';
        else if (form.nombre_visible.length > 50) err.nombre_visible = 'Máximo 50 caracteres';
        if (form.descripcion.length > 100) err.descripcion = 'Máximo 100 caracteres';
        setErrores(err);
        return Object.keys(err).length === 0;
    };

    const irPaso2 = () => { if (validarPaso1()) setPaso(2); };
    const irPaso3 = () => {
        if (permisoIds.length === 0) { toast.error('Selecciona al menos un permiso'); return; }
        setPaso(3);
    };

    const handleCopiarRol = (rolId) => {
        setCopiaDeRolId(rolId);
        if (!rolId) return;
        const r = rolesDisponibles.find(r => r.id === parseInt(rolId));
        if (r?.permisos) setPermisoIds(r.permisos.map(p => p.id));
    };

    const togglePermiso = (id) => setPermisoIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const toggleModulo = (permisos) => {
        const ids = permisos.map(p => p.id);
        const todos = ids.every(id => permisoIds.includes(id));
        setPermisoIds(p => todos ? p.filter(id => !ids.includes(id)) : [...new Set([...p, ...ids])]);
    };

    const tienePermisosCriticos = () => {
        const flat = Object.values(todosPermisos).flat();
        return permisoIds.some(id => PERMISOS_CRITICOS.includes(flat.find(p => p.id === id)?.codigo));
    };

    const permisosFiltrados = (permisos) => {
        if (!busquedaPermisos) return permisos;
        const b = busquedaPermisos.toLowerCase();
        return permisos.filter(p => p.nombre_visible.toLowerCase().includes(b));
    };

    const getResumen = () => {
        const flat = Object.values(todosPermisos).flat();
        const sel = flat.filter(p => permisoIds.includes(p.id));
        const map = {};
        sel.forEach(p => { map[p.modulo] = (map[p.modulo] || 0) + 1; });
        return { total: sel.length, modulos: Object.entries(map).sort((a, b) => b[1] - a[1]) };
    };

    const handleCrear = async () => {
        try {
            setGuardando(true);
            await rolService.crear({
                nombre_visible: form.nombre_visible,
                descripcion: form.descripcion || null,
                permiso_ids: permisoIds,
            });
            toast.success('Rol creado exitosamente');
            navigate('/dashboard/roles');
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al crear el rol';
            toast.error(msg);
            if (err.response?.data?.errors) { setErrores(err.response.data.errors); setPaso(1); }
        } finally { setGuardando(false); }
    };

    const cerrar = () => navigate('/dashboard/roles');

    /* modal width adjusts for step 2 (permissions grid) */
    const maxW = paso === 2 ? 'max-w-2xl' : 'max-w-lg';

    return (
        /* ── Backdrop ── */
        <div
            className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
            style={{ background: 'rgba(15,23,42,0.62)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
        >
            {/* ── Glass container ── */}
            <div
                className={`relative w-full ${maxW} my-auto rounded-2xl overflow-hidden animate-modal-in`}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'rgba(15,23,42,0.50)',
                    backdropFilter: 'blur(36px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.28), inset 0 0 0 0.5px rgba(255,255,255,0.05)',
                }}
            >
                {/* Top light reflection */}
                <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                    style={{ background: 'linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.28) 50%, transparent 92%)' }} />

                {/* Emerald glow top-left */}
                <div className="absolute top-0 left-0 w-72 h-40 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse at 15% 0%, rgba(52,211,153,0.08) 0%, transparent 65%)' }} />

                <div className="relative z-10 p-6 sm:p-8">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between mb-7">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.08))',
                                    border: '1px solid rgba(52,211,153,0.22)',
                                    boxShadow: '0 0 14px rgba(52,211,153,0.15)',
                                }}>
                                <Shield size={18} className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-100">Nuevo Rol</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Define permisos para un rol personalizado</p>
                            </div>
                        </div>
                        <button
                            onClick={cerrar}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 hover:bg-white/[0.10] transition-all duration-200"
                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* ── Stepper ── */}
                    <div className="mb-8">
                        <Stepper paso={paso} />
                    </div>

                    {/* ── Paso 1: Información ── */}
                    {paso === 1 && (
                        <div className="animate-fade-in space-y-5">
                            {/* Nombre */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                                    Nombre del rol
                                </label>
                                <input
                                    value={form.nombre_visible}
                                    onChange={e => {
                                        setForm(p => ({ ...p, nombre_visible: e.target.value }));
                                        if (errores.nombre_visible) setErrores(p => ({ ...p, nombre_visible: '' }));
                                    }}
                                    maxLength={50}
                                    placeholder="Ej. Supervisor de Obra"
                                    className={glassInputCls(!!errores.nombre_visible)}
                                />
                                <div className="flex items-center justify-between mt-1.5 px-0.5">
                                    {errores.nombre_visible
                                        ? <p className="text-xs text-red-400">{errores.nombre_visible}</p>
                                        : <span />}
                                    <span className={`text-xs ${form.nombre_visible.length > 45 ? 'text-amber-400' : 'text-slate-600'}`}>
                                        {form.nombre_visible.length}/50
                                    </span>
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                                    Descripción <span className="normal-case font-normal text-slate-600">(opcional)</span>
                                </label>
                                <textarea
                                    value={form.descripcion}
                                    onChange={e => {
                                        setForm(p => ({ ...p, descripcion: e.target.value }));
                                        if (errores.descripcion) setErrores(p => ({ ...p, descripcion: '' }));
                                    }}
                                    placeholder="Describe el propósito de este rol..."
                                    rows={3}
                                    maxLength={100}
                                    className={`${glassInputCls(!!errores.descripcion)} resize-none`}
                                />
                                <div className="flex items-center justify-between mt-1.5 px-0.5">
                                    {errores.descripcion
                                        ? <p className="text-xs text-red-400">{errores.descripcion}</p>
                                        : <span />}
                                    <span className={`text-xs ${form.descripcion.length > 90 ? 'text-amber-400' : 'text-slate-600'}`}>
                                        {form.descripcion.length}/100
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={irPaso2}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                                    style={{
                                        background: 'rgba(16,185,129,0.85)',
                                        border: '1px solid rgba(52,211,153,0.30)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(16,185,129,0.30)',
                                    }}
                                >
                                    Siguiente <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Paso 2: Permisos ── */}
                    {paso === 2 && (
                        <div className="animate-fade-in space-y-4">
                            {/* Copiar rol */}
                            <div className="p-4 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-xs font-medium text-slate-500 mb-2">Copiar permisos de un rol existente (opcional)</p>
                                <CustomSelect
                                    value={copiaDeRolId}
                                    onChange={handleCopiarRol}
                                    options={[
                                        { value: '', label: 'Empezar desde cero' },
                                        ...rolesDisponibles.map(r => ({ value: String(r.id), label: `${r.nombre_visible} (${r.permisos?.length || 0} permisos)` })),
                                    ]}
                                />
                            </div>

                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <SearchInput value={busquedaPermisos} onChange={setBusquedaPermisos} placeholder="Buscar permiso..." className="flex-1 min-w-[180px]" />
                                <span className="text-xs text-emerald-400 flex items-center gap-1.5 shrink-0"
                                    style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', borderRadius: '9999px', padding: '3px 10px' }}>
                                    <Key size={11} /> {permisoIds.length} seleccionados
                                </span>
                            </div>

                            {tienePermisosCriticos() && !esGerente && (
                                <div className="p-3 rounded-xl flex items-start gap-2"
                                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.20)' }}>
                                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300">Has seleccionado permisos administrativos. Solo el Gerente puede asignarlos.</p>
                                </div>
                            )}

                            <div className="space-y-2 max-h-[42vh] overflow-y-auto scrollbar-thin pr-1">
                                {Object.entries(todosPermisos).map(([modulo, permisos]) => {
                                    const filtrados = permisosFiltrados(permisos);
                                    if (!filtrados.length) return null;
                                    const ids = permisos.map(p => p.id);
                                    const todos = ids.every(id => permisoIds.includes(id));
                                    const algunos = ids.some(id => permisoIds.includes(id)) && !todos;

                                    return (
                                        <div key={modulo} className="rounded-xl overflow-hidden"
                                            style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <button
                                                onClick={() => setModulosAbiertos(p => ({ ...p, [modulo]: !p[modulo] }))}
                                                className="w-full flex items-center justify-between px-4 py-2.5 transition-colors"
                                                style={{ background: 'rgba(255,255,255,0.03)' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" checked={todos}
                                                        ref={el => { if (el) el.indeterminate = algunos; }}
                                                        onChange={() => toggleModulo(permisos)}
                                                        onClick={e => e.stopPropagation()}
                                                        className="w-4 h-4 rounded border-white/20 text-emerald-500 cursor-pointer accent-emerald-500" />
                                                    <span className="text-sm font-semibold text-slate-200 capitalize">{modulo}</span>
                                                    <span className="text-[11px] text-slate-600 px-1.5 py-0.5 rounded-md"
                                                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                        {permisos.length}
                                                    </span>
                                                </div>
                                                <svg className={`w-4 h-4 text-slate-500 transition-transform ${modulosAbiertos[modulo] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>

                                            {modulosAbiertos[modulo] && (
                                                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-1"
                                                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    {filtrados.map(p => {
                                                        const esCritico = PERMISOS_CRITICOS.includes(p.codigo);
                                                        return (
                                                            <label key={p.id}
                                                                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-150 hover:bg-white/[0.04]"
                                                                style={esCritico ? { borderLeft: '2px solid rgba(245,158,11,0.5)', paddingLeft: '8px' } : {}}>
                                                                <input type="checkbox"
                                                                    checked={permisoIds.includes(p.id)}
                                                                    onChange={() => togglePermiso(p.id)}
                                                                    className="w-4 h-4 rounded border-white/20 text-emerald-500 cursor-pointer shrink-0 accent-emerald-500" />
                                                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                                                    {p.nombre_visible}
                                                                    {esCritico && (
                                                                        <span className="text-[10px] text-amber-400 px-1.5 py-0.5 rounded"
                                                                            style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.20)' }}>
                                                                            Crítico
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between pt-3"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button onClick={() => setPaso(1)}
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <button
                                    onClick={irPaso3}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
                                    style={{
                                        background: 'rgba(16,185,129,0.85)',
                                        border: '1px solid rgba(52,211,153,0.30)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(16,185,129,0.30)',
                                    }}
                                >
                                    Siguiente <ChevronRight size={15} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Paso 3: Revisión ── */}
                    {paso === 3 && (
                        <div className="animate-fade-in space-y-4">
                            {/* Info */}
                            <div className="p-4 rounded-xl"
                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em] mb-3">Información</p>
                                <p className="font-bold text-slate-100 text-base">{form.nombre_visible}</p>
                                {form.descripcion && <p className="text-sm text-slate-400 mt-1">{form.descripcion}</p>}
                            </div>

                            {/* Permisos resumen */}
                            <div className="p-4 rounded-xl"
                                style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.08em]">Permisos asignados</p>
                                    <span className="text-xs text-emerald-400 font-semibold">{getResumen().total} permisos</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {getResumen().modulos.map(([mod, cnt]) => (
                                        <div key={mod} className="flex items-center gap-2 text-sm">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                            <span className="capitalize text-slate-300">{mod}</span>
                                            <span className="text-slate-600 text-xs">({cnt})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {tienePermisosCriticos() && (
                                <div className="p-3 rounded-xl flex gap-2"
                                    style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.20)' }}>
                                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-300">
                                        {esGerente ? 'Este rol incluye permisos críticos.' : 'Solo el Gerente puede crear roles con permisos críticos.'}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between pt-3"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <button onClick={() => setPaso(2)}
                                    className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors">
                                    <ChevronLeft size={14} /> Anterior
                                </button>
                                <button
                                    onClick={handleCrear}
                                    disabled={guardando || (tienePermisosCriticos() && !esGerente)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'rgba(16,185,129,0.85)',
                                        border: '1px solid rgba(52,211,153,0.30)',
                                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(16,185,129,0.30)',
                                    }}
                                >
                                    {guardando
                                        ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando...</>
                                        : <><Check size={14} /> Crear rol</>
                                    }
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CrearRol;
