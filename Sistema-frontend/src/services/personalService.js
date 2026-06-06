import api from './api';

const personalService = {
    listar: async (filtros = {}, perPage = 15) => {
        const response = await api.get('/personal', { params: { ...filtros, per_page: perPage } });
        return response.data;
    },

    obtenerEstadisticas: async () => {
        const response = await api.get('/personal/estadisticas');
        return response.data;
    },

    siguienteCodigo: async () => {
        const response = await api.get('/personal/siguiente-codigo');
        return response.data;
    },

    obtener: async (id) => {
        const response = await api.get(`/personal/${id}`);
        return response.data;
    },

    crear: async (datos) => {
        const response = await api.post('/personal', datos);
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/personal/${id}`, datos);
        return response.data;
    },

    cambiarEstadoLaboral: async (id, estadoLaboral, razon = null) => {
        const response = await api.patch(`/personal/${id}/estado-laboral`, { estado_laboral: estadoLaboral, razon });
        return response.data;
    },

    vincularUsuario: async (id, usuarioId) => {
        const response = await api.post(`/personal/${id}/vincular-usuario`, { usuario_id: usuarioId });
        return response.data;
    },

    desvincularUsuario: async (id) => {
        const response = await api.post(`/personal/${id}/desvincular-usuario`);
        return response.data;
    },

    crearUsuarioParaPersonal: async (id, email, rolId) => {
        const response = await api.post(`/personal/${id}/crear-usuario`, { email, rol_id: rolId });
        return response.data;
    },

    eliminar: async (id, razon = null) => {
        const response = await api.delete(`/personal/${id}`, { data: { razon } });
        return response.data;
    },

    restaurar: async (id) => {
        const response = await api.post(`/personal/${id}/restaurar`);
        return response.data;
    },

    // Competencias
    obtenerCompetencias: async (id) => {
        const response = await api.get(`/personal/${id}/competencias`);
        return response.data;
    },

    asignarCompetencia: async (id, datos) => {
        const response = await api.post(`/personal/${id}/competencias`, datos);
        return response.data;
    },

    actualizarCompetencia: async (id, competenciaId, datos) => {
        const response = await api.put(`/personal/${id}/competencias/${competenciaId}`, datos);
        return response.data;
    },

    desasignarCompetencia: async (id, competenciaId) => {
        const response = await api.delete(`/personal/${id}/competencias/${competenciaId}`);
        return response.data;
    }
};

export default personalService;
