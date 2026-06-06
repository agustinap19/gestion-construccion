import React from 'react';
import Badge from '../ui/Badge';

const ESTADO_FASE_CONFIG = {
    pendiente:  { label: 'Pendiente',   variant: 'secondary', dot: 'bg-slate-400' },
    en_proceso: { label: 'En Proceso',  variant: 'info',      dot: 'bg-blue-400' },
    completada: { label: 'Completada',  variant: 'success',   dot: 'bg-emerald-400' },
    cancelada:  { label: 'Cancelada',   variant: 'danger',    dot: 'bg-rose-400' },
};

const EstadoFaseBadge = ({ estado, size = 'sm', showDot = true }) => {
    const config = ESTADO_FASE_CONFIG[estado] || { label: estado, variant: 'secondary', dot: 'bg-slate-400' };
    return (
        <Badge variant={config.variant} size={size}>
            {showDot && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${config.dot}`} />}
            {config.label}
        </Badge>
    );
};

export default EstadoFaseBadge;
export { ESTADO_FASE_CONFIG };
