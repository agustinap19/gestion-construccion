import React from 'react';
import Badge from '../ui/Badge';

const ESTADO_VIV_CONFIG = {
    planificada:       { label: 'Planificada',       variant: 'secondary', dot: 'bg-slate-400' },
    en_construccion:   { label: 'En Construcción',   variant: 'info',      dot: 'bg-blue-400' },
    obra_gruesa:       { label: 'Obra Gruesa',       variant: 'primary',   dot: 'bg-indigo-400' },
    acabados:          { label: 'Acabados',           variant: 'warning',   dot: 'bg-amber-400' },
    inspeccion:        { label: 'Inspección',         variant: 'info',      dot: 'bg-cyan-400' },
    con_observaciones: { label: 'Con Observaciones', variant: 'danger',    dot: 'bg-rose-400' },
    aprobada:          { label: 'Aprobada',           variant: 'success',   dot: 'bg-emerald-400' },
    entregada:         { label: 'Entregada',          variant: 'primary',   dot: 'bg-violet-400' },
};

const EstadoViviendaBadge = ({ estado, size = 'sm', showDot = true }) => {
    const config = ESTADO_VIV_CONFIG[estado] || { label: estado, variant: 'secondary', dot: 'bg-slate-400' };
    return (
        <Badge variant={config.variant} size={size}>
            {showDot && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${config.dot}`} />}
            {config.label}
        </Badge>
    );
};

export default EstadoViviendaBadge;
export { ESTADO_VIV_CONFIG };
