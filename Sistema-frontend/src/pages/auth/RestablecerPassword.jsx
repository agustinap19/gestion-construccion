import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

const ReqIcon = ({ ok }) => ok ? (
    <svg className="h-3.5 w-3.5 text-emerald-400 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
) : (
    <svg className="h-3.5 w-3.5 text-slate-600 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
);

const EyeIcon = ({ visible }) => (
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
);

const RestablecerPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';
    const emailParam = searchParams.get('email') || '';

    const [estadoToken, setEstadoToken] = useState('validando'); // validando | valido | invalido
    const [nombreUsuario, setNombreUsuario] = useState('');
    const [nueva, setNueva] = useState('');
    const [confirmar, setConfirmar] = useState('');
    const [showNueva, setShowNueva] = useState(false);
    const [showConfirmar, setShowConfirmar] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exito, setExito] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setEstadoToken('invalido');
            return;
        }
        authService.validarTokenRecuperacion(token)
            .then(res => {
                if (res.status === 'success') {
                    setNombreUsuario(res.data?.nombre || '');
                    setEstadoToken('valido');
                } else {
                    setEstadoToken('invalido');
                }
            })
            .catch(() => setEstadoToken('invalido'));
    }, [token]);

    const req = {
        minimo: nueva.length >= 8,
        mayuscula: /[A-Z]/.test(nueva),
        minuscula: /[a-z]/.test(nueva),
        numero: /[0-9]/.test(nueva),
        simbolo: /[\W_]/.test(nueva),
    };
    const fuerzaTotal = Object.values(req).filter(Boolean).length;
    const coinsiden = nueva === confirmar && confirmar.length > 0;
    const formValido = fuerzaTotal === 5 && coinsiden;
    const coloresFuerza = ['bg-slate-800', 'bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formValido) return;
        setLoading(true);
        setError('');
        try {
            await authService.restablecerPassword(token, nueva);
            setExito(true);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo restablecer la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthBackground subtitle="Restablecimiento de contraseña">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative w-full max-w-md">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50 rounded-t-2xl"></div>

                {/* Validando token */}
                {estadoToken === 'validando' && (
                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <Spinner className="w-8 h-8" />
                        <p className="text-slate-400 text-sm">Validando enlace...</p>
                    </div>
                )}

                {/* Token inválido */}
                {estadoToken === 'invalido' && (
                    <div className="text-center py-8">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Enlace inválido o expirado</h2>
                        <p className="text-slate-400 text-sm mb-6">
                            Este enlace de recuperación no es válido o ya fue utilizado. Por favor solicita uno nuevo.
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-sm hover:bg-white/10 transition-all"
                        >
                            Volver al inicio de sesión
                        </button>
                    </div>
                )}

                {/* Token válido — formulario */}
                {estadoToken === 'valido' && !exito && (
                    <>
                        <div className="mb-6">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                                Contraseña segura
                            </span>
                            <h2 className="text-2xl font-bold text-white">Nueva contraseña</h2>
                            {nombreUsuario && (
                                <p className="text-slate-400 text-sm mt-1">
                                    Hola, <span className="text-slate-300">{nombreUsuario}</span>. Elige una contraseña segura.
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-1">
                            <FloatingInput
                                label="Nueva contraseña"
                                type={showNueva ? 'text' : 'password'}
                                value={nueva}
                                onChange={e => setNueva(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="new-password"
                                rightIcon={<EyeIcon visible={showNueva} />}
                                onRightIconClick={() => setShowNueva(p => !p)}
                            />

                            {nueva.length > 0 && (
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
                                value={confirmar}
                                onChange={e => setConfirmar(e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="new-password"
                                error={confirmar.length > 0 && !coinsiden}
                                rightIcon={<EyeIcon visible={showConfirmar} />}
                                onRightIconClick={() => setShowConfirmar(p => !p)}
                            />
                            {confirmar.length > 0 && !coinsiden && (
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
                                {loading ? <><Spinner className="w-5 h-5" color="text-black" />Guardando...</> : 'Restablecer contraseña'}
                            </button>
                        </form>
                    </>
                )}

                {/* Éxito */}
                {exito && (
                    <div className="text-center py-8">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Contraseña restablecida</h2>
                        <p className="text-slate-400 text-sm mb-6">Tu contraseña fue actualizada. Ya puedes iniciar sesión.</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                        >
                            Ir al inicio de sesión
                        </button>
                    </div>
                )}
            </div>
        </AuthBackground>
    );
};

export default RestablecerPassword;
