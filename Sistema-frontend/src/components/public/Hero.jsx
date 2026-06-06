import React, { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Componente para las partículas animadas
const Particles = () => {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        // Generar partículas aleatorias
        const newParticles = Array.from({ length: 40 }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            size: Math.random() * 3 + 1,
            animationDuration: `${Math.random() * 10 + 10}s`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: Math.random() * 0.5 + 0.1,
        }));
        setParticles(newParticles);
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-full bg-blue-500"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        opacity: p.opacity,
                        animation: `float ${p.animationDuration} ease-in-out infinite`,
                        animationDelay: p.animationDelay,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    33% { transform: translateY(-20px) translateX(10px); }
                    66% { transform: translateY(15px) translateX(-15px); }
                }
            `}</style>
        </div>
    );
};

const Hero = () => {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <section id="inicio" className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">
            {/* Video Background */}
            <video 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
                src="/videos/hero-bg.mp4"
            />
            
            {/* Overlay Oscuro */}
            <div className="absolute inset-0 bg-black/70"></div>
            
            {/* Partículas tecnológicas */}
            <Particles />
            
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
                
                {/* Badge AI */}
                <div className="mb-6 inline-flex items-center px-4 py-1.5 rounded-full border border-purple-500/50 bg-purple-500/10 backdrop-blur-sm shadow-[0_0_15px_rgba(139,92,246,0.3)] animate-fade-in-up">
                    <span className="text-purple-400 text-sm font-medium tracking-wide">
                        ✦ Constructora y Consultora
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    CA & KANAGF S.R.L.
                </h1>
                
                <p className="mt-4 max-w-3xl mx-auto text-lg md:text-xl text-slate-300 mb-12 leading-relaxed font-light animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    Más de 15 años construyendo el futuro con precisión y tecnología predictiva. 
                    Optimizamos recursos, tiempos y costos a través de algoritmos avanzados.
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                    <button 
                        onClick={() => scrollToSection('nosotros')}
                        className="w-full sm:w-auto px-8 py-4 border-2 border-purple-500 hover:bg-purple-500/20 text-white font-bold rounded-lg transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.5)] hover:shadow-[0_0_25px_rgba(139,92,246,0.7)] hover:-translate-y-1"
                    >
                        Cotizar Proyecto
                    </button>
                    <button 
                        onClick={() => scrollToSection('proyectos')}
                        className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-bold rounded-lg transition-all duration-300 hover:-translate-y-1 group flex items-center justify-center"
                    >
                        <span>Ver Proyectos</span>
                        <div className="h-0.5 w-0 bg-emerald-500 absolute bottom-3 left-1/2 -translate-x-1/2 transition-all duration-300 group-hover:w-1/2"></div>
                    </button>
                </div>
            </div>

            {/* Scroll Down Arrow */}
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20 animate-bounce">
                <button 
                    onClick={() => scrollToSection('servicios')}
                    className="text-slate-400 hover:text-emerald-500 transition-colors duration-300"
                    aria-label="Scroll down"
                >
                    <ChevronDown size={40} strokeWidth={1.5} />
                </button>
            </div>
        </section>
    );
};

export default Hero;
