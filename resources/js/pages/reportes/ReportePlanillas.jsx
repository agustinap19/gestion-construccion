import React, { useState, useEffect } from 'react';

import reporteService from '../../services/reporteService';
import { Download, Loader2, AlertCircle } from 'lucide-react';

const ReportePlanillas = () => {
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
            const response = await reporteService.getPlanillas();
            setData(response.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar el reporte de planillas.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            await reporteService.downloadPlanillasPdf();
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
                    <h1 className="text-2xl font-bold text-white">Reporte de Planillas de Pago</h1>
                    <p className="text-slate-400 text-sm mt-1">Listado de planillas con detalles por trabajador.</p>
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
                        <p>No hay planillas registradas.</p>
                    </div>
                ) : (
                    data.map((planilla) => (
                        <div key={planilla.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="bg-slate-800/80 px-6 py-4 flex justify-between items-center border-b border-slate-700">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        Planilla: {new Date(planilla.periodo_inicio).toLocaleDateString()} al {new Date(planilla.periodo_fin).toLocaleDateString()}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1 capitalize">Tipo: {planilla.tipo} | Estado: {planilla.estado}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">Total Planilla</p>
                                    <p className="text-xl font-bold text-emerald-400">Bs. {parseFloat(planilla.monto_total).toFixed(2)}</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-800/50 text-slate-300">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">Trabajador</th>
                                            <th className="px-6 py-3 font-medium">Días Trab.</th>
                                            <th className="px-6 py-3 font-medium">H. Extras</th>
                                            <th className="px-6 py-3 font-medium">Bonos</th>
                                            <th className="px-6 py-3 font-medium">Descuentos</th>
                                            <th className="px-6 py-3 font-medium">Monto Bruto</th>
                                            <th className="px-6 py-3 font-medium text-emerald-400">Monto Neto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {planilla.detalles?.map((detalle) => (
                                            <tr key={detalle.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-3 font-medium text-slate-300">
                                                    {detalle.personal ? `${detalle.personal.nombre} ${detalle.personal.apellido_paterno}` : `ID: ${detalle.personal_id}`}
                                                </td>
                                                <td className="px-6 py-3">{detalle.dias_trabajados}</td>
                                                <td className="px-6 py-3">{detalle.horas_extras}</td>
                                                <td className="px-6 py-3">Bs. {parseFloat(detalle.bonos).toFixed(2)}</td>
                                                <td className="px-6 py-3">Bs. {parseFloat(detalle.descuentos).toFixed(2)}</td>
                                                <td className="px-6 py-3">Bs. {parseFloat(detalle.monto_bruto).toFixed(2)}</td>
                                                <td className="px-6 py-3 font-bold text-emerald-400">Bs. {parseFloat(detalle.monto_neto).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReportePlanillas;
