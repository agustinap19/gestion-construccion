import api from './api';

const usuarioService = {
    listar: async (filtros = {}, perPage = 15) => {
        const response = await api.get('/usuarios', { params: { ...filtros, per_page: perPage } });
        return response.data;
    },

    obtener: async (id) => {
        const response = await api.get(`/usuarios/${id}`);
        return response.data;
    },

    crear: async (datos) => {
        const response = await api.post('/usuarios', datos);
        return response.data;
    },

    actualizar: async (id, datos) => {
        const response = await api.put(`/usuarios/${id}`, datos);
        return response.data;
    },

    cambiarEstado: async (id, estado, razon = null) => {
        const response = await api.patch(`/usuarios/${id}/estado`, { estado, razon });
        return response.data;
    },

    cambiarRol: async (id, rolId, razon = null) => {
        const response = await api.patch(`/usuarios/${id}/rol`, { rol_id: rolId, razon });
        return response.data;
    },

    desbloquear: async (id) => {
        const response = await api.post(`/usuarios/${id}/desbloquear`);
        return response.data;
    },

    reenviarPassword: async (id) => {
        const response = await api.post(`/usuarios/${id}/reenviar-password`);
        return response.data;
    },

    cerrarSesion: async (id, tokenId) => {
        const response = await api.delete(`/usuarios/${id}/sesiones/${tokenId}`);
        return response.data;
    },

    cerrarTodasSesiones: async (id) => {
        const response = await api.delete(`/usuarios/${id}/sesiones`);
        return response.data;
    },

    revocarDispositivo: async (id, dispositivoId) => {
        const response = await api.patch(`/usuarios/${id}/dispositivos/${dispositivoId}/revocar`);
        return response.data;
    },

    revocarTodosDispositivos: async (id) => {
        const response = await api.patch(`/usuarios/${id}/dispositivos/revocar-todos`);
        return response.data;
    },

    eliminar: async (id, razon = null) => {
        const response = await api.delete(`/usuarios/${id}`, { data: { razon } });
        return response.data;
    },

    restaurar: async (id) => {
        const response = await api.post(`/usuarios/${id}/restaurar`);
        return response.data;
    },

    accionMasiva: async (accion, usuarioIds, razon = null) => {
        const response = await api.post('/usuarios/accion-masiva', {
            accion,
            usuario_ids: usuarioIds,
            razon,
        });
        return response.data;
    },
};

export default usuarioService;
