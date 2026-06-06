import React, { useState, useEffect } from 'react';
import proyectoService from '../../services/proyectoService';

const SelectorProyectoSocial = ({ value, onChange, placeholder = "Seleccionar proyecto...", className = "" }) => {
    const [proyectos, setProyectos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProyectos = async () => {
            try {
                const data = await proyectoService.listarSociales();
                setProyectos(data);
            } catch (error) {
                console.error("Error al cargar proyectos sociales:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProyectos();
    }, []);

    return (
        <div className={`relative ${className}`}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                className="w-full appearance-none bg-slate-900 border border-slate-700 text-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
            >
                <option value="">{loading ? "Cargando..." : placeholder}</option>
                {proyectos.map(p => (
                    <option key={p.id} value={p.id}>
                        {p.codigo} - {p.nombre} ({p.entidad_estatal?.nombre})
                    </option>
                ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
};

export default SelectorProyectoSocial;
