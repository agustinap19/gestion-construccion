import api from './api';

export const actaEntregaService = {
    listarPorAsignacion: async (asignacionId) => {
        const res = await api.get(`/asignaciones-activo/${asignacionId}/actas`);
        return res.data;
    },

    crear: async (asignacionId, data = {}) => {
        const res = await api.post(`/asignaciones-activo/${asignacionId}/actas`, data);
        return res.data;
    },

    listarDevueltas: async (params = {}) => {
        const res = await api.get('/actas-entrega/devueltas', { params });
        return res.data;
    },

    cambiarEstado: async (actaId, estado, extra = {}) => {
        const res = await api.patch(`/actas-entrega/${actaId}/estado`, { estado, ...extra });
        return res.data;
    },

    marcarImpresa: async (actaId) => {
        const res = await api.patch(`/actas-entrega/${actaId}/estado`, { estado: 'impresa' });
        return res.data;
    },

    subirPdfFirmado: async (actaId, file) => {
        const formData = new FormData();
        formData.append('pdf_firmado', file);
        const res = await api.post(`/actas-entrega/${actaId}/pdf-firmado`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    aprobar: async (actaId) => {
        const res = await api.patch(`/actas-entrega/${actaId}/estado`, { estado: 'aprobada' });
        return res.data;
    },

    rechazar: async (actaId, notaRechazo) => {
        const res = await api.patch(`/actas-entrega/${actaId}/estado`, { estado: 'impresa', nota_rechazo: notaRechazo });
        return res.data;
    },

    subirFotoEntrega: async (actaId, file) => {
        const formData = new FormData();
        formData.append('foto', file);
        const res = await api.post(`/actas-entrega/${actaId}/foto-entrega`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    subirFotoDevolucion: async (actaId, file, estadoDevolucion) => {
        const formData = new FormData();
        formData.append('foto', file);
        formData.append('estado_devolucion', estadoDevolucion);
        const res = await api.post(`/actas-entrega/${actaId}/foto-devolucion`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
    },

    // El endpoint requiere Bearer token, así que no se puede enlazar directo:
    // se descarga como blob y se abre en una pestaña nueva.
    verPdf: async (actaId, version = null) => {
        const res = await api.get(`/actas-entrega/${actaId}/pdf`, {
            responseType: 'blob',
            params: version ? { version } : undefined,
        });
        const blobUrl = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
        window.open(blobUrl, '_blank');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },

    verPdfGenerado: (actaId) => actaEntregaService.verPdf(actaId, 'generado'),
    verPdfFirmado: (actaId) => actaEntregaService.verPdf(actaId, 'firmado'),
};

export default actaEntregaService;
