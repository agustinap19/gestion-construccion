import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import faceApiService from '../../services/faceApiService';
import api from '../../services/api';
import toast from 'react-hot-toast';
import AuthBackground from '../../components/auth/AuthBackground';
import FloatingInput from '../../components/ui/FloatingInput';
import Spinner from '../../components/ui/Spinner';

const PrimerLogin = () => {
    const navigate = useNavigate();
    const { user, logout, marcarPrimerLoginCompleto } = useAuth();
    
    // Si ya no necesita primer login, redirigir
    useEffect(() => {
        if (user && !user.debe_cambiar_password && user.rostro_registrado) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    // Estado del asistente
    const [paso, setPaso] = useState(user?.debe_cambiar_password ? 1 : 2);
    
    // Estado Paso 1: Contraseña
    const [passwordData, setPasswordData] = useState({
        password_actual: '',
        nueva_password: '',
        nueva_password_confirmation: ''
    });
    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConf, setMostrarConf] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [requisitos, setRequisitos] = useState({
        minimo: false,
        mayuscula: false,
        minuscula: false,
        numero: false,
        simbolo: false
    });
    const [fuerzaTotal, setFuerzaTotal] = useState(0);

    // Estado Paso 2: Facial
    const [facialState, setFacialState] = useState({
        consentimiento: false,
        camaraActiva: false,
        modelosCargados: false,
        rostroDetectado: false,
        descriptor: null,
        imagenBase64: null,
        loading: false,
        error: null
    });
    const videoRef = useRef(null);
    const detectionInterval = useRef(null);

    // ======== LÓGICA PASO 1 ========
    useEffect(() => {
        const p = passwordData.nueva_password;
        const reqs = {
            minimo: p.length >= 8,
            mayuscula: /[A-Z]/.test(p),
            minuscula: /[a-z]/.test(p),
            numero: /[0-9]/.test(p),
            simbolo: /[\W]/.test(p)
        };
        setRequisitos(reqs);
        const fuerza = Object.values(reqs).filter(Boolean).length;
        setFuerzaTotal(fuerza);
    }, [passwordData.nueva_password]);

    const handlePasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const isPasswordFormValid = () => {
        return fuerzaTotal === 5 && 
               passwordData.nueva_password === passwordData.nueva_password_confirmation &&
               passwordData.password_actual.length > 0;
    };

    const submitPassword = async (e) => {
        e.preventDefault();
        if (!isPasswordFormValid()) return;

        setPasswordLoading(true);
        try {
            await api.post('/primer-login/cambiar-password', passwordData);
            toast.success('Contraseña actualizada correctamente', { style: { background: '#10b981', color: '#fff' } });
            
            // Refrescar el usuario o pasar al siguiente paso
            if (!user.rostro_registrado) {
                setPaso(2);
            } else {
                marcarPrimerLoginCompleto();
                navigate('/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al actualizar contraseña. Verifica tu contraseña actual.', { style: { background: '#ef4444', color: '#fff' } });
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // ======== LÓGICA PASO 2 ========
    useEffect(() => {
        const initModels = async () => {
            if (paso === 2 && !facialState.modelosCargados) {
                try {
                    await faceApiService.cargarModelos();
                    setFacialState(prev => ({ ...prev, modelosCargados: true }));
                } catch (error) {
                    setFacialState(prev => ({ ...prev, error: 'Error cargando modelos faciales.' }));
                }
            }
        };
        initModels();
    }, [paso, facialState.modelosCargados]);

    // Limpiar recursos al desmontar
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
            if (detectionInterval.current) clearInterval(detectionInterval.current);
        };
    }, []);

    useEffect(() => {
        if (facialState.camaraActiva && facialState.modelosCargados && videoRef.current && !facialState.imagenBase64) {
            // Iniciar intervalo de detección
            detectionInterval.current = setInterval(async () => {
                if (videoRef.current && !videoRef.current.paused) {
                    const descriptor = await faceApiService.detectarRostro(videoRef.current);
                    setFacialState(prev => ({ 
                        ...prev, 
                        rostroDetectado: descriptor !== null,
                        descriptor: descriptor
                    }));
                }
            }, 500);
        }

        return () => {
            if (detectionInterval.current) clearInterval(detectionInterval.current);
        };
    }, [facialState.camaraActiva, facialState.modelosCargados, facialState.imagenBase64]);

    useEffect(() => {
        if (paso === 2 && facialState.camaraActiva && !facialState.imagenBase64) {
            const startStream = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        await videoRef.current.play();
                    }
                } catch (err) {
                    setFacialState(prev => ({ ...prev, error: 'No se pudo acceder a la cámara. Por favor permite el acceso.', camaraActiva: false }));
                }
            };
            startStream();
        }
    }, [paso, facialState.camaraActiva, facialState.imagenBase64]);

    const iniciarCamara = () => {
        setFacialState(prev => ({ ...prev, camaraActiva: true, error: null }));
    };

    const detenerCamara = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (detectionInterval.current) clearInterval(detectionInterval.current);
        setFacialState(prev => ({ ...prev, camaraActiva: false, rostroDetectado: false }));
    };

    const capturarRostro = () => {
        if (!facialState.rostroDetectado || !facialState.descriptor || !videoRef.current) return;
        
        const base64 = faceApiService.capturarImagenBase64(videoRef.current);
        detenerCamara();
        
        setFacialState(prev => ({ 
            ...prev, 
            imagenBase64: base64
        }));
    };

    const reintentarCaptura = () => {
        setFacialState(prev => ({ ...prev, imagenBase64: null, descriptor: null }));
        iniciarCamara();
    };

    const guardarRostro = async () => {
        if (!facialState.imagenBase64 || !facialState.descriptor) return;

        setFacialState(prev => ({ ...prev, loading: true }));
        try {
            await api.post('/primer-login/registrar-rostro', {
                rostro_base64: facialState.imagenBase64,
                descriptor: facialState.descriptor
            });
            
            toast.success('Rostro registrado exitosamente', { style: { background: '#10b981', color: '#fff' } });
            marcarPrimerLoginCompleto();
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar el rostro', { style: { background: '#ef4444', color: '#fff' } });
            setFacialState(prev => ({ ...prev, loading: false }));
        }
    };

    // Helper de iconos de input
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

    return (
        <AuthBackground subtitle="Configuración inicial de seguridad">
            <div className="glass-card rounded-2xl p-8 sm:p-10 shadow-2xl relative w-full max-w-xl mx-auto">
                
                {/* Stepper visual */}
                <div className="absolute top-0 left-0 w-full flex">
                    <div className={`h-1 w-1/2 rounded-tl-2xl transition-colors duration-500 ${paso >= 1 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                    <div className={`h-1 w-1/2 rounded-tr-2xl transition-colors duration-500 ${paso >= 2 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                </div>

                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-4">
                            Paso {paso} de 2
                        </span>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {paso === 1 ? 'Configura tu cuenta' : 'Registro biométrico'}
                        </h2>
                        <p className="text-slate-400 text-sm mt-2">
                            {paso === 1 ? 'Por seguridad, debes cambiar tu contraseña temporal' : 'Tomaremos una foto de tu rostro para verificaciones futuras'}
                        </p>
                    </div>
                </div>

                {/* PASO 1: CONTRASEÑA */}
                {paso === 1 && (
                    <div className="animate-fade-in">
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-8 flex items-start">
                            <svg className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-amber-200/90 leading-relaxed">
                                Tu contraseña temporal fue enviada a tu correo corporativo al momento de crear la cuenta.
                            </p>
                        </div>

                        <form onSubmit={submitPassword}>
                            <FloatingInput
                                label="Contraseña temporal (Actual)"
                                name="password_actual"
                                type={mostrarActual ? "text" : "password"}
                                value={passwordData.password_actual}
                                onChange={handlePasswordChange}
                                required
                                disabled={passwordLoading}
                                rightIcon={renderEyeIcon(mostrarActual)}
                                onRightIconClick={() => setMostrarActual(!mostrarActual)}
                            />

                            <div className="h-px bg-white/10 my-6"></div>

                            <FloatingInput
                                label="Nueva contraseña"
                                name="nueva_password"
                                type={mostrarNueva ? "text" : "password"}
                                value={passwordData.nueva_password}
                                onChange={handlePasswordChange}
                                required
                                disabled={passwordLoading}
                                rightIcon={renderEyeIcon(mostrarNueva)}
                                onRightIconClick={() => setMostrarNueva(!mostrarNueva)}
                            />
                            
                            {/* Indicador de fuerza de contraseña */}
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
                                disabled={passwordLoading}
                                rightIcon={renderEyeIcon(mostrarConf)}
                                onRightIconClick={() => setMostrarConf(!mostrarConf)}
                                error={passwordData.nueva_password !== passwordData.nueva_password_confirmation && passwordData.nueva_password_confirmation.length > 0}
                            />
                            {passwordData.nueva_password !== passwordData.nueva_password_confirmation && passwordData.nueva_password_confirmation.length > 0 && (
                                <p className="text-xs text-red-400 -mt-3 mb-4 pl-4">Las contraseñas no coinciden.</p>
                            )}

                            <button
                                type="submit"
                                disabled={!isPasswordFormValid() || passwordLoading}
                                className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-6"
                            >
                                {passwordLoading ? (
                                    <>
                                        <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        Continuar al siguiente paso
                                        <svg className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {/* PASO 2: ROSTRO */}
                {paso === 2 && (
                    <div className="animate-fade-in">
                        {facialState.error && (
                            <div className="flex items-center p-3 text-sm text-red-400 border border-red-500/30 rounded-lg bg-red-500/10 mb-6">
                                <svg className="flex-shrink-0 inline w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">{facialState.error}</span>
                            </div>
                        )}

                        {!facialState.camaraActiva && !facialState.imagenBase64 && (
                            <div className="space-y-6">
                                <label className="flex items-start bg-slate-900/50 border border-white/10 p-4 rounded-xl cursor-pointer hover:border-purple-500/30 transition-colors">
                                    <div className="flex items-center h-5 mt-0.5">
                                        <input 
                                            type="checkbox"
                                            checked={facialState.consentimiento}
                                            onChange={(e) => setFacialState(prev => ({ ...prev, consentimiento: e.target.checked }))}
                                            className="focus:ring-purple-500 h-4 w-4 text-purple-600 border-slate-600 rounded bg-slate-800" 
                                        />
                                    </div>
                                    <div className="ml-3 text-sm">
                                        <span className="font-semibold text-slate-200">Consentimiento Biométrico</span>
                                        <p className="text-slate-400 mt-1">Acepto que mi información biométrica sea capturada y almacenada de forma cifrada con el único propósito de validar mi identidad en el sistema.</p>
                                    </div>
                                </label>
                                
                                <button 
                                    onClick={iniciarCamara}
                                    disabled={!facialState.consentimiento}
                                    className="group relative w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(147,51,234,0.4)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                                >
                                    Activar cámara
                                </button>
                            </div>
                        )}

                        {facialState.camaraActiva && !facialState.imagenBase64 && (
                            <div className="space-y-6">
                                <div className={`relative mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center aspect-video transition-all duration-300
                                    ${facialState.rostroDetectado ? 'border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-2 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'}`}
                                >
                                    {/* Viewfinder decorators */}
                                    <div className={`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg z-20 transition-colors ${facialState.rostroDetectado ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg z-20 transition-colors ${facialState.rostroDetectado ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg z-20 transition-colors ${facialState.rostroDetectado ? 'border-emerald-500' : 'border-purple-500'}`}></div>
                                    <div className={`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 rounded-br-lg z-20 transition-colors ${facialState.rostroDetectado ? 'border-emerald-500' : 'border-purple-500'}`}></div>

                                    {!facialState.modelosCargados && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-20">
                                            <Spinner className="w-8 h-8 mb-3" color="text-purple-500" />
                                            <span className="text-sm font-medium text-purple-400">Cargando IA...</span>
                                        </div>
                                    )}
                                    <video ref={videoRef} className="absolute top-0 left-0 w-full h-full object-cover transform -scale-x-100" autoPlay muted playsInline></video>
                                </div>
                                
                                <div className="flex justify-center h-8">
                                    {facialState.rostroDetectado ? (
                                        <span className="flex items-center text-emerald-400 font-medium bg-emerald-400/10 px-4 py-1.5 rounded-full text-sm border border-emerald-500/20">
                                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Rostro detectado correctamente
                                        </span>
                                    ) : (
                                        <span className="flex items-center text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full text-sm border border-purple-500/20">
                                            <svg className="animate-pulse w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            Enfoca tu rostro claramente
                                        </span>
                                    )}
                                </div>

                                <button 
                                    onClick={capturarRostro}
                                    disabled={!facialState.rostroDetectado}
                                    className="w-full flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed"
                                >
                                    Capturar Rostro
                                </button>
                            </div>
                        )}

                        {facialState.imagenBase64 && (
                            <div className="space-y-6">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] bg-black aspect-video flex justify-center items-center">
                                    <img src={facialState.imagenBase64} alt="Rostro capturado" className="w-full h-full object-cover transform -scale-x-100" />
                                    <div className="absolute top-3 right-3 bg-emerald-500/90 backdrop-blur text-black font-bold text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center">
                                        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Captura exitosa
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button 
                                        onClick={reintentarCaptura}
                                        disabled={facialState.loading}
                                        className="w-full sm:w-1/3 flex justify-center items-center h-12 py-2 px-4 border border-white/10 rounded-xl text-sm font-semibold text-white bg-white/5 hover:bg-white/10 focus:outline-none transition-all duration-300 disabled:opacity-50"
                                    >
                                        Reintentar
                                    </button>
                                    <button 
                                        onClick={guardarRostro}
                                        disabled={facialState.loading}
                                        className="w-full sm:w-2/3 flex justify-center items-center h-12 py-2 px-4 border border-transparent rounded-xl text-sm font-bold text-black bg-emerald-500 hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                                    >
                                        {facialState.loading ? (
                                            <>
                                                <Spinner className="w-5 h-5 mr-2" color="text-black" />
                                                Guardando...
                                            </>
                                        ) : (
                                            'Confirmar y entrar al sistema'
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer general */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center">
                    <button 
                        onClick={handleLogout}
                        className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center group"
                    >
                        <svg className="w-3 h-3 mr-1 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cancelar y cerrar sesión
                    </button>
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

export default PrimerLogin;
