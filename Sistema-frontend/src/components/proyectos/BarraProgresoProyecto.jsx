import React from 'react';

const BarraProgresoProyecto = ({ porcentaje = 0, size = 'md', showLabel = true, className = '' }) => {
    const pct = Math.min(Math.max(porcentaje, 0), 100);
    
    const getColor = () => {
        if (pct >= 100) return 'from-emerald-500 to-emerald-400';
        if (pct >= 75) return 'from-blue-500 to-cyan-400';
        if (pct >= 50) return 'from-amber-500 to-yellow-400';
        if (pct >= 25) return 'from-orange-500 to-amber-400';
        return 'from-rose-500 to-orange-400';
    };

    const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' };

    return (
        <div className={`w-full ${className}`}>
            {showLabel && (
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-400">Avance</span>
                    <span className={`text-xs font-bold ${pct >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                        {pct.toFixed(1)}%
                    </span>
                </div>
            )}
            <div className={`w-full bg-slate-800 rounded-full overflow-hidden ${heights[size]}`}>
                <div
                    className={`${heights[size]} rounded-full bg-gradient-to-r ${getColor()} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
};

export default BarraProgresoProyecto;
