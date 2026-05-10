import api from './api';

const faseProyectoService = {
    listarPorProyecto: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/fases`);
        return response.data.data;
    },

    obtener: async (id) => {
        const response = await api.get(`/fases/${id}`);
        return response.data.data;
    },

    crear: async (proyectoId, datos) => {
        const response = await api.post(`/proyectos/${proyectoId}/fases`, datos);
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/fases/${id}`, datos);
        return response.data;
    },

    cambiarEstado: async (id, estado, razon = '') => {
        const response = await api.patch(`/fases/${id}/estado`, { estado, razon });
        return response.data;
    },

    actualizarAvance: async (id, porcentaje) => {
        const response = await api.patch(`/fases/${id}/avance`, { porcentaje });
        return response.data;
    },

    reordenar: async (proyectoId, ordenIds) => {
        const response = await api.put(`/proyectos/${proyectoId}/fases/reordenar`, { orden: ordenIds });
        return response.data;
    },

    validarPesos: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/fases/validar-pesos`);
        return response.data.data;
    },

    eliminar: async (id, razon) => {
        const response = await api.delete(`/fases/${id}`, { data: { razon } });
        return response.data;
    },
};

export default faseProyectoService;
