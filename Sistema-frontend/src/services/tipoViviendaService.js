import api from './api';

const tipoViviendaService = {
    getAll: async (soloActivas = false) => {
        const response = await api.get('/tipos-vivienda');
        const data = response.data.data ?? response.data;
        return soloActivas ? data.filter(t => t.estado === 'activo') : data;
    },

    getById: async (id) => {
        const response = await api.get(`/tipos-vivienda/${id}`);
        return response.data.data;
    },

    create: async (datos) => {
        const response = await api.post('/tipos-vivienda', datos);
        return response.data;
    },

    update: async (id, datos) => {
        const response = await api.put(`/tipos-vivienda/${id}`, datos);
        return response.data;
    },

    cambiarEstado: async (id, estado) => {
        const response = await api.patch(`/tipos-vivienda/${id}/estado`, { estado });
        return response.data;
    },

    destroy: async (id) => {
        const response = await api.delete(`/tipos-vivienda/${id}`);
        return response.data;
    },

    subirPlano: async (archivo) => {
        const fd = new FormData();
        fd.append('archivo', archivo);
        const response = await api.post('/upload/plano', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data.url;
    },
};

export default tipoViviendaService;
