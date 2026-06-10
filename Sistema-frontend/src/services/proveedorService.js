import api from './api';

export const proveedorService = {
    listar: async (params = {}) => {
        const res = await api.get('/proveedores', { params });
        return res.data;
    },

    obtener: async (id) => {
        const res = await api.get(`/proveedores/${id}`);
        return res.data;
    },

    crear: async (data) => {
        const res = await api.post('/proveedores', data);
        return res.data;
    },

    actualizar: async (id, data) => {
        const res = await api.put(`/proveedores/${id}`, data);
        return res.data;
    },

    cambiarEstado: async (id, estado) => {
        const res = await api.patch(`/proveedores/${id}/estado`, { estado });
        return res.data;
    },

    estadisticas: async () => {
        const res = await api.get('/proveedores/estadisticas');
        return res.data;
    },

    categorias: async () => {
        const res = await api.get('/proveedores/categorias');
        return res.data;
    },

    crearCategoria: async (nombre, descripcion = '') => {
        const res = await api.post('/proveedores/categorias', { nombre, descripcion });
        return res.data;
    },

    zonas: async () => {
        const res = await api.get('/proveedores/zonas');
        return res.data;
    },
};
