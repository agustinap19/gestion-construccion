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
 * Botón de exportación reutilizable.
 *
 * @param {string}   url        — ruta relativa al endpoint, ej: '/exportar/proyectos'
 * @param {object}   [params]   — query params adicionales (filtros activos, etc.)
 * @param {Array}    [formatos] — [{tipo:'pdf',label:'PDF'}, {tipo:'excel',label:'Excel'}]
 * @param {string}   [label]    — texto del botón, default 'Exportar'
 * @param {string}   [className]
 */
export default function BotonExportar({
    url,
    params   = {},
    formatos = [{ tipo: 'pdf', label: 'PDF' }],
    label    = 'Exportar',
    className = '',
}) {
    const [abierto,   setAbierto]   = useState(false);
    const [cargando,  setCargando]  = useState(null); // tipo en proceso
    const ref = useRef(null);

    useEffect(() => {
        const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
        document.addEventListener('mousedown', cerrar);
        return () => document.removeEventListener('mousedown', cerrar);
    }, []);

    const descargar = async (tipo) => {
        setAbierto(false);
        setCargando(tipo);

        try {
            if (tipo === 'zip') {
                const res = await api.post(url, {}, { params });
                toast.success(res.data?.message ?? 'Generando ZIP, recibirás una notificación.');
            } else {
                const res = await api.get(url, {
                    params:       { ...params, formato: tipo },
                    responseType: 'blob',
                });

                const { ext, mime } = MIME_EXT[tipo];
                const contentDisp   = res.headers['content-disposition'] ?? '';
                const match         = contentDisp.match(/filename[^;=\n]*=([^;\n]*)/);
                const nombre        = match ? match[1].replace(/['"]/g, '').trim() : `exportacion.${ext}`;

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
            }
        } catch (err) {
            const msg = err.response?.data?.message ?? err.message ?? 'Error al exportar';
            toast.error(msg);
        } finally {
            setCargando(null);
        }
    };

    const ocupado = cargando !== null;

    return (
        <div ref={ref} className={`relative inline-flex ${className}`}>
            {/* Botón principal */}
            <button
                onClick={() => {
                if (ocupado) return;
                if (formatos.length === 1) { descargar(formatos[0].tipo); return; }
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
                {!ocupado && formatos.length > 1 && (
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
                )}
            </button>

            {/* Dropdown */}
            {abierto && formatos.length > 1 && (
                <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[140px]
                                bg-slate-900/95 backdrop-blur-sm border border-white/10
                                rounded-xl shadow-2xl overflow-hidden animate-in fade-in
                                slide-in-from-top-2 duration-150">
                    {formatos.map(({ tipo, label: fmt }) => (
                        <button
                            key={tipo}
                            onClick={() => descargar(tipo)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5
                                       text-xs text-slate-300 hover:bg-white/8 hover:text-white
                                       transition-colors duration-150 first:pt-3 last:pb-3"
                        >
                            {ICONO_FORMATO[tipo]}
                            <span>{fmt}</span>
                        </button>
                    ))}
                </div>
            )}

        </div>
    );
}
