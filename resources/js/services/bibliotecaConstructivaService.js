import api from './api';

export const bibliotecaConstructivaService = {
    // ── Categorías ──────────────────────────────────────────────────────────
    getCategorias: async () => {
        const response = await api.get('/biblioteca-constructiva/categorias');
        return response.data;
    },
    crearCategoria: async (data) => {
        const response = await api.post('/biblioteca-constructiva/categorias', data);
        return response.data;
    },
    actualizarCategoria: async (id, data) => {
        const response = await api.put(`/biblioteca-constructiva/categorias/${id}`, data);
        return response.data;
    },
    eliminarCategoria: async (id) => {
        const response = await api.delete(`/biblioteca-constructiva/categorias/${id}`);
        return response.data;
    },

    // ── Ítems constructivos ──────────────────────────────────────────────────
    getItems: async (params = {}) => {
        const response = await api.get('/biblioteca-constructiva', { params });
        return response.data;
    },
    getItem: async (id) => {
        const response = await api.get(`/biblioteca-constructiva/${id}`);
        return response.data;
    },
    crearItem: async (data) => {
        const response = await api.post('/biblioteca-constructiva', data);
        return response.data;
    },
    actualizarItem: async (id, data) => {
        const response = await api.put(`/biblioteca-constructiva/${id}`, data);
        return response.data;
    },
    cambiarEstado: async (id, estado) => {
        const response = await api.patch(`/biblioteca-constructiva/${id}/estado`, { estado });
        return response.data;
    },
    eliminarItem: async (id) => {
        const response = await api.delete(`/biblioteca-constructiva/${id}`);
        return response.data;
    },

    // ── Importar Excel ───────────────────────────────────────────────────────
    descargarPlantillaExcel: () => {
        window.open(api.defaults.baseURL + '/biblioteca-constructiva/importar/plantilla-excel', '_blank');
    },
    importarExcel: async (archivo) => {
        const formData = new FormData();
        formData.append('archivo', archivo);
        const response = await api.post('/biblioteca-constructiva/importar/excel', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
};
