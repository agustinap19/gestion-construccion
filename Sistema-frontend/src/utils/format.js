export function formatFecha(valor) {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatFechaHora(valor) {
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-BO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
