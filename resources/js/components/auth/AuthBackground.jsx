import React from 'react';

const AuthBackground = ({ children, subtitle }) => {
    // Generar partículas aleatorias para el fondo
    const generateParticles = (count) => {
        return Array.from({ length: count }).map((_, i) => {
            const isEmerald = i % 2 === 0;
            const size = Math.random() * 4 + 2; // 2px a 6px
            const top = Math.random() * 100;
            const left = Math.random() * 100;
            const animationDuration = Math.random() * 10 + 10; // 10s a 20s
            const animationDelay = Math.random() * 5;
            
            return (
                <div
                    key={i}
                    className={`absolute rounded-full opacity-30 animate-float`}
                    style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        top: `${top}%`,
                        left: `${left}%`,
                        backgroundColor: isEmerald ? '#10b981' : '#a855f7',
                        animationDuration: `${animationDuration}s`,
                        animationDelay: `${animationDelay}s`,
                        boxShadow: `0 0 10px ${isEmerald ? 'rgba(16,185,129,0.8)' : 'rgba(168,85,247,0.8)'}`
                    }}
                />
            );
        });
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 font-sans text-slate-50 selection:bg-purple-500/30">
            
            {/* ESTILOS INLINE PARA ANIMACIONES (no dependientes de tailwind.config) */}
            <style>{`
                @keyframes panGrid {
                    0% { background-position: 0 0; }
                    100% { background-position: 50px 50px; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    33% { transform: translateY(-20px) translateX(10px); }
                    66% { transform: translateY(15px) translateX(-15px); }
                }
                .animate-grid {
                    animation: panGrid 40s linear infinite;
                }
                .animate-float {
                    animation-name: float;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                }
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                }
                
                /* Autofill Fixes for Dark Mode and Floating Labels */
                input:-webkit-autofill,
                input:-webkit-autofill:hover, 
                input:-webkit-autofill:focus, 
                input:-webkit-autofill:active {
                    -webkit-box-shadow: 0 0 0 100px transparent inset !important;
                    -webkit-text-fill-color: #f1f5f9 !important;
                    transition: background-color 5000s ease-in-out 0s;
                }
                
                input:-webkit-autofill ~ label,
                input:-webkit-autofill:hover ~ label,
                input:-webkit-autofill:focus ~ label {
                    transform: translateY(-0.875rem) scale(0.75) !important;
                }
            `}</style>

            {/* COLUMNA IZQUIERDA: Branding (Oculta en md:hidden) */}
            <div className="hidden md:flex md:w-[60%] relative overflow-hidden flex-col items-center justify-center p-12">
                {/* Capa base muy oscura */}
                <div className="absolute inset-0 bg-slate-950 z-0"></div>
                
                {/* Cuadrícula arquitectónica animada */}
                <div 
                    className="absolute inset-0 z-10 animate-grid opacity-20"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, rgba(168,85,247,0.1) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(168,85,247,0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                ></div>

                {/* Resplandores (Glows) abstractos */}
                <div className="absolute top-1/4 left-1/4 w-[40vw] h-[40vw] bg-purple-600/10 rounded-full blur-[120px] z-10 mix-blend-screen pointer-events-none"></div>
                <div className="absolute bottom-1/4 right-1/4 w-[30vw] h-[30vw] bg-emerald-500/10 rounded-full blur-[100px] z-10 mix-blend-screen pointer-events-none"></div>

                {/* Partículas flotantes */}
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                    {generateParticles(15)}
                </div>

                {/* Contenido Central */}
                <div className="relative z-30 flex flex-col items-center text-center max-w-2xl">
                    <h1 className="text-6xl font-bold tracking-tight text-white mb-2 drop-shadow-2xl">
                        CA & KANAGF
                    </h1>
                    <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                        S.R.L.
                    </h2>
                    
                    <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-transparent mt-8 mb-6 rounded-full"></div>
                    
                    <p className="text-xl text-slate-400 font-light tracking-wide">
                        {subtitle || "Motor de Gestión Operativa y Predictiva"}
                    </p>

                    {/* Badges Tecnológicos */}
                    <div className="flex flex-wrap justify-center gap-4 mt-12">
                        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Inteligencia Artificial</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Datos Cifrados</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span className="text-xs font-medium text-slate-300 uppercase tracking-wider">Seguridad Multi-Factor</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUMNA DERECHA: Formulario */}
            <div className="w-full md:w-[40%] flex min-h-screen bg-black items-center justify-center p-6 sm:p-12 relative z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>

        </div>
    );
};

export default AuthBackground;
