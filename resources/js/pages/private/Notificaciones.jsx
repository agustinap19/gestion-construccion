import React, { useEffect } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import EmptyState from '../../components/ui/EmptyState';
import { Bell } from '../../components/icons/Icons';
import { useNotificaciones } from '../../context/NotificacionContext';

const Notificaciones = () => {
    const { cargarNoLeidas } = useNotificaciones();

    useEffect(() => {
        cargarNoLeidas();
    }, [cargarNoLeidas]);

    return (
        <div className="animate-fade-in">
            <PageHeader 
                title="Historial de Notificaciones" 
                subtitle="Consulta todas las alertas y avisos del sistema"
                icon={<Bell size={24} className="text-emerald-400" />}
            />
            
            <Card className="min-h-[500px] flex items-center justify-center">
                <EmptyState 
                    icon={<Bell size={32} />}
                    title="Bandeja de Entrada"
                    description="La vista completa del historial paginado de notificaciones se implementará en breve."
                />
            </Card>
        </div>
    );
};

export default Notificaciones;
