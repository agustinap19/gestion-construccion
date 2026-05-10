import api from './api';

const asignacionPersonalService = {
    listarPorProyecto: async (proyectoId) => {
        const response = await api.get(`/proyectos/${proyectoId}/personal`);
        return response.data.data;
    },

    asignar: async (proyectoId, datos) => {
        const response = await api.post(`/proyectos/${proyectoId}/personal`, datos);
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/asignaciones-personal/${id}`, datos);
        return response.data;
    },

    finalizar: async (id) => {
        const response = await api.patch(`/asignaciones-personal/${id}/finalizar`);
        return response.data;
    },

    eliminar: async (id) => {
        const response = await api.delete(`/asignaciones-personal/${id}`);
        return response.data;
    },
};

export default asignacionPersonalService;
