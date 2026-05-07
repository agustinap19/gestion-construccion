import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import authService from '../../services/authService';
import faceApiService from '../../services/faceApiService';
import { useAuth } from '../../context/AuthContext';
import AuthBackground from '../../components/auth/AuthBackground';
import Spinner from '../../components/ui/Spinner';
import toast from 'react-hot-toast';

const VerificarRostro = () => {
    const [status, setStatus] = useState('loading_models');
    const [error, setError] = useState('');
    const [faceDetected, setFaceDetected] = useState(false);
    const [descriptor, setDescriptor] = useState(null);
    const [verifying, setVerifying] = useState(false);
    
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const recognitionInterval = useRef(null);
    
    const navigate = useNavigate();
    const location = useLocation();
    const { loginDirecto } = useAuth();

    if (!location.state || !location.state.token_temporal) {
        return <Navigate to="/login" replace />;
    }

    const { token_temporal } = location.state;

    useEffect(() => {
        const initCamera = async () => {
            try {
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
                console.error("Error init:", err);
                setError('No se pudo acceder a la cámara o cargar los modelos.');
                setStatus('error');
            }
        };

        initCamera();

        return () => {
            if (recognitionInterval.current) clearInterval(recognitionInterval.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

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

    const handleVerify = async () => {
        if (!descriptor) return;
        
        setVerifying(true);
        setError('');

        try {
            const data = await authService.verificarRostro2FA(token_temporal, descriptor);
            
            if (data.tipo_respuesta === 'login_exitoso') {
                loginDirecto(data);
                
                // Limpiar cámara antes de redirigir
                if (recognitionInterval.current) clearInterval(recognitionInterval.current);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                
                toast.success('Bienvenido al sistema', { style: { background: '#10b981', color: '#fff' } });
                navigate('/dashboard', { replace: true });
            }
        } catch (err) {
            if (err.response?.data?.message) {
                setError(err.response.data.message);
            } else {
                setError('Error al verificar el rostro. Inténtalo de nuevo.');
            }
        } finally {
            setVerifying(false);
        }
    };

    return (
        <AuthBackground subtitle="Verificación biométrica en proceso...">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative">
                
                {/* Decoración superior */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

                <div className="mb-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                        <svg className="mr-1.5 h-3 w-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Paso 2 de 2
                    </span>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Verificación facial</h2>
                    <p className="text-slate-400 text-sm mt-2">Confirma tu identidad con reconocimiento biométrico</p>
                </div>

                {error && (
                    <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10 mb-6 transition-all">
                        <svg className="flex-shrink-0 inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <div className="space-y-6">
                    {/* Contenedor de Video (Viewfinder) */}
                    <div className={`relative mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center aspect-video transition-all duration-300
                        ${status !== 'ready' ? 'border border-slate-800' : 
                          faceDetected ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 
                          'border-2 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'}`}
                    >
                        
                        {/* Esquinas decorativas Viewfinder */}
                        {status === 'ready' && (
                            <>
                                <div className={`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-red-500'}`}></div>
                                <div className={`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-red-500'}`}></div>
                                <div className={`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-red-500'}`}></div>
                                <div className={`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-20 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-red-500'}`}></div>
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
                        
                        {/* Overlay scan effect */}
                        {status === 'ready' && !faceDetected && (
                            <div className="absolute inset-0 pointer-events-none z-20">
                                <div className="w-full h-0.5 bg-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.8)] absolute animate-[scan_2s_ease-in-out_infinite]"></div>
                            </div>
                        )}
                    </div>

                    {/* Indicador de Estado */}
                    <div className="flex justify-center h-8">
                        {status === 'ready' ? (
                            faceDetected ? (
                                <span className="flex items-center text-emerald-400 font-medium bg-emerald-400/10 px-4 py-1.5 rounded-full text-sm border border-emerald-500/20">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Rostro detectado correctamente
                                </span>
                            ) : (
                                <span className="flex items-center text-red-400 bg-red-500/10 px-4 py-1.5 rounded-full text-sm border border-red-500/20">
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Posiciona tu rostro frente a la cámara
                                </span>
                            )
                        ) : null}
                    </div>

                    <button
                        onClick={handleVerify}
                        disabled={!faceDetected || verifying}
                        className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                    >
                        {verifying ? (
                            <>
                                <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                Verificando identidad...
                            </>
                        ) : (
                            <>
                                Verificar identidad
                                <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center justify-center group">
                        <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Cancelar y volver al login
                    </Link>
                </div>
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

export default VerificarRostro;
