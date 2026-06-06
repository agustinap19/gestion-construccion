import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import recuperacionService from '../../services/recuperacionService';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

const SolicitarRecuperacion = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [enviado, setEnviado] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Por favor ingresa tu correo corporativo.', { style: { background: '#ef4444', color: '#fff' } });
            return;
        }

        setLoading(true);
        try {
            await recuperacionService.solicitarRecuperacion(email);
            setEnviado(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al solicitar recuperación. Intenta nuevamente.', { style: { background: '#ef4444', color: '#fff' } });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthBackground subtitle="Recuperación de acceso corporativo">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative">
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>

                <div className="mb-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
                        <svg className="mr-1.5 h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        ✦ Recuperación segura
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Recupera tu acceso</h2>
                    <p className="text-slate-400 text-sm mt-2">Ingresa tu correo y te enviaremos instrucciones para recuperar tu cuenta</p>
                </div>

                {!enviado ? (
                    <>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-start">
                            <svg className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <p className="text-sm text-blue-200/90 leading-relaxed">
                                Por seguridad, también verificaremos tu rostro antes de permitir el cambio de contraseña.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <FloatingInput
                                label="Correo electrónico corporativo"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
                                disabled={loading || !email}
                                className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                            >
                                {loading ? (
                                    <>
                                        <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                        Enviando instrucciones...
                                    </>
                                ) : (
                                    <>
                                        Enviar instrucciones
                                        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-center py-6 animate-fade-in">
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mb-6">
                            <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-medium text-white mb-3">Instrucciones enviadas</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            Si tu correo está registrado, recibirás un enlace en los próximos minutos. Revisa tu bandeja de entrada y la carpeta de spam.
                        </p>
                    </div>
                )}

                {/* Footer del form */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center group">
                        <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Volver al login
                    </Link>
                </div>
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

export default SolicitarRecuperacion;
