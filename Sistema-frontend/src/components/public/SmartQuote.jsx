import React, { useState } from 'react';
import { Cpu, Zap, Activity, CalendarDays, CheckCircle2 } from 'lucide-react';

const SmartQuote = () => {
    const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'result'
    const [formData, setFormData] = useState({
        projectType: '',
        area: '',
        finishType: '',
        location: '',
        description: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGenerate = (e) => {
        e.preventDefault();
        if (!formData.projectType || !formData.area || !formData.finishType || !formData.location) return;
        
        setStatus('loading');
        
        // Simular tiempo de procesamiento del sistema
        setTimeout(() => {
            setStatus('result');
        }, 2000);
    };

    const resetForm = () => {
        setStatus('idle');
        setFormData({
            projectType: '',
            area: '',
            finishType: '',
            location: '',
            description: ''
        });
    };

    return (
        <section id="nosotros" className="py-24 lg:py-32 relative z-10">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                
                <div className="relative bg-slate-900/40 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-[0_0_40px_rgba(139,92,246,0.15)] overflow-hidden">
                    
                    {/* Header */}
                    <div className="border-b border-slate-800/80 p-8 md:p-10 bg-slate-950/50 flex flex-col md:flex-row items-center md:items-start gap-6 relative">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center border border-purple-500/40 shadow-[0_0_15px_rgba(139,92,246,0.3)] flex-shrink-0">
                            <Cpu className="text-purple-400" size={32} />
                        </div>
                        <div className="text-center md:text-left relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-2">Motor de Cotización Predictiva</h2>
                            <p className="text-slate-400 text-lg">
                                Nuestro sistema analiza variables de mercado en tiempo real, histórico climático y disponibilidad de suministros para generar proyecciones exactas en segundos.
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8 md:p-10">
                        {status === 'idle' && (
                            <form onSubmit={handleGenerate} className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Tipo de Proyecto <span className="text-emerald-500">*</span></label>
                                        <select 
                                            name="projectType"
                                            value={formData.projectType}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        >
                                            <option value="" disabled>Seleccione una categoría</option>
                                            <option value="vivienda_social">Vivienda Social</option>
                                            <option value="casa">Casa Privada</option>
                                            <option value="edificio">Edificio Residencial</option>
                                            <option value="comercial">Local Comercial</option>
                                            <option value="remodelacion">Remodelación Mayor</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Metraje Aproximado (m²) <span className="text-emerald-500">*</span></label>
                                        <input 
                                            type="number" 
                                            name="area"
                                            value={formData.area}
                                            onChange={handleChange}
                                            required
                                            min="1"
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder-slate-600"
                                            placeholder="Ej. 150"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Nivel de Acabados <span className="text-emerald-500">*</span></label>
                                        <select 
                                            name="finishType"
                                            value={formData.finishType}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                                        >
                                            <option value="" disabled>Seleccione calidad</option>
                                            <option value="basico">Estándar / Básico</option>
                                            <option value="medio">Medio / Confort</option>
                                            <option value="premium">Premium</option>
                                            <option value="lujo">Lujo / High-end</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Ubicación (Ciudad/Zona) <span className="text-emerald-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="location"
                                            value={formData.location}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder-slate-600"
                                            placeholder="Ciudad o región"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-400">Parámetros Adicionales (Opcional)</label>
                                    <textarea 
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows="3"
                                        className="w-full bg-slate-900 border border-slate-700 text-slate-100 px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors resize-none placeholder-slate-600"
                                        placeholder="Características especiales del terreno, accesos, etc."
                                    ></textarea>
                                </div>

                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-lg py-4 rounded-lg flex items-center justify-center transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-1"
                                    >
                                        <Zap className="mr-2" size={24} fill="currentColor" />
                                        Generar Proyección Exacta
                                    </button>
                                </div>
                            </form>
                        )}

                        {status === 'loading' && (
                            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                                <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-purple-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Cpu className="text-purple-400 animate-pulse" size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Procesando Red Neuronal</h3>
                                <div className="flex flex-col items-center gap-2 text-slate-400 text-sm font-mono mt-4">
                                    <p className="flex items-center"><Activity size={14} className="mr-2 text-emerald-500" /> Analizando fluctuaciones de mercado de materiales...</p>
                                    <p className="flex items-center animate-pulse"><Activity size={14} className="mr-2 text-emerald-500" /> Cruzando datos topológicos y logística local...</p>
                                </div>
                            </div>
                        )}

                        {status === 'result' && (
                            <div className="animate-fade-in">
                                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 md:p-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-purple-500"></div>
                                    
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-bold text-white">Reporte Predictivo</h3>
                                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                            <CheckCircle2 size={14} className="mr-1" /> Nivel Confianza: 94.7%
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Estimación de Presupuesto</p>
                                            <div className="text-3xl font-extrabold text-white flex items-end gap-2">
                                                $125M <span className="text-lg font-medium text-slate-400">- $140M</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 font-mono">Basado en metraje y acabados seleccionados</p>
                                        </div>
                                        
                                        <div className="bg-slate-950 rounded-xl p-5 border border-slate-800">
                                            <p className="text-slate-500 text-sm font-medium mb-1 uppercase tracking-wider">Proyección de Tiempo</p>
                                            <div className="text-3xl font-extrabold text-white flex items-end gap-2">
                                                32 <span className="text-lg font-medium text-slate-400">Semanas</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2 font-mono">Incluye margen logístico y clima histórico</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800">
                                        <button className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 px-4 rounded-lg transition-colors text-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                            Agendar Revisión Técnica
                                        </button>
                                        <button 
                                            onClick={resetForm}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors text-center"
                                        >
                                            Recalcular Variables
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-16 text-center">
                    <p className="text-slate-400 mb-6">¿Prefieres un enfoque tradicional o discutir requisitos específicos?</p>
                    <a href="#contacto" className="inline-flex items-center px-6 py-3 border border-slate-600 hover:bg-slate-800 text-white font-medium rounded-lg transition-all duration-300">
                        <CalendarDays className="mr-2" size={18} />
                        Agendar Cita con un Ingeniero
                    </a>
                </div>
            </div>
        </section>
    );
};

export default SmartQuote;
