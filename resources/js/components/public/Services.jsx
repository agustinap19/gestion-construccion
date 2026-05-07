import React from 'react';
import { Home, Building2, Wrench, Cpu } from 'lucide-react';

const Services = () => {
    const services = [
        {
            id: 1,
            title: 'Viviendas Sociales',
            description: 'Desarrollos habitacionales optimizados mediante algoritmos de asignación espacial para maximizar el bienestar comunitario con mínima huella ecológica.',
            icon: <Home size={32} className="text-emerald-500" />,
            tech: 'Optimización Topológica'
        },
        {
            id: 2,
            title: 'Construcción Privada',
            description: 'Residencias y corporativos premium diseñados con modelos BIM avanzados, asegurando eficiencia térmica y acústica predictiva.',
            icon: <Building2 size={32} className="text-emerald-500" />,
            tech: 'BIM + Machine Learning'
        },
        {
            id: 3,
            title: 'Remodelaciones',
            description: 'Rehabilitación estructural y estética asistida por escaneo 3D LiDAR, permitiendo proyecciones de impacto antes de iniciar la obra.',
            icon: <Wrench size={32} className="text-emerald-500" />,
            tech: 'Escaneo 3D LiDAR'
        },
        {
            id: 4,
            title: 'Gestión Integral Avanzada',
            description: 'Supervisión de obra autónoma con drones y análisis de avance por visión computacional, reduciendo riesgos operativos a casi cero.',
            icon: <Cpu size={32} className="text-purple-500" />,
            tech: 'Visión Computacional'
        }
    ];

    return (
        <section id="servicios" className="py-24 lg:py-32 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-20">
                    <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                        Ecosistema de Construcción
                    </h2>
                    <div className="w-24 h-1 bg-emerald-500 mx-auto rounded shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                    <p className="mt-8 text-slate-400 text-lg md:text-xl leading-relaxed">
                        Nuestra metodología integra tecnología avanzada en cada fase del ciclo de vida del proyecto, 
                        desde la concepción arquitectónica hasta la entrega final.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {services.map((service) => (
                        <div 
                            key={service.id} 
                            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 md:p-10 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:border-t-2 hover:border-t-emerald-500 hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.15)] group relative overflow-hidden"
                        >
                            {/* Subtle background glow on hover */}
                            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl transition-all duration-500 group-hover:bg-emerald-500/10"></div>
                            
                            <div className="flex items-start justify-between mb-6 relative z-10">
                                <div className="w-14 h-14 bg-slate-800/80 rounded-xl flex items-center justify-center border border-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                    {service.icon}
                                </div>
                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300">
                                    {service.tech}
                                </span>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white mb-4 relative z-10">{service.title}</h3>
                            <p className="text-slate-400 leading-relaxed relative z-10">
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
