import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { obtenerFingerprint } from '../../services/fingerprintService';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [shake, setShake] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    const from = location.state?.from?.pathname || "/dashboard";

    useEffect(() => {
        // Limpiar estado
        setError(null);
        setIsLoading(false);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        setShake(false);

        try {
            const fingerprint = await obtenerFingerprint();
            const res = await login(email, password, fingerprint);
            
            if (res.tipo_respuesta === 'requiere_2fa') {
                navigate('/verificar-otp', { 
                    state: { 
                        token_temporal: res.token_temporal, 
                        email_destino: res.email_destino 
                    } 
                });
            } else if (res.tipo_respuesta === 'primer_login') {
                 navigate('/primer-login'); // En caso de que se maneje desde el servicio directamente (opcional)
            } else {
                toast.success('Sesión iniciada correctamente', { style: { background: '#10b981', color: '#fff' } });
                navigate(from, { replace: true });
            }
        } catch (err) {
            setShake(true);
            setTimeout(() => setShake(false), 500); // Quitar clase de animación después de 500ms
            
            if (err.response?.data?.message) {
                setError(err.response.data.message);
                toast.error(err.response.data.message, { style: { background: '#ef4444', color: '#fff' } });
            } else {
                setError('Error al intentar iniciar sesión. Verifica tu conexión.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthBackground subtitle="Motor de Gestión Operativa y Predictiva">
            
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    50% { transform: translateX(5px); }
                    75% { transform: translateX(-5px); }
                }
                .animate-shake {
                    animation: shake 0.4s ease-in-out;
                }
            `}</style>

            <div className={`glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative ${shake ? 'animate-shake' : ''}`}>
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

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
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        error={!!error}
                        disabled={isLoading}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        }
                    />

                    <FloatingInput
                        label="Contraseña"
                        type={mostrarPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        error={!!error}
                        disabled={isLoading}
                        icon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        }
                        rightIcon={
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                {mostrarPassword ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                )}
                                {!mostrarPassword && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                            </svg>
                        }
                        onRightIconClick={() => setMostrarPassword(!mostrarPassword)}
                    />

                    {error && (
                        <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10 mt-2 transition-all">
                            <svg className="flex-shrink-0 inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <div className="flex items-center justify-end mt-2 mb-6">
                        <Link to="/recuperar-password" className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                Autenticando...
                            </>
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

                {/* Footer del form */}
                <div className="mt-8 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-center space-x-2 text-slate-500 text-xs mb-4">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>Conexión cifrada · Autenticación 2FA · Datos protegidos</span>
                    </div>
                    
                    <div className="text-center">
                        <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center group">
                            <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver al sitio público
                        </a>
                    </div>
                </div>

            </div>
        </AuthBackground>
    );
};

export default Login;
