import React, { useState, useEffect } from 'react';

import reporteService from '../../services/reporteService';
import { Download, Loader2, AlertCircle } from 'lucide-react';

const ReportePersonalRol = () => {
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
            const response = await reporteService.getPersonalRol();
            setData(response.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar el reporte de personal.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            await reporteService.downloadPersonalRolPdf();
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
                    <h1 className="text-2xl font-bold text-white">Reporte de Personal y Roles</h1>
                    <p className="text-slate-400 text-sm mt-1">Listado de personal con su rol asignado en el sistema.</p>
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

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col justify-center items-center h-64 text-red-400">
                        <AlertCircle size={32} className="mb-2" />
                        <p>{error}</p>
                        <button onClick={fetchData} className="mt-4 text-emerald-500 hover:underline">Reintentar</button>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex justify-center items-center h-64 text-slate-500">
                        <p>No hay datos disponibles para este reporte.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800 text-emerald-400">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Cód. Empleado</th>
                                    <th className="px-6 py-3 font-medium">Nombre Completo</th>
                                    <th className="px-6 py-3 font-medium">CI</th>
                                    <th className="px-6 py-3 font-medium">Tipo</th>
                                    <th className="px-6 py-3 font-medium">Email</th>
                                    <th className="px-6 py-3 font-medium">Rol en Sistema</th>
                                    <th className="px-6 py-3 font-medium">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {data.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">{item.codigo_empleado}</td>
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {item.nombre} {item.apellido_paterno} {item.apellido_materno}
                                        </td>
                                        <td className="px-6 py-4">{item.ci}</td>
                                        <td className="px-6 py-4 capitalize">{item.tipo}</td>
                                        <td className="px-6 py-4">{item.usuario?.email || <span className="text-slate-500">Sin cuenta</span>}</td>
                                        <td className="px-6 py-4">
                                            {item.usuario?.rol ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {item.usuario.rol.nombre_visible}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`capitalize ${item.estado_laboral === 'activo' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {item.estado_laboral}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportePersonalRol;
