import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { History, ChevronLeft, FileText, Building2, User, Search } from '../../components/icons/Icons';
import { actaEntregaService } from '../../services/actaEntregaService';
import { formatFecha } from '../../utils/format';
import BotonExportar from '../../components/ui/BotonExportar';

function nombreCompleto(p) {
    if (!p) return null;
    return [p.nombre, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ');
}

export default function HistorialEntregasPage() {
    const navigate = useNavigate();

    const [actas, setActas] = useState([]);
    const [meta, setMeta] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [cargando, setCargando] = useState(true);

    const [busquedaInput, setBusquedaInput] = useState('');
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('todos');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [rangoFechas, setRangoFechas] = useState(null); // { min, max } reales del sistema

    // Búsqueda en tiempo real con debounce: evita disparar una petición por cada tecla.
    useEffect(() => {
        const t = setTimeout(() => setBusqueda(busquedaInput.trim()), 350);
        return () => clearTimeout(t);
    }, [busquedaInput]);

    const cargar = useCallback(async (page = 1) => {
        setCargando(true);
        try {
            const res = await actaEntregaService.listarDevueltas({
                page,
                per_page: 20,
                buscar: busqueda || undefined,
                categoria: categoria === 'todos' ? undefined : categoria,
                fecha_desde: fechaDesde || undefined,
                fecha_hasta: fechaHasta || undefined,
            });
            const paginador = res.data ?? {};
            setActas(paginador.data ?? []);
            setMeta({
                current_page: paginador.current_page ?? 1,
                last_page: paginador.last_page ?? 1,
                total: paginador.total ?? 0,
                from: paginador.from ?? 0,
                to: paginador.to ?? 0,
            });
            if (res.rango_fechas) setRangoFechas(res.rango_fechas);
        } catch {
            toast.error('Error al cargar el historial de entregas.');
        } finally {
            setCargando(false);
        }
    }, [busqueda, categoria, fechaDesde, fechaHasta]);

    // El "hasta" nunca puede ser futuro ni anterior al "desde"; si el usuario
    // cambia "desde" a una fecha posterior a "hasta", arrastramos "hasta" también.
    const handleFechaDesde = (valor) => {
        setFechaDesde(valor);
        if (valor && fechaHasta && valor > fechaHasta) setFechaHasta(valor);
    };

    const handleFechaHasta = (valor) => {
        const hoy = rangoFechas?.max ?? new Date().toISOString().split('T')[0];
        const acotado = valor > hoy ? hoy : valor;
        setFechaHasta(acotado);
        if (fechaDesde && acotado && fechaDesde > acotado) setFechaDesde(acotado);
    };

    useEffect(() => {
        setPagina(1);
        cargar(1);
    }, [cargar]);

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard/activos')}
                        className="p-2 rounded-xl border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-white/10 flex items-center justify-center">
                        <History className="w-5 h-5 text-emerald-300" />
                    </div>
                    <div>
                        <h1 className="text-white text-xl font-bold">Entregas Finalizadas</h1>
                        <p className="text-white/40 text-xs">
                            Historial de actas de préstamo social devueltas{meta ? ` · ${meta.total} en total` : ''}
                        </p>
                    </div>
                </div>
                <BotonExportar
                    url="/exportar/entregas-finalizadas"
                    filtros={{
                        buscar: busqueda || undefined,
                        categoria: categoria === 'todos' ? undefined : categoria,
                        fecha_desde: fechaDesde || undefined,
                        fecha_hasta: fechaHasta || undefined,
                    }}
                    formatos={['pdf']}
                    label="Exportar PDF"
                />
            </div>

            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[220px] max-w-sm">
                    <label className="text-[11px] text-white/40 block mb-1">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
                        <input
                            value={busquedaInput}
                            onChange={e => setBusquedaInput(e.target.value)}
                            placeholder="Proyecto, activo o beneficiario…"
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-violet-400/60 focus:bg-white/10 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] text-white/40 block mb-1">Tipo de proyecto</label>
                    <select value={categoria} onChange={e => setCategoria(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all">
                        <option value="todos">Todos</option>
                        <option value="social">Social</option>
                        <option value="privado">Privado</option>
                    </select>
                </div>

                <div>
                    <label className="text-[11px] text-white/40 block mb-1">Desde</label>
                    <input
                        type="date"
                        value={fechaDesde}
                        min={rangoFechas?.min}
                        max={fechaHasta || rangoFechas?.max}
                        onChange={e => handleFechaDesde(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all [color-scheme:dark]"
                    />
                </div>

                <div>
                    <label className="text-[11px] text-white/40 block mb-1">Hasta</label>
                    <input
                        type="date"
                        value={fechaHasta}
                        min={fechaDesde || rangoFechas?.min}
                        max={rangoFechas?.max}
                        onChange={e => handleFechaHasta(e.target.value)}
                        className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-violet-400/60 transition-all [color-scheme:dark]"
                    />
                </div>

                {(busquedaInput || categoria !== 'todos' || fechaDesde || fechaHasta) && (
                    <button
                        onClick={() => { setBusquedaInput(''); setCategoria('todos'); setFechaDesde(''); setFechaHasta(''); }}
                        className="px-3 py-2 rounded-xl border border-white/10 text-white/40 text-xs hover:text-white hover:bg-white/[0.04] transition-colors">
                        Limpiar filtros
                    </button>
                )}
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden">
                {cargando ? (
                    <div className="py-16 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    </div>
                ) : actas.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3 text-white/30">
                        <History className="w-10 h-10" />
                        <p className="text-sm">No hay entregas finalizadas todavía</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-white/8">
                                    {['Acta', 'Activo', 'Proyecto', 'Beneficiario', 'Entrega real', 'Devolución real',
                                      'Aprobado por', 'Entrega registrada por', 'Devolución registrada por', 'Acta firmada'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-white/40 text-xs font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {actas.map(acta => (
                                    <tr key={acta.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                        <td className="px-4 py-3 text-white/60 text-xs font-mono whitespace-nowrap">{acta.numero_acta}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-white text-sm font-medium">{acta.activo?.nombre}</p>
                                            <p className="text-white/40 text-xs">{acta.activo?.codigo}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1.5 text-white/70 text-xs">
                                                <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                                {acta.asignacion?.proyecto?.nombre ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1.5 text-white/70 text-xs">
                                                <User className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                                                {nombreCompleto(acta.beneficiario) ?? acta.vivienda?.codigo ?? '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                                            {acta.fecha_entrega_real ? formatFecha(acta.fecha_entrega_real) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                                            {acta.fecha_devolucion_real ? formatFecha(acta.fecha_devolucion_real) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                                            {nombreCompleto(acta.aprobado_por) ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                                            {nombreCompleto(acta.entrega_registrada_por) ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">
                                            {nombreCompleto(acta.devolucion_registrada_por) ?? '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {acta.pdf_firmado_url ? (
                                                <button onClick={() => actaEntregaService.verPdfFirmado(acta.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-300 hover:bg-emerald-500/20 transition-colors whitespace-nowrap">
                                                    <FileText className="w-3 h-3" /> Ver acta firmada
                                                </button>
                                            ) : (
                                                <span className="text-white/20 text-xs">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {meta && meta.last_page > 1 && (
                    <div className="px-4 py-3 border-t border-white/8 flex items-center justify-between">
                        <span className="text-white/40 text-xs">
                            {meta.from}–{meta.to} de {meta.total} entregas
                        </span>
                        <div className="flex gap-2">
                            <button disabled={pagina <= 1}
                                onClick={() => { setPagina(p => p - 1); cargar(pagina - 1); }}
                                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                Anterior
                            </button>
                            <span className="px-3 py-1 text-white/40 text-xs">{pagina} / {meta.last_page}</span>
                            <button disabled={pagina >= meta.last_page}
                                onClick={() => { setPagina(p => p + 1); cargar(pagina + 1); }}
                                className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs disabled:opacity-30 hover:bg-white/10 transition-all">
                                Siguiente
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
