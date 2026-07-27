import React from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import Card from '../ui/Card';

const KpiCard = ({ title, value, subtitle, icon, delay = 0, colorClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" }) => {
    return (
        <Card className="animate-slide-in-right overflow-hidden relative" style={{ animationDelay: `${delay}s` }}>
            {/* Fondo sutil (glass) */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/10 dark:from-slate-800/40 dark:to-slate-800/10 pointer-events-none" />
            
            <div className="relative z-10 flex items-center justify-between mb-4">
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</h3>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                    {icon}
                </div>
            </div>
            
            <div className="relative z-10 text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {typeof value === 'number' ? (
                    <CountUp end={value} duration={2} separator="," />
                ) : (
                    value
                )}
            </div>
            
            <div className="relative z-10 text-sm text-slate-500 dark:text-slate-400">
                {subtitle}
            </div>
        </Card>
    );
};

export default KpiCard;
