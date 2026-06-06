import api from './api';

export const materialService = {
    getAll: async (params = {}) => {
        const response = await api.get('/materiales', { params });
        return response.data;
    },
    
    getUnidadesMedida: async () => {
        const response = await api.get('/unidades-medida');
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/materiales', data);
        return response.data;
    },

    update: async (id, data) => {
        const response = await api.put(`/materiales/${id}`, data);
        return response.data;
    },

    toggleEstado: async (id, activo) => {
        const response = await api.patch(`/materiales/${id}/estado`, { activo });
        return response.data;
    },

    uploadFoto: async (file) => {
        const formData = new FormData();
        formData.append('imagen', file);
        
        const response = await api.post('/materiales/upload-foto', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};
