import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (id) => {
        setIsMobileMenuOpen(false);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const navLinks = [
        { name: 'Inicio', id: 'inicio' },
        { name: 'Servicios', id: 'servicios' },
        { name: 'Proyectos', id: 'proyectos' },
        { name: 'Nosotros', id: 'nosotros' },
        { name: 'Contacto', id: 'contacto' },
    ];

    return (
        <nav 
            className={`fixed w-full z-50 transition-all duration-300 ${
                isScrolled 
                ? 'bg-slate-950/80 backdrop-blur-md border-b border-slate-800 py-3' 
                : 'bg-transparent py-5'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex flex-col cursor-pointer transition-transform duration-300 hover:scale-105" onClick={() => scrollToSection('inicio')}>
                        <span className="text-2xl font-extrabold text-white leading-none tracking-tight">CA & KANAGF S.R.L.</span>
                        <span className="text-[0.65rem] font-bold text-emerald-500 tracking-widest mt-1 uppercase">Construcción & Tecnología</span>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <button 
                                key={link.id}
                                onClick={() => scrollToSection(link.id)}
                                className="text-slate-300 hover:text-emerald-400 font-medium transition-colors duration-300"
                            >
                                {link.name}
                            </button>
                        ))}
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-2.5 rounded-lg font-bold transition-colors duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                        >
                            Ingresar al sistema
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden flex items-center">
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-slate-300 hover:text-emerald-500 focus:outline-none transition-colors duration-300"
                        >
                            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 absolute w-full left-0 top-full shadow-2xl animate-fade-in-up">
                    <div className="px-4 pt-4 pb-8 space-y-2 flex flex-col">
                        {navLinks.map((link) => (
                            <button 
                                key={link.id}
                                onClick={() => scrollToSection(link.id)}
                                className="text-left text-slate-300 hover:text-emerald-500 hover:bg-slate-900/50 font-medium py-3 px-4 rounded-lg transition-all duration-300"
                            >
                                {link.name}
                            </button>
                        ))}
                        <div className="pt-4 px-4">
                            <button 
                                onClick={() => navigate('/login')}
                                className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-black px-5 py-3.5 rounded-lg font-bold transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                            >
                                Ingresar al sistema
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
