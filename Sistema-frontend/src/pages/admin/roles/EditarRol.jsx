import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import rolService from '../../../services/rolService';
import Badge from '../../../components/ui/Badge';
import Skeleton from '../../../components/ui/Skeleton';
import { Shield, X, Check, Info, Save, ArrowLeft } from '../../../components/icons/Icons';

/* ─── Glass field component ─── */
const GlassField = ({ label, error, counter, children }) => (
    <div>
        {label && (
            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.08em] mb-1.5">
                {label}
            </label>
        )}
        {children}
        {(error || counter) && (
            <div className="flex items-center justify-between mt-1.5 px-0.5">
                {error ? <p className="text-xs text-red-400">{error}</p> : <span />}
                {counter}
            </div>
        )}
    </div>
);

const glassInputCls = (hasError) => [
    'w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200',
    'text-slate-100 placeholder-slate-600 bg-white/[0.04]',
    hasError
        ? 'ring-2 ring-red-500/40 border border-red-500/30'
        : 'border border-white/[0.08] hover:border-white/[0.14] focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/40',
].join(' ');

const EditarRol = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [rol, setRol] = useState(null);
    const [form, setForm] = useState({ nombre_visible: '', descripcion: '' });
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const [confirmando, setConfirmando] = useState(false);

    const cargarRol = useCallback(async () => {
        try {
            setLoading(true);
            const res = await rolService.obtener(id);
            const r = res.data.rol;
            setRol(r);
            setForm({ nombre_visible: r.nombre_visible, descripcion: r.descripcion || '' });
        } catch {
            toast.error('No se pudo cargar el rol');
            navigate('/dashboard/roles');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => { cargarRol(); }, [cargarRol]);

    const validar = () => {
        const err = {};
        if (!form.nombre_visible.trim()) err.nombre_visible = 'El nombre es obligatorio';
        else if (form.nombre_visible.length > 50) err.nombre_visible = 'Máximo 50 caracteres';
        if (form.descripcion.length > 100) err.descripcion = 'Máximo 100 caracteres';
        setErrores(err);
        return Object.keys(err).length === 0;
    };

    const handleGuardar = async () => {
        if (!validar()) return;
        if (!confirmando) { setConfirmando(true); return; }
        try {
            setGuardando(true);
            await rolService.actualizar(id, form);
            toast.success('Rol actualizado');
            navigate(`/dashboard/roles/${id}`);
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al actualizar';
            toast.error(msg);
            if (err.response?.data?.errors) setErrores(err.response.data.errors);
        } finally {
            setGuardando(false);
            setConfirmando(false);
        }
    };

    const hayCambios = rol && (
        form.nombre_visible !== rol.nombre_visible ||
        form.descripcion !== (rol.descripcion || '')
    );

    const cerrar = () => navigate(`/dashboard/roles/${id}`);

    /* Backdrop + skeleton mientras carga */
    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(15,23,42,0.60)', backdropFilter: 'blur(10px)' }}>
                <div className="w-full max-w-lg rounded-2xl p-6 space-y-4"
                    style={{ background: 'rgba(15,23,42,0.50)', backdropFilter: 'blur(36px)', border: '1px solid rgba(255,255,255,0.10)' }}>
                    <Skeleton width="55%" height="1.4rem" />
                    <Skeleton width="100%" height="2.8rem" />
                    <Skeleton width="100%" height="5.5rem" />
                </div>
            </div>
        );
    }

    if (!rol) return null;

    return (
        /* ── Backdrop ── */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{ background: 'rgba(15,23,42,0.60)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
            onClick={e => { if (e.target === e.currentTarget) cerrar(); }}
        >
            {/* ── Modal glass container ── */}
            <div
                className="relative w-full max-w-lg rounded-2xl overflow-hidden animate-modal-in"
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'rgba(15,23,42,0.50)',
                    backdropFilter: 'blur(36px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(36px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 8px 32px rgba(0,0,0,0.30), inset 0 0 0 0.5px rgba(255,255,255,0.06)',
                }}
            >
                {/* Top light reflection */}
                <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.28) 50%, transparent 90%)' }} />

                {/* Subtle inner glow top-left */}
                <div className="absolute top-0 left-0 w-64 h-32 pointer-events-none rounded-tl-2xl"
                    style={{ background: 'radial-gradient(ellipse at 20% 0%, rgba(52,211,153,0.07) 0%, transparent 70%)' }} />

                <div className="relative z-10">
                    {/* ── Header ── */}
                    <div className="flex items-center justify-between px-6 py-5"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(52,211,153,0.18), rgba(16,185,129,0.08))',
                                    border: '1px solid rgba(52,211,153,0.22)',
                                    boxShadow: '0 0 12px rgba(52,211,153,0.15)',
                                }}>
                                <Shield size={16} className="text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-100 leading-tight">Editar rol</h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant={rol.es_sistema ? 'info' : 'tech'} className="scale-90 origin-left">
                                        {rol.es_sistema ? 'Sistema' : 'Personalizado'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={cerrar}
                            className="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-200 transition-all duration-200 hover:bg-white/[0.10]"
                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            <X size={13} />
                        </button>
                    </div>

                    {/* ── Body ── */}
                    <div className="px-6 py-6 space-y-5">
                        {/* Nombre */}
                        <GlassField
                            label="Nombre del rol"
                            error={errores.nombre_visible}
                            counter={
                                <span className={`text-xs ${form.nombre_visible.length > 45 ? 'text-amber-400' : 'text-slate-600'}`}>
                                    {form.nombre_visible.length}/50
                                </span>
                            }
                        >
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
                        </GlassField>

                        {/* Descripción */}
                        <GlassField
                            label={<>Descripción <span className="text-slate-600 normal-case font-normal">(opcional)</span></>}
                            error={errores.descripcion}
                            counter={
                                <span className={`text-xs ${form.descripcion.length > 90 ? 'text-amber-400' : 'text-slate-600'}`}>
                                    {form.descripcion.length}/100
                                </span>
                            }
                        >
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
                        </GlassField>

                        {/* Aviso rol sistema */}
                        {rol.es_sistema && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl"
                                style={{ background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)' }}>
                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-300 leading-relaxed">
                                    Rol del sistema — solo puedes editar nombre y descripción.
                                    Para cambiar permisos, ve al detalle.
                                </p>
                            </div>
                        )}

                        {/* Preview de cambios en modo confirmación */}
                        {confirmando && hayCambios && (
                            <div className="p-3 rounded-xl space-y-1.5"
                                style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)' }}>
                                <p className="text-xs font-semibold text-emerald-400 mb-1.5">Cambios a guardar:</p>
                                {form.nombre_visible !== rol.nombre_visible && (
                                    <div className="text-xs flex gap-2 items-center">
                                        <span className="text-slate-600 line-through">{rol.nombre_visible}</span>
                                        <span className="text-emerald-400">→ {form.nombre_visible}</span>
                                    </div>
                                )}
                                {form.descripcion !== (rol.descripcion || '') && (
                                    <p className="text-xs text-slate-500">Descripción actualizada</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Footer ── */}
                    <div className="flex items-center justify-between gap-3 px-6 py-4"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                        {/* Cancel */}
                        <button
                            onClick={cerrar}
                            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
                        >
                            <ArrowLeft size={14} />
                            Cancelar
                        </button>

                        <div className="flex items-center gap-2">
                            {confirmando && (
                                <button
                                    onClick={() => setConfirmando(false)}
                                    className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-200 transition-colors"
                                >
                                    Editar
                                </button>
                            )}

                            {/* Save — emerald glass button */}
                            <button
                                onClick={handleGuardar}
                                disabled={!hayCambios || guardando}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-[0.97]"
                                style={{
                                    background: 'rgba(16,185,129,0.85)',
                                    border: '1px solid rgba(52,211,153,0.30)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 4px 14px rgba(16,185,129,0.35)',
                                }}
                            >
                                {guardando
                                    ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : confirmando ? <Check size={14} /> : <Save size={14} />
                                }
                                {guardando ? 'Guardando...' : confirmando ? 'Confirmar' : 'Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditarRol;
