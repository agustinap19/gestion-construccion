import React from 'react';
import Card from '../ui/Card';
import { Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const MOCK_EVENTS = [
    { id: 1, title: 'Cierre Mensual Almacén Central', date: 'Hoy, 18:00', type: 'warning' },
    { id: 2, title: 'Reunión de Avance Proyecto Social VRP', date: 'Mañana, 09:00', type: 'info' },
    { id: 3, title: 'Vencimiento Mantenimiento Retroexcavadora', date: 'En 3 días', type: 'danger' },
    { id: 4, title: 'Entrega Fase 1 Proyecto Norte', date: 'Próxima semana', type: 'success' },
];

const EventosTimeline = () => {
    return (
        <Card className="h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Próximos Eventos</h3>
                <button className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">Ver Calendario Completo</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {MOCK_EVENTS.map((evento) => (
                    <div key={evento.id} className="relative pl-6 pb-4 border-l-2 border-slate-200 dark:border-slate-700 last:border-0 last:pb-0">
                        <div className="absolute -left-[9px] top-0 bg-white dark:bg-[#121212]">
                            {evento.type === 'warning' && <Clock className="text-amber-500 bg-white dark:bg-[#121212]" size={16} />}
                            {evento.type === 'info' && <Calendar className="text-blue-500 bg-white dark:bg-[#121212]" size={16} />}
                            {evento.type === 'danger' && <AlertTriangle className="text-red-500 bg-white dark:bg-[#121212]" size={16} />}
                            {evento.type === 'success' && <CheckCircle className="text-emerald-500 bg-white dark:bg-[#121212]" size={16} />}
                        </div>
                        <div className="ml-2">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{evento.title}</h4>
                            <p className="text-xs text-slate-500 mt-1">{evento.date}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default EventosTimeline;
