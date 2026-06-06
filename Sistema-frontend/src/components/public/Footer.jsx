import React from 'react';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Footer = () => {
    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <footer className="bg-black pt-16 pb-8 text-gray-300 relative border-t border-slate-900">
            {/* Gradiente superior emerald a purple */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-purple-500"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    
                    {/* Columna 1: Info Empresa */}
                    <div>
                        <div className="mb-6">
                            <span className="text-2xl font-extrabold text-white tracking-tight block leading-none">CA & KANAGF S.R.L.</span>
                            <span className="text-xs font-bold text-emerald-500 tracking-widest mt-1 block uppercase">Construcción & Tecnología</span>
                        </div>
                        <p className="text-slate-400 mb-6 leading-relaxed">
                            Transformamos la ingeniería civil integrando análisis de datos, modelos predictivos y optimización estructural en cada desarrollo.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-300 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-300 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-300 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all duration-300 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                            </a>
                        </div>
                    </div>

                    {/* Columna 2: Enlaces Rápidos */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-6 flex items-center">
                            <span className="w-3 h-3 bg-purple-500 mr-3 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.8)]"></span>
                            Navegación
                        </h3>
                        <ul className="space-y-3 font-mono text-sm">
                            <li>
                                <button onClick={() => scrollToSection('inicio')} className="text-slate-400 hover:text-emerald-500 transition-colors flex items-center">
                                    <span className="mr-2 text-emerald-500/50">/</span> Inicio
                                </button>
                            </li>
                            <li>
                                <button onClick={() => scrollToSection('servicios')} className="text-slate-400 hover:text-emerald-500 transition-colors flex items-center">
                                    <span className="mr-2 text-emerald-500/50">/</span> Servicios
                                </button>
                            </li>
                            <li>
                                <button onClick={() => scrollToSection('proyectos')} className="text-slate-400 hover:text-emerald-500 transition-colors flex items-center">
                                    <span className="mr-2 text-emerald-500/50">/</span> Proyectos
                                </button>
                            </li>
                            <li>
                                <button onClick={() => scrollToSection('nosotros')} className="text-slate-400 hover:text-emerald-500 transition-colors flex items-center">
                                    <span className="mr-2 text-emerald-500/50">/</span> Cotizador Predictivo
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* Columna 3: Contacto */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-6 flex items-center">
                            <span className="w-3 h-3 bg-emerald-500 mr-3 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                            Contacto
                        </h3>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start">
                                <MapPin size={18} className="text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span className="text-slate-400">Hub Tecnológico Constructivo, Piso 8, Distrito Financiero.</span>
                            </li>
                            <li className="flex items-center">
                                <Phone size={18} className="text-emerald-500 mr-3 flex-shrink-0" />
                                <span className="text-slate-400 font-mono">+56 2 8990 4000</span>
                            </li>
                            <li className="flex items-center">
                                <Mail size={18} className="text-emerald-500 mr-3 flex-shrink-0" />
                                <span className="text-slate-400">sistema@cakanagf.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* Columna 4: Horario */}
                    <div>
                        <h3 className="text-white text-lg font-bold mb-6 flex items-center">
                            <span className="w-3 h-3 bg-slate-500 mr-3 rounded-full"></span>
                            Operaciones
                        </h3>
                        <ul className="space-y-4 mb-6 text-sm">
                            <li className="flex items-start">
                                <Clock size={18} className="text-emerald-500 mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-white font-bold">Lunes - Viernes</p>
                                    <p className="text-slate-400 font-mono">08:00 - 18:00</p>
                                </div>
                            </li>
                        </ul>
                        
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                            <div className="flex items-center mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2 shadow-[0_0_5px_#22c55e]"></div>
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Estado de Sistemas</span>
                            </div>
                            <p className="text-xs text-slate-500 font-mono">Motor de cotización operativo. Todos los sistemas en línea.</p>
                        </div>
                    </div>

                </div>

                <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p className="text-slate-500 text-sm mb-4 md:mb-0">
                        &copy; 2025 CA & KANAGF S.R.L. Todos los derechos reservados.
                    </p>
                    <p className="text-slate-500 text-xs font-mono tracking-wide text-center md:text-right max-w-sm">
                        Integrando Machine Learning y Programación Lineal en la Ingeniería Civil.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
