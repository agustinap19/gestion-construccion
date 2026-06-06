import api from './api';

export const almacenService = {
    // ── Listado y detalle ──────────────────────────────────────────────────
    listar: async (params = {}) => {
        const res = await api.get('/almacenes', { params });
        return res.data;
    },

    obtener: async (id) => {
        const res = await api.get(`/almacenes/${id}`);
        return res.data;
    },

    estadisticas: async () => {
        const res = await api.get('/almacenes/estadisticas');
        return res.data;
    },

    // ── CRUD ──────────────────────────────────────────────────────────────
    crear: async (data) => {
        const res = await api.post('/almacenes', data);
        return res.data;
    },

    actualizar: async (id, data) => {
        const res = await api.put(`/almacenes/${id}`, data);
        return res.data;
    },

    cambiarEstado: async (id, estado) => {
        const res = await api.patch(`/almacenes/${id}/estado`, { estado });
        return res.data;
    },

    // ── Movimientos de stock ───────────────────────────────────────────────
    registrarEntrada: async (almacenId, data) => {
        const res = await api.post(`/almacenes/${almacenId}/entradas`, data);
        return res.data;
    },

    registrarSalida: async (almacenId, data) => {
        const res = await api.post(`/almacenes/${almacenId}/salidas`, data);
        return res.data;
    },

    ajustar: async (almacenId, data) => {
        const res = await api.post(`/almacenes/${almacenId}/ajustes`, data);
        return res.data;
    },

    transferir: async (data) => {
        const res = await api.post('/almacenes-transferencias', data);
        return res.data;
    },

    kardex: async (almacenId, materialId, params = {}) => {
        const res = await api.get(`/almacenes/${almacenId}/kardex/${materialId}`, { params });
        return res.data;
    },

    // ── Exportación ────────────────────────────────────────────────────────
    exportarKardex: (almacenId, materialId, params = {}) => {
        const query = new URLSearchParams(params).toString();
        return `/api/exportar/almacenes/${almacenId}/kardex/${materialId}${query ? '?' + query : ''}`;
    },
};
