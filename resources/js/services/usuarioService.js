import api from './api';

const usuarioService = {
    /**
     * Obtiene la lista de usuarios con paginación y filtros
     */
    listar: async (filtros = {}, page = 1) => {
        try {
            const params = { ...filtros, page };
            const response = await api.get('/usuarios', { params });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene un usuario específico por su ID
     */
    obtener: async (id) => {
        try {
            const response = await api.get(`/usuarios/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crea un nuevo usuario
     */
    crear: async (datos) => {
        try {
            const response = await api.post('/usuarios', datos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Actualiza un usuario existente
     */
    actualizar: async (id, datos) => {
        try {
            const response = await api.put(`/usuarios/${id}`, datos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cambia el estado de un usuario
     */
    cambiarEstado: async (id, estado) => {
        try {
            const response = await api.patch(`/usuarios/${id}/estado`, { estado });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Reenvía la contraseña temporal a un usuario
     */
    reenviarPassword: async (id) => {
        try {
            const response = await api.post(`/usuarios/${id}/reenviar-password`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Elimina (soft delete) un usuario
     */
    eliminar: async (id) => {
        try {
            const response = await api.delete(`/usuarios/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default usuarioService;
