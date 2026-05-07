import React, { useState, useEffect } from 'react';

import reporteService from '../../services/reporteService';
import { Download, Loader2, AlertCircle } from 'lucide-react';

const ReporteUsuariosPermisos = () => {
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
            const response = await reporteService.getUsuariosPermisos();
            setData(response.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar el reporte de usuarios.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            setDownloading(true);
            await reporteService.downloadUsuariosPermisosPdf();
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
                    <h1 className="text-2xl font-bold text-white">Usuarios y Permisos</h1>
                    <p className="text-slate-400 text-sm mt-1">Listado de usuarios con los permisos asignados por su rol.</p>
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
                        <p>No hay usuarios registrados.</p>
                    </div>
                ) : (
                    data.map((usuario) => (
                        <div key={usuario.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                            <div className="bg-slate-800/80 px-6 py-4 flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-700">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {usuario.nombre} {usuario.apellido_paterno}
                                    </h3>
                                    <p className="text-sm text-slate-400 mt-1">{usuario.email}</p>
                                </div>
                                <div className="mt-2 md:mt-0">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        Rol: {usuario.rol?.nombre_visible || 'Sin Rol'}
                                    </span>
                                </div>
                            </div>
                            
                            {usuario.rol && usuario.rol.permisos && usuario.rol.permisos.length > 0 ? (
                                <div className="p-6">
                                    <h4 className="text-sm font-semibold text-slate-300 mb-4 border-b border-slate-800 pb-2">Permisos Asignados</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Agrupar por módulo para visualizar en frontend */}
                                        {Object.entries(
                                            usuario.rol.permisos.reduce((acc, curr) => {
                                                if (!acc[curr.modulo]) acc[curr.modulo] = [];
                                                acc[curr.modulo].push(curr);
                                                return acc;
                                            }, {})
                                        ).map(([modulo, permisos]) => (
                                            <div key={modulo} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                                                <h5 className="font-bold text-emerald-400 mb-2 capitalize border-b border-slate-700 pb-1">{modulo}</h5>
                                                <ul className="space-y-1">
                                                    {permisos.map(p => (
                                                        <li key={p.id} className="text-xs text-slate-300 flex items-start">
                                                            <span className="text-emerald-500 mr-2 mt-0.5">•</span>
                                                            <span className="capitalize">{p.accion} <span className="text-slate-500 block text-[10px] lowercase">{p.codigo}</span></span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="px-6 py-4 text-sm text-slate-500 italic">
                                    Este usuario no tiene permisos asignados.
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ReporteUsuariosPermisos;
