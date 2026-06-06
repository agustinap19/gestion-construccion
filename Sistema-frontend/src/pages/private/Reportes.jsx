import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { FileText, Users, Briefcase, ChevronRight } from '../../components/icons/Icons';

const Reportes = () => {
    const navigate = useNavigate();

    const reportesList = [
        {
            id: 'personal-rol',
            title: 'Personal por Rol',
            description: 'Lista del personal activo organizado por sus roles de sistema y proyecto.',
            icon: <Users size={24} className="text-emerald-400" />,
            bgIcon: 'bg-emerald-500/10 border-emerald-500/20'
        },
        {
            id: 'planillas',
            title: 'Planillas de Pago',
            description: 'Control de planillas y remuneraciones para el personal de campo.',
            icon: <FileText size={24} className="text-purple-400" />,
            bgIcon: 'bg-purple-500/10 border-purple-500/20'
        },
        {
            id: 'competencias-personal',
            title: 'Competencias de Personal',
            description: 'Análisis de habilidades y competencias técnicas del personal de la constructora.',
            icon: <Briefcase size={24} className="text-amber-400" />,
            bgIcon: 'bg-amber-500/10 border-amber-500/20'
        },
        {
            id: 'personal-competencias',
            title: 'Personal por Competencia',
            description: 'Búsqueda de personal calificado agrupado por su competencia o especialidad.',
            icon: <Users size={24} className="text-blue-400" />,
            bgIcon: 'bg-blue-500/10 border-blue-500/20'
        },
        {
            id: 'usuarios-permisos',
            title: 'Usuarios y Permisos',
            description: 'Auditoría de seguridad y accesos detallados por usuario en la plataforma.',
            icon: <FileText size={24} className="text-red-400" />,
            bgIcon: 'bg-red-500/10 border-red-500/20'
        }
    ];

    return (
        <div className="animate-fade-in">
            <PageHeader 
                title="Generador de Reportes" 
                subtitle="Módulo central de analíticas y reportes exportables en PDF."
                icon={<FileText size={24} className="text-emerald-400" />}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reportesList.map((reporte, index) => (
                    <Card 
                        key={reporte.id}
                        variant="default"
                        className={`group cursor-pointer hover:border-emerald-500/50 transition-all duration-300 animate-slide-in-right hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(16,185,129,0.05)]`}
                        style={{ animationDelay: `${0.1 * (index + 1)}s` }}
                        onClick={() => navigate(`/dashboard/reportes/${reporte.id}`)}
                    >
                        <div className="flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-colors group-hover:bg-slate-800 ${reporte.bgIcon}`}>
                                    {reporte.icon}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 transition-colors">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                            
                            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                                {reporte.title}
                            </h3>
                            
                            <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-grow">
                                {reporte.description}
                            </p>
                            
                            <div className="mt-auto">
                                <Button variant="ghost" fullWidth className="group-hover:bg-emerald-500/10 group-hover:text-emerald-400" rightIcon={<ChevronRight size={16} />}>
                                    Generar Reporte
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default Reportes;
