import React from 'react';
import { Check } from '../icons/Icons';

const TimelineEstados = ({ estadoActual }) => {
    const todosLosEstados = [
        { id: 'candidato', label: 'Candidato' },
        { id: 'aceptado', label: 'Aceptado' },
        { id: 'en_construccion', label: 'En Construcción' },
        { id: 'vivienda_entregada', label: 'Vivienda Entregada' }
    ];

    const esInactivo = ['retirado', 'rechazado'].includes(estadoActual);
    
    // Determinar qué pasos están completados
    const currentIndex = esInactivo ? -1 : todosLosEstados.findIndex(e => e.id === estadoActual);

    return (
        <div className="w-full py-6">
            <div className="flex items-center justify-between relative">
                {/* Línea conectora */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 rounded-full z-0"></div>
                
                {/* Línea de progreso */}
                {!esInactivo && (
                    <div 
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-emerald-500 rounded-full z-0 transition-all duration-500"
                        style={{ width: `${(currentIndex / (todosLosEstados.length - 1)) * 100}%` }}
                    ></div>
                )}

                {/* Nodos */}
                {todosLosEstados.map((estado, index) => {
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                        <div key={estado.id} className="relative z-10 flex flex-col items-center">
                            <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300
                                    ${isCompleted 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'bg-slate-800 border-slate-600 text-slate-400'
                                    }
                                    ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}
                                `}
                            >
                                {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-xs">{index + 1}</span>}
                            </div>
                            <span 
                                className={`mt-2 text-xs font-medium absolute -bottom-6 w-24 text-center
                                    ${isCompleted ? 'text-slate-200' : 'text-slate-500'}
                                `}
                            >
                                {estado.label}
                            </span>
                        </div>
                    );
                })}
            </div>
            
            {esInactivo && (
                <div className="mt-8 text-center p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <span className="text-red-400 font-medium">
                        El proceso se encuentra detenido por estado: <span className="uppercase font-bold">{estadoActual}</span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default TimelineEstados;
