import React from 'react';
import { Check } from '../../components/icons/Icons';

const PASOS = [
    { id: 'generada',       label: 'Generada' },
    { id: 'impresa',        label: 'Impresa' },
    { id: 'firmada_subida', label: 'Firmada' },
    { id: 'aprobada',       label: 'Aprobada' },
    { id: 'entregada',      label: 'Entregada' },
    { id: 'devuelta',       label: 'Devuelta' },
];

export default function TimelineEstadoActa({ estadoActual, onStepClick }) {
    const indiceActual = PASOS.findIndex(p => p.id === estadoActual);

    return (
        <div className="flex items-start w-full relative">
            {PASOS.map((paso, i) => {
                const completado = i < indiceActual;
                const actual = i === indiceActual;
                const clickable = !!onStepClick && (completado || actual);

                return (
                    <React.Fragment key={paso.id}>
                        <div className="flex flex-col items-center shrink-0 w-12 z-10">
                            <button
                                type="button"
                                disabled={!clickable}
                                onClick={() => clickable && onStepClick(paso.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all shrink-0
                                    ${completado
                                        ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                                        : actual
                                            ? 'border-violet-400 text-violet-300 bg-violet-500/20 shadow-[0_0_15px_rgba(139,92,246,0.4)]'
                                            : 'border-white/10 text-white/30 bg-white/5'
                                    } ${clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                            >
                                {completado ? <Check className="w-4 h-4" /> : <span className="text-[11px] font-bold">{i + 1}</span>}
                            </button>
                            <span className={`mt-2.5 text-[10px] font-semibold text-center leading-tight tracking-wide uppercase
                                ${actual ? 'text-violet-300' : completado ? 'text-emerald-400' : 'text-white/30'}`}>
                                {paso.label}
                            </span>
                        </div>
                        {i < PASOS.length - 1 && (
                            <div className="flex-1 flex items-center px-1">
                                <div className={`w-full h-1 rounded-full ${i < indiceActual ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
