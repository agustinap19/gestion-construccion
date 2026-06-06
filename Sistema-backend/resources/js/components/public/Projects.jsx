import React, { useState } from 'react';
import { MapPin, Maximize } from 'lucide-react';

const Projects = () => {
    const [filter, setFilter] = useState('Todos');

    const categories = ['Todos', 'Viviendas Sociales', 'Construcción Privada', 'Remodelaciones'];

    const projects = [
        {
            id: 1,
            title: 'Complejo "Amanecer BIM"',
            category: 'Viviendas Sociales',
            location: 'Zona Norte, Ciudad',
            area: '12,500 m²',
            imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
            description: 'Optimización térmica mediante análisis avanzado.'
        },
        {
            id: 2,
            title: 'Torre Corporativa "Neural"',
            category: 'Construcción Privada',
            location: 'Distrito Financiero',
            area: '35,000 m²',
            imageUrl: 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop',
            description: 'Certificación LEED Platino Automática.'
        },
        {
            id: 3,
            title: 'Rehabilitación Histórica 3D',
            category: 'Remodelaciones',
            location: 'Centro Histórico',
            area: '4,200 m²',
            imageUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2671&auto=format&fit=crop',
            description: 'Restauración guiada por Escaneo LiDAR.'
        },
        {
            id: 4,
            title: 'Barrio Cerrado "Algoritmo"',
            category: 'Construcción Privada',
            location: 'Sector Este',
            area: '55,000 m²',
            imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop',
            description: 'Diseño paramétrico de vías y lotes.'
        },
        {
            id: 5,
            title: 'Villa Social Inteligente',
            category: 'Viviendas Sociales',
            location: 'Periferia Sur',
            area: '18,000 m²',
            imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1974&auto=format&fit=crop',
            description: 'Asignación de recursos mediante Machine Learning.'
        },
        {
            id: 6,
            title: 'Conversión Industrial a Loft',
            category: 'Remodelaciones',
            location: 'Zona Puerto',
            area: '6,500 m²',
            imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356f12?q=80&w=2071&auto=format&fit=crop',
            description: 'Análisis de tensión estructural algorítmica.'
        }
    ];

    const filteredProjects = filter === 'Todos' 
        ? projects 
        : projects.filter(p => p.category === filter);

    return (
        <section id="proyectos" className="py-24 lg:py-32 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">Proyectos Destacados</h2>
                        <div className="w-24 h-1 bg-emerald-500 rounded shadow-[0_0_10px_rgba(16,185,129,0.5)] mb-6"></div>
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Obras ejecutadas utilizando nuestra metodología de precisión predictiva, asegurando
                            resultados inigualables en tiempo y presupuesto.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat)}
                                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                                    filter === cat 
                                    ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div 
                            key={project.id} 
                            className="group relative h-96 rounded-2xl overflow-hidden cursor-pointer"
                        >
                            {/* Imagen de fondo ocupando todo */}
                            <img 
                                src={project.imageUrl} 
                                alt={project.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                loading="lazy"
                            />
                            
                            {/* Overlay degradado oscuro */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300"></div>
                            
                            {/* Borde morado glow en hover */}
                            <div className="absolute inset-0 border-2 border-transparent group-hover:border-purple-500/50 rounded-2xl transition-colors duration-300 pointer-events-none"></div>

                            {/* Contenido en hover */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-end transform translate-y-8 group-hover:translate-y-0 transition-transform duration-300">
                                <span className="inline-block px-3 py-1 bg-purple-500/20 border border-purple-500/50 text-purple-300 text-xs font-bold rounded-full mb-3 w-max backdrop-blur-sm shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                                    {project.category}
                                </span>
                                
                                <h3 className="text-2xl font-bold text-white mb-2">{project.title}</h3>
                                <p className="text-slate-300 text-sm mb-4 line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
                                    {project.description}
                                </p>
                                
                                <div className="flex items-center justify-between text-xs text-slate-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                                    <div className="flex items-center">
                                        <MapPin size={14} className="mr-1.5 text-emerald-500" />
                                        {project.location}
                                    </div>
                                    <div className="flex items-center">
                                        <Maximize size={14} className="mr-1.5 text-emerald-500" />
                                        {project.area}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Projects;
