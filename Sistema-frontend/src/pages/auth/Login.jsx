import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerFingerprint } from '../../services/fingerprintService';
import authService from '../../services/authService';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Modal OTP ─────────────────────────────────────────────────────────────────
const ModalOtp = ({ tokenTemporal, emailDestino, fingerprint, onExito, onCancelar }) => {
    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);
    const [confiarDispositivo, setConfiarDispositivo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tiempoRestante, setTiempoRestante] = useState(600);
    const [cooldownReenvio, setCooldownReenvio] = useState(0);
    const refs = useRef([]);
    const { loginDirecto } = useAuth();

    useEffect(() => {
        if (tiempoRestante <= 0) return;
        const t = setInterval(() => setTiempoRestante(s => s - 1), 1000);
        return () => clearInterval(t);
    }, [tiempoRestante]);

    useEffect(() => {
        if (cooldownReenvio <= 0) return;
        const t = setInterval(() => setCooldownReenvio(s => s - 1), 1000);
        return () => clearInterval(t);
    }, [cooldownReenvio]);

    const formatTiempo = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const handleDigit = (i, val) => {
        const digit = val.replace(/[^0-9]/g, '').slice(-1);
        const next = [...codigo];
        next[i] = digit;
        setCodigo(next);
        setError('');
        if (digit && i < 5) refs.current[i + 1]?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !codigo[i] && i > 0) refs.current[i - 1]?.focus();
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
        if (text.length === 6) {
            setCodigo(text.split(''));
            refs.current[5]?.focus();
        }
    };

    const codigoCompleto = codigo.join('');

    const verificar = async () => {
        if (codigoCompleto.length < 6) return;
        setLoading(true);
        setError('');
        try {
            const data = await authService.verificarOtp(tokenTemporal, codigoCompleto, confiarDispositivo, fingerprint);
            if (data.tipo_respuesta === 'login_exitoso') {
                loginDirecto(data);
                onExito(data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Código incorrecto.');
            setCodigo(['', '', '', '', '', '']);
            refs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-fade-in">
            <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4 shadow-2xl relative modal-slide-up">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60 rounded-t-2xl"></div>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">Verificación de dos pasos</h3>
                    <p className="text-slate-400 text-sm mt-1">
                        Enviamos un código a <span className="text-purple-300">{emailDestino}</span>
                    </p>
                </div>

                <div className="text-center mb-5">
                    {tiempoRestante > 0 ? (
                        <span className={`text-sm font-mono font-medium ${tiempoRestante < 60 ? 'text-red-400' : 'text-slate-400'}`}>
                            Expira en {formatTiempo(tiempoRestante)}
                        </span>
                    ) : (
                        <span className="text-sm text-red-400 font-medium">El código expiró</span>
                    )}
                </div>

                <div className="flex justify-center gap-2 mb-5" onPaste={handlePaste}>
                    {codigo.map((d, i) => (
                        <input
                            key={i}
                            ref={el => refs.current[i] = el}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={d}
                            onChange={e => handleDigit(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            disabled={loading || tiempoRestante === 0}
                            className={`w-11 h-14 text-center text-xl font-bold rounded-xl border bg-transparent text-white focus:outline-none transition-all duration-200
                                ${error ? 'border-red-500' : d ? 'border-purple-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'border-white/10 focus:border-purple-400'}
                                disabled:opacity-50`}
                        />
                    ))}
                </div>

                {error && <p className="text-center text-sm text-red-400 mb-4">{error}</p>}

                <label className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer hover:border-purple-500/30 transition-colors mb-5">
                    <input
                        type="checkbox"
                        checked={confiarDispositivo}
                        onChange={e => setConfiarDispositivo(e.target.checked)}
                        className="w-4 h-4 rounded accent-purple-500"
                    />
                    <div>
                        <span className="text-sm text-slate-200 font-medium">Confiar en este dispositivo</span>
                        <p className="text-xs text-slate-500 mt-0.5">No pedir código por 30 días en este equipo</p>
                    </div>
                </label>

                <button
                    onClick={verificar}
                    disabled={codigoCompleto.length < 6 || loading || tiempoRestante === 0}
                    className="w-full h-11 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(139,92,246,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mb-3"
                >
                    {loading ? <><Spinner className="w-4 h-4" /> Verificando...</> : 'Verificar código'}
                </button>

                <div className="flex justify-between items-center">
                    <button onClick={onCancelar} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                        Cancelar
                    </button>
                    <button
                        disabled={cooldownReenvio > 0}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                        onClick={() => { onCancelar(); toast('Ingresa nuevamente para recibir un nuevo código.', { icon: 'ℹ️' }); }}
                    >
                        {cooldownReenvio > 0 ? `Reenviar en ${cooldownReenvio}s` : 'Solicitar nuevo código'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Modal Recuperar Contraseña ─────────────────────────────────────────────────
const ModalRecuperarPassword = ({ onCerrar }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const enviar = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.solicitarRecuperacion(email);
        } catch (_) {
            // Anti-enumeración: no mostrar error real
        } finally {
            setLoading(false);
            setEnviado(true);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-fade-in">
            <div className="glass-card rounded-2xl p-8 w-full max-w-sm mx-4 shadow-2xl relative modal-slide-up">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-60 rounded-t-2xl"></div>

                <button
                    onClick={onCerrar}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white">Recuperar contraseña</h3>
                    <p className="text-slate-400 text-sm mt-1">Ingresa tu correo corporativo</p>
                </div>

                {enviado ? (
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Si el correo está registrado recibirás un enlace de recuperación en breve.
                        </p>
                        <button
                            onClick={onCerrar}
                            className="mt-5 w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-sm transition-all"
                        >
                            Entendido
                        </button>
                    </div>
                ) : (
                    <form onSubmit={enviar}>
                        <FloatingInput
                            label="Correo electrónico corporativo"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            }
                        />
                        <button
                            type="submit"
                            disabled={!email || loading}
                            className="w-full h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <><Spinner className="w-4 h-4" color="text-black" /> Enviando...</> : 'Enviar enlace'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

// ── Login principal ──────────────────────────────────────────────────────────
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(false);

    // Estado OTP
    const [otpData, setOtpData] = useState(null); // { tokenTemporal, emailDestino, fingerprint }
    // Estado recuperar password
    const [mostrarRecuperar, setMostrarRecuperar] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const from = location.state?.from?.pathname || '/dashboard';

    const triggerShake = () => {
        setShake(true);
        setTimeout(() => setShake(false), 500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const fingerprint = await obtenerFingerprint();
            const res = await login(email, password, fingerprint);

            if (res.tipo_respuesta === 'requiere_2fa') {
                setOtpData({
                    tokenTemporal: res.token_temporal,
                    emailDestino: res.email_destino,
                    fingerprint,
                });
            } else if (res.tipo_respuesta === 'login_exitoso') {
                toast.success('Sesión iniciada correctamente');
                navigate(from, { replace: true });
            }
        } catch (err) {
            triggerShake();
            const msg = err.response?.data?.message || 'Error de conexión. Verifica tu red.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpExito = useCallback(() => {
        setOtpData(null);
        toast.success('Sesión iniciada correctamente');
        navigate(from, { replace: true });
    }, [from, navigate]);

    return (
        <>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%       { transform: translateX(-6px); }
                    40%       { transform: translateX(6px); }
                    60%       { transform: translateX(-4px); }
                    80%       { transform: translateX(4px); }
                }
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-shake      { animation: shake 0.45s ease-in-out; }
                .modal-fade-in      { animation: modalFadeIn 0.2s ease-out; }
                .modal-slide-up     { animation: modalSlideUp 0.25s ease-out; }
            `}</style>

            <AuthBackground subtitle="Motor de Gestión Operativa y Predictiva">
                <div className={`glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative ${shake ? 'animate-shake' : ''}`}>

                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50 rounded-t-2xl"></div>

                    <div className="mb-8">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                            <svg className="mr-1.5 h-2 w-2 text-purple-400" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                            Sistema Interno
                        </span>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Bienvenido de vuelta</h2>
                        <p className="text-slate-400 text-sm mt-2">Ingresa con tus credenciales corporativas</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FloatingInput
                            label="Correo electrónico corporativo"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            error={!!error}
                            disabled={isLoading}
                            autoComplete="email"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            }
                        />

                        <FloatingInput
                            label="Contraseña"
                            type={mostrarPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            error={!!error}
                            disabled={isLoading}
                            autoComplete="current-password"
                            icon={
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            }
                            rightIcon={<EyeIcon visible={mostrarPassword} />}
                            onRightIconClick={() => setMostrarPassword(p => !p)}
                        />

                        {error && (
                            <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10">
                                <svg className="flex-shrink-0 w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end mt-1 mb-2">
                            <button
                                type="button"
                                onClick={() => setMostrarRecuperar(true)}
                                className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center items-center h-12 rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                        >
                            {isLoading ? (
                                <><Spinner className="w-5 h-5 mr-2" color="text-black" />Autenticando...</>
                            ) : (
                                <>
                                    Ingresar al sistema
                                    <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Conexión cifrada · Autenticación 2FA · Acceso empresarial</span>
                        </div>
                    </div>
                </div>
            </AuthBackground>

            {/* Modal OTP */}
            {otpData && (
                <ModalOtp
                    tokenTemporal={otpData.tokenTemporal}
                    emailDestino={otpData.emailDestino}
                    fingerprint={otpData.fingerprint}
                    onExito={handleOtpExito}
                    onCancelar={() => setOtpData(null)}
                />
            )}

            {/* Modal Recuperar Password */}
            {mostrarRecuperar && (
                <ModalRecuperarPassword onCerrar={() => setMostrarRecuperar(false)} />
            )}
        </>
    );
};

export default Login;
