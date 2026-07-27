import React, { useEffect, useRef, useState } from 'react';
import Gantt from 'frappe-gantt';
import "../../../node_modules/frappe-gantt/dist/frappe-gantt.css";
import { Calendar } from '../../components/icons/Icons';

export default function VistaGanttAsignaciones({ asignaciones, onTaskClick }) {
    const ganttRef = useRef(null);
    const [ganttInst, setGanttInst] = useState(null);
    const [viewMode, setViewMode] = useState('Day');

    useEffect(() => {
        if (!ganttRef.current || !asignaciones || asignaciones.length === 0) return;

        // frappe-gantt no limpia el contenedor al reinstanciar. Sin esto, cada vez que
        // el padre re-renderiza (onTaskClick se recrea en cada render) se apila una
        // grilla nueva encima de la anterior — esa es la causa de las fechas duplicadas.
        ganttRef.current.innerHTML = '';

        // Transformar asignaciones al formato de frappe-gantt
        const tasks = asignaciones.map((asig, i) => ({
            id: `Task_${asig.id}`,
            name: `${asig.proyecto?.nombre || 'Vivienda'} - ${asig.activo?.codigo || 'Activo'}`,
            start: asig.fecha_inicio,
            end: asig.fecha_fin_estimada,
            progress: asig.estado === 'completada' ? 100 : asig.estado === 'activa' ? 50 : 0,
            dependencies: i > 0 ? `Task_${asignaciones[i-1].id}` : '',
            custom_class: `gantt-${asig.estado}`
        }));

        const gantt = new Gantt(ganttRef.current, tasks, {
            view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month'],
            view_mode: viewMode,
            language: 'es',
            on_click: (task) => onTaskClick && onTaskClick(task),
            on_date_change: (task, start, end) => {
                console.log(task.name + ' movido a ' + start + ' - ' + end);
                // Aquí iría la llamada a la API para actualizar la fecha real en BD
            },
            on_progress_change: (task, progress) => {
                console.log(task.name + ' progreso: ' + progress);
            }
        });

        setGanttInst(gantt);

        return () => {
            if (ganttRef.current) ganttRef.current.innerHTML = '';
        };
    }, [asignaciones, viewMode, onTaskClick]);

    return (
        <div className="w-full bg-[#0d0f1a] rounded-3xl border border-white/10 p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-400" />
                    Timeline de Asignaciones
                </h2>
                <div className="flex gap-2">
                    {['Day', 'Week', 'Month'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                viewMode === mode 
                                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30' 
                                    : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {mode === 'Day' ? 'Día' : mode === 'Week' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/10 vrp-gantt-dark">
                <div ref={ganttRef} />
            </div>

            <style>{`
                /* frappe-gantt expone su tema vía variables CSS (ver dist/frappe-gantt.css).
                   El bloque anterior apuntaba a selectores que no existen en esta versión
                   de la librería (.gantt .grid-header, etc.), por eso nunca se aplicaba y
                   se veía el tema claro por defecto con el botón "Today" sin estilo. */
                .vrp-gantt-dark .gantt-container {
                    --g-header-background: #11131f;
                    --g-row-color: #0d0f1a;
                    --g-row-border-color: rgba(255,255,255,0.08);
                    --g-border-color: rgba(255,255,255,0.08);
                    --g-tick-color: rgba(255,255,255,0.05);
                    --g-tick-color-thick: rgba(255,255,255,0.12);
                    --g-text-dark: #ffffff;
                    --g-text-light: #ffffff;
                    --g-text-muted: rgba(255,255,255,0.45);
                    --g-bar-color: #8b5cf6;
                    --g-bar-border: #6d28d9;
                    --g-progress-color: #a78bfa;
                    --g-expected-progress: rgba(167,139,250,0.35);
                    --g-handle-color: #e5e5e5;
                    --g-actions-background: rgba(255,255,255,0.06);
                    --g-popup-actions: #1a1c2e;
                    --g-today-highlight: #8b5cf6;
                    --g-weekend-highlight-color: rgba(255,255,255,0.03);
                    --g-weekend-label-color: rgba(255,255,255,0.1);
                    background: #0d0f1a;
                }
                .vrp-gantt-dark .gantt-container .popup-wrapper {
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .vrp-gantt-dark .gantt .bar-wrapper { cursor: pointer; }
                .vrp-gantt-dark .gantt .bar-wrapper.gantt-planificada .bar { fill: #3b82f6; stroke: #1d4ed8; }
                .vrp-gantt-dark .gantt .bar-wrapper.gantt-activa .bar { fill: #8b5cf6; stroke: #6d28d9; }
                .vrp-gantt-dark .gantt .bar-wrapper.gantt-completada .bar { fill: #10b981; stroke: #047857; }
                .vrp-gantt-dark .gantt .bar-wrapper.gantt-cancelada .bar { fill: #ef4444; stroke: #b91c1c; }
            `}</style>
        </div>
    );
}
