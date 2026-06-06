import React from 'react';
import Badge from '../ui/Badge';

const ESTADO_CONFIG = {
    borrador:      { label: 'Borrador',      variant: 'secondary', dot: 'bg-slate-400' },
    planificacion: { label: 'Planificación', variant: 'info',      dot: 'bg-blue-400' },
    en_ejecucion:  { label: 'En Ejecución',  variant: 'success',   dot: 'bg-emerald-400' },
    pausado:       { label: 'Pausado',        variant: 'warning',   dot: 'bg-amber-400' },
    finalizado:    { label: 'Finalizado',     variant: 'primary',   dot: 'bg-violet-400' },
    cancelado:     { label: 'Cancelado',      variant: 'danger',    dot: 'bg-rose-400' },
};

const EstadoProyectoBadge = ({ estado, size = 'sm', showDot = true }) => {
    const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.borrador;
    return (
        <Badge variant={config.variant} size={size}>
            {showDot && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${config.dot}`} />}
            {config.label}
        </Badge>
    );
};

export default EstadoProyectoBadge;
export { ESTADO_CONFIG };
