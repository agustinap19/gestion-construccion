import api from './api';

const rolService = {
    /**
     * Lista todos los roles con filtros opcionales
     */
    listar: async (filtros = {}) => {
        try {
            const response = await api.get('/roles', { params: filtros });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene el detalle completo de un rol
     */
    obtener: async (id) => {
        try {
            const response = await api.get(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene los permisos agrupados por módulo
     */
    obtenerPermisosAgrupados: async () => {
        try {
            const response = await api.get('/roles/permisos/agrupados');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Crea un nuevo rol
     */
    crear: async (datos) => {
        try {
            const response = await api.post('/roles', datos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Actualiza datos básicos de un rol
     */
    actualizar: async (id, datos) => {
        try {
            const response = await api.put(`/roles/${id}`, datos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Actualiza los permisos de un rol
     */
    actualizarPermisos: async (id, permisoIds, razon = null) => {
        try {
            const response = await api.patch(`/roles/${id}/permisos`, {
                permiso_ids: permisoIds,
                razon
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Duplica un rol existente
     */
    duplicar: async (id, datos) => {
        try {
            const response = await api.post(`/roles/${id}/duplicar`, datos);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Elimina un rol
     */
    eliminar: async (id) => {
        try {
            const response = await api.delete(`/roles/${id}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Cambia el estado activo/inactivo de un rol
     */
    cambiarEstado: async (id) => {
        try {
            const response = await api.patch(`/roles/${id}/estado`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    /**
     * Obtiene los usuarios asignados a un rol
     */
    obtenerUsuarios: async (id, page = 1, perPage = 15) => {
        try {
            const response = await api.get(`/roles/${id}/usuarios`, {
                params: { page, per_page: perPage }
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};

export default rolService;
