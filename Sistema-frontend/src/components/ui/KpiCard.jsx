import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function KpiCard({ title, value, subtitle, icon, color = "violet" }) {
    // Definimos esquemas de color
    const colorClasses = {
        violet: "from-violet-500/10 to-purple-500/5 border-violet-500/20 text-violet-400",
        emerald: "from-emerald-500/10 to-teal-500/5 border-emerald-500/20 text-emerald-400",
        amber: "from-amber-500/10 to-orange-500/5 border-amber-500/20 text-amber-400",
        blue: "from-blue-500/10 to-cyan-500/5 border-blue-500/20 text-blue-400",
        rose: "from-rose-500/10 to-pink-500/5 border-rose-500/20 text-rose-400",
    };

    const activeColor = colorClasses[color] || colorClasses.violet;
    
    // Extraer color puro para el gráfico
    const strokeColors = {
        violet: "#a78bfa",
        emerald: "#34d399",
        amber: "#fbbf24",
        blue: "#60a5fa",
        rose: "#fb7185",
        red: "#f87171"
    };

    // Datos falsos para el sparkline si no hay chartData pero queremos el efecto
    const sparklineData = Array.from({length: 10}, () => ({ value: Math.random() * 100 }));

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-3xl border ${activeColor} bg-gradient-to-br backdrop-blur-xl p-6 shadow-xl`}
        >
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white/60">{title}</p>
                    <div className={`p-2 rounded-xl bg-white/5 border border-white/10 ${activeColor.split(' ').pop()}`}>
                        {icon}
                    </div>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
                        {subtitle && (
                            <p className="text-xs text-white/40 mt-1 font-medium">{subtitle}</p>
                        )}
                    </div>
                    <div className="w-20 h-10 opacity-70">
                        <LineChart width={80} height={40} data={sparklineData}>
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke={strokeColors[color] || strokeColors.violet} 
                                strokeWidth={2} 
                                dot={false} 
                                isAnimationActive={true}
                            />
                        </LineChart>
                    </div>
                </div>
            </div>

            {/* Efecto de resplandor holográfico sutil */}
            <div className={`absolute -right-10 -bottom-10 w-32 h-32 rounded-full blur-[50px] opacity-20 ${activeColor.split(' ')[0].replace('from-', 'bg-')}`} />
        </motion.div>
    );
}
