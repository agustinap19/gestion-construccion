import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import recuperacionService from '../../services/recuperacionService';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

const CambiarPasswordRecuperacion = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [passwordData, setPasswordData] = useState({
        nueva_password: '',
        nueva_password_confirmation: ''
    });
    
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConf, setMostrarConf] = useState(false);
    const [loading, setLoading] = useState(false);
    const [exito, setExito] = useState(false);

    // Requisitos de fuerza
    const [requisitos, setRequisitos] = useState({
        minimo: false,
        mayuscula: false,
        minuscula: false,
        numero: false,
        simbolo: false
    });
    const [fuerzaTotal, setFuerzaTotal] = useState(0);

    useEffect(() => {
        const p = passwordData.nueva_password;
        const reqs = {
            minimo: p.length >= 8,
            mayuscula: /[A-Z]/.test(p),
            minuscula: /[a-z]/.test(p),
            numero: /[0-9]/.test(p),
            simbolo: /[\W]/.test(p) // o /[@$!%*#?&_\-]/ 
        };
        setRequisitos(reqs);
        setFuerzaTotal(Object.values(reqs).filter(Boolean).length);
    }, [passwordData.nueva_password]);

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const isFormValid = () => {
        return fuerzaTotal === 5 && 
               passwordData.nueva_password === passwordData.nueva_password_confirmation;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isFormValid()) return;

        setLoading(true);
        try {
            await recuperacionService.cambiarPassword(
                token, 
                passwordData.nueva_password, 
                passwordData.nueva_password_confirmation
            );
            setExito(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cambiar la contraseña. El enlace puede haber expirado.', { style: { background: '#ef4444', color: '#fff' } });
        } finally {
            setLoading(false);
        }
    };

    // Helper de iconos
    const renderEyeIcon = (visible) => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {visible ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            ) : (
                <>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
            )}
        </svg>
    );

    const checkIcon = (
        <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
    );
    const crossIcon = (
        <svg className="h-4 w-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    );

    if (exito) {
        return (
            <AuthBackground subtitle="Recuperación completada exitosamente">
                <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative text-center animate-fade-in">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                    
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-500/20 mb-6">
                        <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">¡Contraseña cambiada exitosamente!</h2>
                    <p className="text-slate-300 mb-8 text-sm leading-relaxed">
                        Tu cuenta ahora está protegida con tu nueva contraseña. Por seguridad, hemos cerrado cualquier sesión que tuvieras abierta previamente.
                    </p>
                    
                    <button 
                        onClick={() => navigate('/login', { replace: true })}
                        className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                    >
                        Ir al login para entrar
                        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </div>
            </AuthBackground>
        );
    }

    return (
        <AuthBackground subtitle="Establecimiento de nueva contraseña">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative">
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

                <div className="mb-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                        <svg className="mr-1.5 h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        ✦ Crear nueva contraseña
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Define tu nueva contraseña</h2>
                    <p className="text-slate-400 text-sm mt-2">Tu identidad biométrica fue verificada. Ahora crea una contraseña segura.</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-start">
                    <svg className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-amber-200/90 leading-relaxed">
                        Después de cambiar tu contraseña, todas tus sesiones activas se cerrarán por seguridad y tus dispositivos de confianza serán reiniciados.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <FloatingInput
                        label="Nueva contraseña"
                        name="nueva_password"
                        type={mostrarNueva ? "text" : "password"}
                        value={passwordData.nueva_password}
                        onChange={handlePasswordChange}
                        required
                        disabled={loading}
                        rightIcon={renderEyeIcon(mostrarNueva)}
                        onRightIconClick={() => setMostrarNueva(!mostrarNueva)}
                    />
                    
                    {/* Indicador de fuerza */}
                    <div className="mb-4">
                        <div className="flex space-x-1 h-1.5 mb-3">
                            <div className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= 1 ? 'bg-red-500' : 'bg-slate-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= 2 ? 'bg-orange-500' : 'bg-slate-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= 3 ? 'bg-amber-400' : 'bg-slate-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= 4 ? 'bg-emerald-400' : 'bg-slate-800'}`}></div>
                            <div className={`flex-1 rounded-full transition-all duration-300 ${fuerzaTotal >= 5 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-800'}`}></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                            <div className={`flex items-center transition-colors ${requisitos.minimo ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {requisitos.minimo ? checkIcon : crossIcon} Mínimo 8 caracteres
                            </div>
                            <div className={`flex items-center transition-colors ${requisitos.mayuscula ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {requisitos.mayuscula ? checkIcon : crossIcon} Letra mayúscula
                            </div>
                            <div className={`flex items-center transition-colors ${requisitos.minuscula ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {requisitos.minuscula ? checkIcon : crossIcon} Letra minúscula
                            </div>
                            <div className={`flex items-center transition-colors ${requisitos.numero ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {requisitos.numero ? checkIcon : crossIcon} Un número
                            </div>
                            <div className={`flex items-center col-span-2 transition-colors ${requisitos.simbolo ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {requisitos.simbolo ? checkIcon : crossIcon} Símbolo especial (ej: !@#$%)
                            </div>
                        </div>
                    </div>

                    <FloatingInput
                        label="Confirmar nueva contraseña"
                        name="nueva_password_confirmation"
                        type={mostrarConf ? "text" : "password"}
                        value={passwordData.nueva_password_confirmation}
                        onChange={handlePasswordChange}
                        required
                        disabled={loading}
                        rightIcon={renderEyeIcon(mostrarConf)}
                        onRightIconClick={() => setMostrarConf(!mostrarConf)}
                        error={passwordData.nueva_password !== passwordData.nueva_password_confirmation && passwordData.nueva_password_confirmation.length > 0}
                    />
                    
                    {passwordData.nueva_password !== passwordData.nueva_password_confirmation && passwordData.nueva_password_confirmation.length > 0 && (
                        <p className="text-xs text-red-400 -mt-3 pl-4">Las contraseñas no coinciden.</p>
                    )}

                    <button
                        type="submit"
                        disabled={!isFormValid() || loading}
                        className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-6"
                    >
                        {loading ? (
                            <>
                                <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                Cambiar contraseña
                                <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
            `}</style>
        </AuthBackground>
    );
};

export default CambiarPasswordRecuperacion;
