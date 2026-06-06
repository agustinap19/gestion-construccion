import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import AuthBackground from '../../components/auth/AuthBackground';
import Spinner from '../../components/ui/Spinner';

const VerificarOtp = () => {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
    
    const inputRefs = useRef([]);
    const navigate = useNavigate();
    const location = useLocation();

    // Redirigir si no hay state
    if (!location.state || !location.state.token_temporal) {
        return <Navigate to="/login" replace />;
    }

    const { token_temporal, email_destino } = location.state;

    useEffect(() => {
        if (timeLeft <= 0) return;
        const timerId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timerId);
    }, [timeLeft]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value !== '' && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text/plain').slice(0, 6).split('');
        if (pastedData.some(char => isNaN(char))) return;

        const newOtp = [...otp];
        pastedData.forEach((char, index) => {
            if (index < 6) newOtp[index] = char;
        });
        setOtp(newOtp);
        
        const nextEmptyIndex = pastedData.length < 6 ? pastedData.length : 5;
        inputRefs.current[nextEmptyIndex].focus();
    };

    const isComplete = otp.every(digit => digit !== '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isComplete) return;

        setError('');
        setIsLoading(true);

        const codigo = otp.join('');

        try {
            await authService.verificarOtp(token_temporal, codigo);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Código inválido o error de conexión.');
            }
            // Limpiar inputs
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0].focus();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthBackground subtitle="Verificación de seguridad en proceso...">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative">
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

                <div className="mb-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                        <svg className="mr-1.5 h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Verificación en dos pasos
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Código de autenticación</h2>
                    <p className="text-slate-400 text-sm mt-2">Ingresa el código de 6 dígitos de tu app Google Authenticator</p>
                </div>

                {error && (
                    <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10 mb-6 transition-all">
                        <svg className="flex-shrink-0 inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                disabled={isLoading || timeLeft <= 0}
                                className={`w-10 h-14 sm:w-12 sm:h-16 text-center text-2xl font-bold bg-white/5 border rounded-xl text-white placeholder-transparent focus:outline-none transition-all duration-300 disabled:opacity-50
                                    ${digit !== '' 
                                        ? 'border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]' 
                                        : 'border-white/10'
                                    }
                                    focus:border-emerald-500 focus:shadow-[0_0_15px_rgba(16,185,129,0.3)]
                                `}
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={!isComplete || isLoading}
                        className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                Verificando...
                            </>
                        ) : (
                            <>
                                Verificar código
                                <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center space-y-4">
                    <p className="text-xs text-slate-500 text-center">El código rota cada 30 segundos en tu app</p>
                    <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center group">
                        <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al login
                    </Link>
                </div>
            </div>
        </AuthBackground>
    );
};

export default VerificarOtp;
