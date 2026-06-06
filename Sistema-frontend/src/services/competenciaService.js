import api from './api';

const competenciaService = {
    listar: async (filtros = {}, perPage = 50) => {
        const response = await api.get('/competencias', { params: { ...filtros, per_page: perPage } });
        return response.data;
    },

    crear: async (datos) => {
        const response = await api.post('/competencias', datos);
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/competencias/${id}`, datos);
        return response.data;
    },

    eliminar: async (id) => {
        const response = await api.delete(`/competencias/${id}`);
        return response.data;
    },
};

export default competenciaService;
