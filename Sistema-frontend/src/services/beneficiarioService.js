import api from './api';

const beneficiarioService = {
    getAll: async (params = {}) => {
        const response = await api.get('/beneficiarios', { params });
        return response.data;
    },

    listarPorProyecto: async (proyectoId, filtros = {}, page = 1, perPage = 24) => {
        const response = await api.get('/beneficiarios', {
            params: { proyecto_id: proyectoId, ...filtros, page, per_page: perPage },
        });
        return response.data;
    },

    getById: async (id) => {
        const response = await api.get(`/beneficiarios/${id}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/beneficiarios', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/beneficiarios/${id}`, data);
        return response.data;
    },

    delete: async (id, razon) => {
        const response = await api.delete(`/beneficiarios/${id}`, { data: { razon } });
        return response.data;
    },

    cambiarEstado: async (id, estado_seleccion, razon = null, fechas = {}) => {
        const response = await api.patch(`/beneficiarios/${id}/estado`, {
            estado_seleccion,
            razon,
            ...fechas
        });
        return response.data;
    },

    asignarTipoVivienda: async (id, tipo_vivienda_id) => {
        const response = await api.patch(`/beneficiarios/${id}/tipo-vivienda`, { tipo_vivienda_id });
        return response.data;
    },

    obtenerEstadisticasProyecto: async (proyectoId) => {
        const response = await api.get(`/beneficiarios/proyecto/${proyectoId}/estadisticas`);
        return response.data;
    },

    obtenerCupoProyecto: async (proyectoId) => {
        const response = await api.get(`/beneficiarios/proyecto/${proyectoId}/cupo`);
        return response.data.data;
    },

    obtenerMapaProyecto: async (proyectoId) => {
        const response = await api.get(`/beneficiarios/proyecto/${proyectoId}/mapa`);
        return response.data;
    },

    obtenerTransicionesPermitidas: async (id) => {
        const response = await api.get(`/beneficiarios/${id}/transiciones-permitidas`);
        return response.data;
    },

    subirFoto: async (archivo) => {
        const fd = new FormData();
        fd.append('archivo', archivo);
        const response = await api.post('/upload/imagen', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.url;
    },

    subirDocumento: async (archivo) => {
        const fd = new FormData();
        fd.append('archivo', archivo);
        const response = await api.post('/upload/documento', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.url;
    },

    urlExportar: (proyectoId, tipo = 'pdf') => {
        return `/api/beneficiarios/proyecto/${proyectoId}/exportar?tipo=${tipo}`;
    },

    // ── Sincronización de tipología ───────────────────────────────────────────

    syncTipologiaPreview: async (id, nuevoTipoId) => {
        const response = await api.get(`/beneficiarios/${id}/sync-tipologia/preview`, {
            params: { nuevo_tipo_id: nuevoTipoId },
        });
        return response.data.preview;
    },

    syncTipologiaAplicar: async (id, nuevoTipoId) => {
        const response = await api.post(`/beneficiarios/${id}/sync-tipologia/aplicar`, {
            nuevo_tipo_id: nuevoTipoId,
        });
        return response.data;
    },

    syncTipologiaHistorial: async (id) => {
        const response = await api.get(`/beneficiarios/${id}/historial-tipologia`);
        return response.data.historial;
    },
};

export default beneficiarioService;
