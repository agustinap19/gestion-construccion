import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import Spinner from '../ui/Spinner';
import FloatingInput from '../ui/FloatingInput';

const ReqIcon = ({ ok }) => ok ? (
    <svg className="h-3.5 w-3.5 text-emerald-400 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
) : (
    <svg className="h-3.5 w-3.5 text-slate-600 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const EyeBtn = ({ visible, onClick }) => (
    <button type="button" onClick={onClick} tabIndex="-1" className="text-slate-400 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {visible ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            ) : (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
            )}
        </svg>
    </button>
);

const CambioPasswordObligatorioModal = () => {
    const { mostrarModalCambioPassword, marcarPasswordCambiada, logout } = useAuth();

    const [passwordActual, setPasswordActual] = useState('');
    const [nuevaPassword, setNuevaPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');
    const [showActual, setShowActual] = useState(false);
    const [showNueva, setShowNueva] = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const req = {
        minimo: nuevaPassword.length >= 8,
        mayuscula: /[A-Z]/.test(nuevaPassword),
        minuscula: /[a-z]/.test(nuevaPassword),
        numero: /[0-9]/.test(nuevaPassword),
        simbolo: /[\W_]/.test(nuevaPassword),
    };
    const fuerzaTotal = Object.values(req).filter(Boolean).length;
    const coinsiden = nuevaPassword === confirmarPassword && confirmarPassword.length > 0;
    const formValido = fuerzaTotal === 5 && coinsiden && passwordActual.length > 0;

    const coloresFuerza = ['bg-slate-800', 'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formValido) return;
        setLoading(true);
        setError('');

        try {
            const res = await authService.cambiarPasswordPrimerLogin(passwordActual, nuevaPassword);
            if (res.status === 'success' && res.data?.token) {
                marcarPasswordCambiada(res.data.token, res.data.usuario, res.data.permisos);
            } else {
                marcarPasswordCambiada(null);
            }
        } catch (err) {
            const msg = err.response?.data?.errors?.password_actual?.[0]
                || err.response?.data?.message
                || 'Error al cambiar la contraseña.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    if (!mostrarModalCambioPassword) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6">
            <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-t-2xl"></div>

                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Cambio de contraseña requerido</h2>
                        <p className="text-slate-400 text-sm mt-1">
                            Por seguridad debes establecer una contraseña personal antes de continuar.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-1">
                    <FloatingInput
                        label="Contraseña temporal (actual)"
                        type={showActual ? 'text' : 'password'}
                        value={passwordActual}
                        onChange={e => setPasswordActual(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="current-password"
                        rightIcon={<EyeBtn visible={showActual} onClick={() => setShowActual(p => !p)} />}
                        onRightIconClick={() => setShowActual(p => !p)}
                    />

                    <div className="h-px bg-white/5 my-4"></div>

                    <FloatingInput
                        label="Nueva contraseña"
                        type={showNueva ? 'text' : 'password'}
                        value={nuevaPassword}
                        onChange={e => setNuevaPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        rightIcon={<EyeBtn visible={showNueva} onClick={() => setShowNueva(p => !p)} />}
                        onRightIconClick={() => setShowNueva(p => !p)}
                    />

                    {/* Barra de fuerza */}
                    {nuevaPassword.length > 0 && (
                        <div className="mb-3">
                            <div className="flex gap-1 h-1.5 mb-3">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <div key={n} className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= n ? coloresFuerza[n] : 'bg-slate-800'}`}></div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                                {[
                                    [req.minimo, 'Mínimo 8 caracteres'],
                                    [req.mayuscula, 'Mayúscula'],
                                    [req.minuscula, 'Minúscula'],
                                    [req.numero, 'Número'],
                                    [req.simbolo, 'Símbolo especial'],
                                ].map(([ok, label]) => (
                                    <div key={label} className={`flex items-center ${ok ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        <ReqIcon ok={ok} />{label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <FloatingInput
                        label="Confirmar nueva contraseña"
                        type={showConfirmar ? 'text' : 'password'}
                        value={confirmarPassword}
                        onChange={e => setConfirmarPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        error={confirmarPassword.length > 0 && !coinsiden}
                        rightIcon={<EyeBtn visible={showConfirmar} onClick={() => setShowConfirmar(p => !p)} />}
                        onRightIconClick={() => setShowConfirmar(p => !p)}
                    />
                    {confirmarPassword.length > 0 && !coinsiden && (
                        <p className="text-xs text-red-400 -mt-4 mb-2 pl-4">Las contraseñas no coinciden.</p>
                    )}

                    {error && (
                        <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10">
                            <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={!formValido || loading}
                        className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <><Spinner className="w-5 h-5" color="text-black" />Guardando...</> : 'Establecer contraseña'}
                    </button>
                </form>

                <div className="mt-6 pt-4 border-t border-white/10 text-center">
                    <button
                        onClick={logout}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CambioPasswordObligatorioModal;
