import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import recuperacionService from '../../services/recuperacionService';
import faceApiService from '../../services/faceApiService';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import Spinner from '../../components/ui/Spinner';

const RecuperacionFacial = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    // Estado de validación del token
    const [tokenValido, setTokenValido] = useState(false);
    const [cargandoToken, setCargandoToken] = useState(true);
    const [errorToken, setErrorToken] = useState('');
    const [usuarioNombre, setUsuarioNombre] = useState('');

    // Estado biométrico (similar a VerificarRostro.jsx)
    const [status, setStatus] = useState('waiting_user'); // waiting_user, loading_models, starting_camera, ready, error
    const [faceDetected, setFaceDetected] = useState(false);
    const [descriptor, setDescriptor] = useState(null);
    const [verificando, setVerificando] = useState(false);
    const [errorBiometrico, setErrorBiometrico] = useState('');
    const [intentosRestantes, setIntentosRestantes] = useState(3);
    const [rostroNoDisponible, setRostroNoDisponible] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionInterval = useRef(null);

    // 1. Validar el token al cargar la página
    useEffect(() => {
        const checkToken = async () => {
            try {
                const res = await recuperacionService.validarToken(token);
                setTokenValido(true);
                setUsuarioNombre(res.data.nombre);
            } catch (err) {
                setErrorToken(err.response?.data?.message || 'El enlace de recuperación es inválido o ha expirado.');
            } finally {
                setCargandoToken(false);
            }
        };
        checkToken();
    }, [token]);

    // Limpieza al desmontar
    useEffect(() => {
        return () => {
            if (recognitionInterval.current) clearInterval(recognitionInterval.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 2. Lógica de detección facial (igual que VerificarRostro)
    useEffect(() => {
        if (status === 'ready' && videoRef.current) {
            recognitionInterval.current = setInterval(async () => {
                if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                    try {
                        const detectado = await faceApiService.detectarRostro(videoRef.current);
                        
                        if (detectado) {
                            setFaceDetected(true);
                            setDescriptor(detectado);
                        } else {
                            setFaceDetected(false);
                            setDescriptor(null);
                        }
                    } catch (e) {
                        console.error("Error detectando rostro:", e);
                    }
                }
            }, 500);
        }

        return () => {
            if (recognitionInterval.current) {
                clearInterval(recognitionInterval.current);
            }
        };
    }, [status]);

    const iniciarCamara = async () => {
        try {
            setErrorBiometrico('');
            setStatus('loading_models');
            await faceApiService.cargarModelos();
            
            setStatus('starting_camera');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { width: 640, height: 480 } 
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                streamRef.current = stream;
                setStatus('ready');
            }
        } catch (err) {
            setErrorBiometrico('No se pudo acceder a la cámara o cargar los modelos de IA.');
            setStatus('error');
        }
    };

    const handleVerify = async () => {
        if (!descriptor) return;
        
        setVerificando(true);
        setErrorBiometrico('');

        try {
            const data = await recuperacionService.verificarRostro(token, descriptor);
            
            if (data.data.rostro_disponible === false) {
                // Usuario sin rostro registrado
                setRostroNoDisponible(true);
                detenerCamara();
                return;
            }

            if (data.data.verificado) {
                detenerCamara();
                toast.success('Identidad verificada correctamente', { style: { background: '#10b981', color: '#fff' } });
                navigate(`/recuperar-password/cambiar/${token}`, { replace: true });
            }
        } catch (err) {
            const msjError = err.response?.data?.message || 'Error al verificar el rostro.';
            setErrorBiometrico(msjError);
            
            // Si el backend invalida el token por reintentos
            if (msjError.includes('invalidado') || msjError.includes('máximo de intentos')) {
                detenerCamara();
                setTokenValido(false);
                setErrorToken(msjError);
            } else {
                setIntentosRestantes(prev => prev - 1);
            }
        } finally {
            setVerificando(false);
        }
    };

    const detenerCamara = () => {
        if (recognitionInterval.current) clearInterval(recognitionInterval.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    // Pantalla de carga inicial
    if (cargandoToken) {
        return (
            <AuthBackground subtitle="Validando enlace de recuperación...">
                <div className="glass-card rounded-2xl p-10 flex flex-col items-center justify-center min-h-[300px]">
                    <Spinner className="w-10 h-10 mb-4" color="text-purple-500" />
                    <p className="text-white font-medium">Verificando acceso de seguridad...</p>
                </div>
            </AuthBackground>
        );
    }

    // Pantalla si el token es inválido
    if (!tokenValido) {
        return (
            <AuthBackground subtitle="Enlace no válido">
                <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
                    
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-500/20 mb-6">
                        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Acceso denegado</h2>
                    <p className="text-slate-400 mb-8">{errorToken}</p>
                    
                    <Link to="/recuperar-password" className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none transition-all duration-300">
                        Solicitar nuevo enlace
                    </Link>
                </div>
            </AuthBackground>
        );
    }

    // Pantalla si el usuario no tiene rostro registrado
    if (rostroNoDisponible) {
        return (
            <AuthBackground subtitle="Intervención manual requerida">
                <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-50"></div>
                    
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-500/20 mb-6">
                        <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Recuperación Manual</h2>
                    <p className="text-slate-300 mb-6 text-sm leading-relaxed">
                        Tu cuenta no tiene biometría facial registrada en nuestro sistema, por lo que no podemos automatizar el cambio de contraseña.
                    </p>
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 mb-8">
                        <p className="text-sm text-orange-300">
                            <strong>Hemos notificado automáticamente al administrador del sistema</strong>. Por favor, contáctate con él para que restablezca tu acceso manualmente.
                        </p>
                    </div>
                    
                    <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
                        ← Volver al inicio
                    </Link>
                </div>
            </AuthBackground>
        );
    }

    return (
        <AuthBackground subtitle="Autenticación secundaria">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative">
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

                <div className="mb-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                        <svg className="mr-1.5 h-3 w-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ✦ Verificación biométrica
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Verifica tu identidad</h2>
                    <p className="text-slate-400 text-sm mt-2">Hola <span className="text-white font-medium">{usuarioNombre}</span>, confírmanos que eres tú para poder cambiar la contraseña.</p>
                </div>

                {errorBiometrico && (
                    <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10 mb-6">
                        <svg className="flex-shrink-0 inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{errorBiometrico}</span>
                    </div>
                )}

                {status === 'waiting_user' ? (
                    <div className="space-y-6">
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-6 text-center">
                            <svg className="mx-auto h-12 w-12 text-purple-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-slate-300 text-sm mb-4">
                                Necesitaremos acceso a tu cámara por unos segundos para comparar tu rostro con el que registraste inicialmente.
                            </p>
                            <button
                                onClick={iniciarCamara}
                                className="inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none transition-all duration-300 shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:-translate-y-0.5"
                            >
                                Activar cámara ahora
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className={`relative mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center aspect-video transition-all duration-300
                            ${status !== 'ready' ? 'border border-slate-800' : 
                            faceDetected ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                            'border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'}`}
                        >
                            {status === 'ready' && (
                                <>
                                    <div className={`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                </>
                            )}

                            {status === 'loading_models' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                                    <Spinner className="w-8 h-8 mb-3" color="text-purple-500" />
                                    <p className="text-purple-400 font-medium text-sm">Cargando IA...</p>
                                </div>
                            )}
                            
                            {status === 'starting_camera' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                                    <Spinner className="w-8 h-8 mb-3" color="text-purple-500" />
                                    <p className="text-purple-400 font-medium text-sm">Iniciando cámara...</p>
                                </div>
                            )}

                            <video 
                                ref={videoRef}
                                autoPlay 
                                muted 
                                playsInline
                                className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100"
                            />
                            
                            {status === 'ready' && !faceDetected && (
                                <div className="absolute inset-0 pointer-events-none z-20">
                                    <div className="w-full h-0.5 bg-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.8)] absolute animate-[scan_2s_ease-in-out_infinite]"></div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-center h-8">
                            {status === 'ready' ? (
                                faceDetected ? (
                                    <span className="flex items-center text-emerald-400 font-medium bg-emerald-400/10 px-4 py-1.5 rounded-full text-sm border border-emerald-500/20">
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Rostro detectado
                                    </span>
                                ) : (
                                    <span className="flex items-center text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full text-sm border border-purple-500/20">
                                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Enfoca tu rostro claramente
                                    </span>
                                )
                            ) : null}
                        </div>

                        <button
                            onClick={handleVerify}
                            disabled={!faceDetected || verificando}
                            className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                        >
                            {verificando ? (
                                <>
                                    <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                    Verificando identidad...
                                </>
                            ) : (
                                <>
                                    Verificar mi identidad
                                    <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </AuthBackground>
    );
};

export default RecuperacionFacial;
