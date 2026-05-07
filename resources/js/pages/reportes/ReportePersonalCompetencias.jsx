import React, { useState, useEffect } from 'react';

import reporteService from '../../services/reporteService';
import { Download, Loader2, AlertCircle } from 'lucide-react';

const ReportePersonalCompetencias = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await reporteService.getPersonalCompetencias();
            setData(response.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar el reporte de personal y competencias.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            await reporteService.downloadPersonalCompetenciasPdf();
        } catch (err) {
            alert('Error al descargar el PDF');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Personal y Competencias</h1>
                    <p className="text-slate-400 text-sm mt-1">Listado detallado de trabajadores con sus certificaciones.</p>
                </div>
                <button 
                    onClick={handleDownloadPdf}
                    disabled={downloading || loading || data.length === 0}
                    className="flex items-center space-x-2 bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                >
                    {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    <span>Exportar a PDF</span>
                </button>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl flex justify-center items-center h-64">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                    </div>
                ) : error ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-center items-center h-64 text-red-400">
                        <AlertCircle size={32} className="mb-2" />
                        <p>{error}</p>
                        <button onClick={fetchData} className="mt-4 text-emerald-500 hover:underline">Reintentar</button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl flex justify-center items-center h-64 text-slate-500">
                        <p>No hay datos registrados.</p>
                    </div>
                ) : (
                    data.map((personal) => (
                        <div key={personal.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="bg-slate-800/80 px-6 py-4 border-b border-slate-700">
                                <h3 className="text-lg font-bold text-white">
                                    {personal.codigo_empleado} - {personal.nombre} {personal.apellido_paterno} {personal.apellido_materno}
                                </h3>
                                <p className="text-sm text-emerald-400 mt-1 capitalize">Tipo: {personal.tipo}</p>
                            </div>
                            
                            {personal.competencias && personal.competencias.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-800/50 text-slate-300">
                                            <tr>
                                                <th className="px-6 py-3 font-medium">Competencia</th>
                                                <th className="px-6 py-3 font-medium">Fecha Emisión</th>
                                                <th className="px-6 py-3 font-medium">Fecha Venc.</th>
                                                <th className="px-6 py-3 font-medium">Entidad Emisora</th>
                                                <th className="px-6 py-3 font-medium">Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/50">
                                            {personal.competencias.map((comp) => (
                                                <tr key={comp.id} className="hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-3 font-medium text-slate-300">{comp.nombre}</td>
                                                    <td className="px-6 py-3">
                                                        {comp.pivot?.fecha_emision ? new Date(comp.pivot.fecha_emision).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        {comp.pivot?.fecha_vencimiento ? new Date(comp.pivot.fecha_vencimiento).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-3">{comp.pivot?.entidad_emisora || '-'}</td>
                                                    <td className="px-6 py-3 capitalize">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                            comp.pivot?.estado === 'vencida' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
                                                        }`}>
                                                            {comp.pivot?.estado}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="px-6 py-4 text-sm text-slate-500 italic">
                                    Este trabajador no tiene competencias registradas.
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReportePersonalCompetencias;
