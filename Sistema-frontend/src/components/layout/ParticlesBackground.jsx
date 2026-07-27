import React, { useEffect } from 'react';
import { tsParticles } from '@tsparticles/engine';
import { loadSlim } from '@tsparticles/slim';
import { useTheme } from '../../context/ThemeContext';

const ParticlesBackground = () => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Colores más vibrantes para que el efecto sea muy notorio
    const lineColor = isDarkMode ? '#10b981' : '#334155'; // Emerald
    const particleColor = isDarkMode ? '#10b981' : '#475569';

    useEffect(() => {
        const initParticles = async () => {
            await loadSlim(tsParticles);
            await tsParticles.load("mi-contenedor-particulas", {
                fullScreen: { enable: false }, // Forzar a quedarse en el div
                background: {
                    color: {
                        value: 'transparent',
                    },
                },
                    fpsLimit: 60,
                    interactivity: {
                        events: {
                            onHover: {
                                enable: true,
                                mode: 'grab',
                            },
                            resize: true,
                        },
                        modes: {
                            grab: {
                                distance: 200,
                                links: {
                                    opacity: 0.8,
                                    color: '#10b981',
                                },
                            },
                        },
                    },
                    particles: {
                        color: {
                            value: particleColor,
                        },
                        links: {
                            color: lineColor,
                            distance: 150,
                            enable: true,
                            opacity: isDarkMode ? 0.6 : 0.3,
                            width: 1.5,
                        },
                        move: {
                            direction: 'none',
                            enable: true,
                            outModes: {
                                default: 'bounce',
                            },
                            random: false,
                            speed: 1.2,
                            straight: false,
                        },
                        number: {
                            density: {
                                enable: true,
                                area: 800,
                            },
                            value: 90,
                        },
                        opacity: {
                            value: isDarkMode ? 0.8 : 0.6,
                        },
                        shape: {
                            type: 'circle',
                        },
                        size: {
                            value: { min: 2, max: 4 },
                        },
                    },
                    detectRetina: true,
            });
        };

        initParticles();

        return () => {
            const container = tsParticles.domItem("mi-contenedor-particulas");
            if (container) container.destroy();
        };
    }, [isDarkMode, lineColor, particleColor]);

    return (
        <div 
            className="absolute inset-0 pointer-events-none overflow-hidden" 
            style={{ 
                zIndex: -10, 
                backgroundColor: isDarkMode ? '#080c15' : '#f8fafc' 
            }} 
            aria-hidden
        >
            <style>
                {`
                /* Forzar brutalmente a la capa más profunda */
                #mi-contenedor-particulas canvas, .tsparticles-canvas-el {
                    z-index: -10 !important;
                    position: absolute !important;
                    pointer-events: none !important;
                }
                `}
            </style>
            
            <div 
                id="mi-contenedor-particulas" 
                className="absolute inset-0 pointer-events-none" 
            />
            
            {/* Mantener los blobs difuminados para darle ese toque moderno */}
            <div
                className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] max-w-[700px] max-h-[700px] rounded-full animate-blob-1 opacity-40 dark:opacity-60 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 40% 40%, oklch(62% 0.2 145 / 0.05), transparent 70%)',
                    filter: 'blur(70px)',
                }}
            />
            <div
                className="absolute -bottom-[25%] -right-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full animate-blob-2 opacity-30 dark:opacity-50 pointer-events-none"
                style={{
                    background: 'radial-gradient(circle at 60% 60%, oklch(55% 0.2 290 / 0.04), transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />
        </div>
    );
};

export default ParticlesBackground;
