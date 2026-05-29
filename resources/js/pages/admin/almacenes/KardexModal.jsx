import React, { useState, useEffect } from 'react';
import { almacenService } from '../../../services/almacenService';
import { X, ChevronLeft, ChevronRight, Download } from '../../../components/icons/Icons';
import BotonExportar from '../../../components/ui/BotonExportar';

const TIPO_ESTILO = {
    entrada:              'text-emerald-400',
    transferencia_entrada:'text-sky-400',
    ajuste_positivo:      'text-teal-400',
    inventario_inicial:   'text-violet-400',
    salida:               'text-rose-400',
    transferencia_salida: 'text-orange-400',
    ajuste_negativo:      'text-red-400',
};

const TIPO_LABEL = {
    entrada:              'ENTRADA',
    salida:               'SALIDA',
    transferencia_entrada:'TRANSF. ENT.',
    transferencia_salida: 'TRANSF. SAL.',
    ajuste_positivo:      'AJUSTE +',
    ajuste_negativo:      'AJUSTE −',
    inventario_inicial:   'INV. INICIAL',
};

const TIPOS_ENTRADA = ['entrada','transferencia_entrada','ajuste_positivo','inventario_inicial'];

export default function KardexModal({ almacen, stockItem, onClose }) {
    const [movimientos, setMovimientos] = useState([]);
    const [page, setPage]               = useState(1);
    const [lastPage, setLastPage]       = useState(1);
    const [loading, setLoading]         = useState(false);

    useEffect(() => {
        setLoading(true);
        almacenService.kardex(almacen.id, stockItem.material.id, { page, per_page: 20 })
            .then(r => {
                setMovimientos(r.data?.data || []);
                setLastPage(r.data?.last_page || 1);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [page, almacen.id, stockItem.material.id]);

    const exportUrl = almacenService.exportarKardex(almacen.id, stockItem.material.id);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
                 style={{ background: 'linear-gradient(135deg,rgba(15,23,42,0.98),rgba(23,23,50,0.98))',
                          border: '1px solid rgba(139,92,246,0.25)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-white font-semibold">Kardex — {stockItem.material?.nombre}</h2>
                        <p className="text-slate-400 text-xs mt-0.5">{almacen.nombre} · {stockItem.material?.codigo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <BotonExportar
                            url={`/almacenes/${almacen.id}/reportes/kardex`}
                            filtros={{ material_id: stockItem.material.id }}
                            formatos={['pdf', 'excel']}
                            variantes={[
                                { id: 'oficial', label: 'Oficial' },
                                { id: 'sicooes', label: 'SICOOES (Sin retrabajos)' }
                            ]}
                            label="Exportar"
                        />
                        <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1 px-2">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Cargando…</div>
                    ) : movimientos.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-slate-400 text-sm">Sin movimientos registrados.</div>
                    ) : (
                        <table className="w-full text-xs">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-white/10" style={{ background: 'rgba(15,23,42,0.95)' }}>
                                    {['Fecha','Tipo','Concepto','Entrada','Salida','P.U.','Saldo','PMP','Registrado por'].map(h => (
                                        <th key={h} className="text-left text-slate-400 py-3 px-3 font-medium">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {movimientos.map(m => {
                                    const esEntrada = TIPOS_ENTRADA.includes(m.tipo);
                                    return (
                                        <tr key={m.id} className="border-b border-white/5 hover:bg-white/5">
                                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                                                {new Date(m.fecha_movimiento).toLocaleString('es-BO', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className={`py-2.5 px-3 font-semibold ${TIPO_ESTILO[m.tipo] || 'text-slate-300'}`}>
                                                {TIPO_LABEL[m.tipo] || m.tipo}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300 max-w-[180px] truncate">{m.concepto}</td>
                                            <td className="py-2.5 px-3 text-emerald-400 font-medium">
                                                {esEntrada ? Number(m.cantidad).toFixed(2) : ''}
                                            </td>
                                            <td className="py-2.5 px-3 text-rose-400 font-medium">
                                                {!esEntrada ? Number(m.cantidad).toFixed(2) : ''}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-300">Bs {Number(m.precio_unitario).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-white font-medium">{Number(m.saldo_posterior).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-slate-300">Bs {Number(m.costo_promedio_resultante).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-slate-400">{m.registrado_por?.name || '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {lastPage > 1 && (
                    <div className="flex items-center justify-center gap-2 py-3 border-t border-white/10 shrink-0">
                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-slate-400 text-xs">{page} / {lastPage}</span>
                        <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === lastPage}
                                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white disabled:opacity-30 flex items-center justify-center">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
