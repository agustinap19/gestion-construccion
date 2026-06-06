import React from 'react';
import Badge from '../ui/Badge';

const EstadoBeneficiarioBadge = ({ estado, className = '' }) => {
    const config = {
        'candidato': { color: 'slate', text: 'Candidato' },
        'aceptado': { color: 'blue', text: 'Aceptado' },
        'en_construccion': { color: 'yellow', text: 'En Construcción' },
        'vivienda_entregada': { color: 'emerald', text: 'Vivienda Entregada' },
        'retirado': { color: 'orange', text: 'Retirado' },
        'rechazado': { color: 'red', text: 'Rechazado' }
    };

    const style = config[estado] || { color: 'slate', text: estado };

    return (
        <Badge variant={style.color} className={className}>
            {style.text}
        </Badge>
    );
};

export default EstadoBeneficiarioBadge;
