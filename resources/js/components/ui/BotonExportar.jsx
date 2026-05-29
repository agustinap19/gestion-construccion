import React, { useRef, useState, useEffect } from 'react';
import { Download, FileText, Table2, FileArchive, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ICONO_FORMATO = {
    pdf:   <FileText  className="w-3.5 h-3.5 text-rose-400"   />,
    excel: <Table2    className="w-3.5 h-3.5 text-emerald-400" />,
    zip:   <FileArchive className="w-3.5 h-3.5 text-sky-400"  />,
};

const MIME_EXT = {
    pdf:   { ext: 'pdf',  mime: 'application/pdf' },
    excel: { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

/**
 * Botón de exportación reutilizable (Sub-fase D)
 *
 * @param {string}   url        — ruta absoluta al endpoint, ej: '/api/almacenes/1/reportes/kardex'
 * @param {object}   [params]   — query params o identificadores básicos
 * @param {object}   [filtros]  — estado actual de los filtros de la tabla
 * @param {Array}    [formatos] — ej. ['pdf', 'excel']
 * @param {Array}    [variantes]— [{ id: 'oficial', label: 'Oficial' }, ...]
 * @param {string}   [label]    — texto del botón
 * @param {string}   [className]
 */
export default function BotonExportar({
    url,
    params    = {},
    filtros   = {},
    formatos  = ['pdf'],
    variantes = [],
    label     = 'Exportar',
    className = '',
}) {
    const [abierto, setAbierto]  = useState(false);
    const [cargando, setCargando] = useState(null); // String indicando qué se genera
    const ref = useRef(null);

    useEffect(() => {
        const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
        document.addEventListener('mousedown', cerrar);
        return () => document.removeEventListener('mousedown', cerrar);
    }, []);

    const descargar = async (formato, varianteId = null) => {
        setAbierto(false);
        const refGeneracion = varianteId ? `${formato}-${varianteId}` : formato;
        setCargando(refGeneracion);

        try {
            // El backend recibe: formato, variante, filtros, y params. 
            // Siempre usamos POST para enviar objetos complejos.
            const res = await api.post(url, {
                formato,
                variante: varianteId,
                filtros,
                ...params
            }, {
                responseType: 'blob' // Esperamos un archivo directo
            });

            // Si el backend responde con JSON en lugar de blob (ej. "Procesando en background"), 
            // axios parsea el blob si es JSON. Comprobamos el type:
            if (res.data.type === 'application/json') {
                const text = await res.data.text();
                const json = JSON.parse(text);
                toast.success(json.message || 'Generando reporte, te notificaremos cuando esté listo.');
                setCargando(null);
                return;
            }

            const { ext, mime } = MIME_EXT[formato] || { ext: formato, mime: 'application/octet-stream' };
            const contentDisp   = res.headers['content-disposition'] ?? '';
            const match         = contentDisp.match(/filename[^;=\n]*=([^;\n]*)/);
            const nombre        = match ? match[1].replace(/['"]/g, '').trim() : `reporte.${ext}`;

            const blob     = new Blob([res.data], { type: mime });
            const blobUrl  = URL.createObjectURL(blob);
            const anchor   = document.createElement('a');
            anchor.href    = blobUrl;
            anchor.download = nombre;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(blobUrl);

            toast.success(`${nombre} descargado.`);
        } catch (err) {
            let msg = 'Error al exportar';
            if (err.response?.data instanceof Blob && err.response.data.type === 'application/json') {
                const text = await err.response.data.text();
                const json = JSON.parse(text);
                msg = json.message || msg;
            } else {
                msg = err.response?.data?.message ?? err.message ?? msg;
            }
            toast.error(msg);
        } finally {
            setCargando(null);
        }
    };

    const ocupado = cargando !== null;
    
    // Normalizar formatos para que siempre sean objetos { id, label }
    const formatosNormalizados = formatos.map(f => {
        if (typeof f === 'string') return { id: f, label: f.toUpperCase() };
        return { id: f.id || f.tipo || 'pdf', label: f.label || (f.id || f.tipo || 'pdf').toUpperCase() };
    });
    
    const esSimple = formatosNormalizados.length === 1 && variantes.length === 0;

    // Generar opciones del dropdown
    const opciones = [];
    if (variantes.length > 0) {
        variantes.forEach(v => {
            formatosNormalizados.forEach(f => {
                opciones.push({
                    formato: f.id,
                    varianteId: v.id,
                    label: `${f.label} ${v.label}`
                });
            });
        });
    } else {
        formatosNormalizados.forEach(f => {
            opciones.push({
                formato: f.id,
                varianteId: null,
                label: f.label
            });
        });
    }

    return (
        <div ref={ref} className={`relative inline-flex ${className}`}>
            <button
                onClick={() => {
                    if (ocupado) return;
                    if (esSimple) { 
                        descargar(formatosNormalizados[0].id); 
                        return; 
                    }
                    setAbierto(v => !v);
                }}
                disabled={ocupado}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl
                           bg-white/5 border border-white/10 text-slate-300
                           hover:bg-white/10 hover:text-white hover:border-white/20
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 text-xs font-medium"
            >
                {ocupado
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                }
                <span>{ocupado ? 'Generando…' : label}</span>
                {!ocupado && !esSimple && (
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                )}
            </button>

            {abierto && !esSimple && (
                <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px]
                                bg-slate-900/95 backdrop-blur-sm border border-white/10
                                rounded-xl shadow-2xl overflow-hidden animate-in fade-in
                                slide-in-from-top-2 duration-150">
                    {opciones.map((opc, idx) => (
                        <button
                            key={idx}
                            onClick={() => descargar(opc.formato, opc.varianteId)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5
                                       text-xs text-slate-300 hover:bg-white/8 hover:text-white
                                       transition-colors duration-150 first:pt-3 last:pb-3"
                        >
                            {ICONO_FORMATO[opc.formato] || <FileText className="w-3.5 h-3.5" />}
                            <span>{opc.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
