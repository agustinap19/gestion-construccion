import api from './api';

const BASE = (proyectoId) => `/proyectos/${proyectoId}/items-config`;

const itemsProyectoService = {
    listar: (proyectoId, params = {}) =>
        api.get(BASE(proyectoId), { params }),

    actualizarCantidad: (proyectoId, pipId, data) =>
        api.patch(`${BASE(proyectoId)}/${pipId}/cantidad`, data),

    quitarItem: (proyectoId, pipId) =>
        api.delete(`${BASE(proyectoId)}/${pipId}`),

    agregarItem: (proyectoId, data) =>
        api.post(BASE(proyectoId), data),

    overrideTipologia: (proyectoId, data) =>
        api.put(`${BASE(proyectoId)}/override-tipologia`, data),

    overrideVivienda: (proyectoId, data) =>
        api.put(`${BASE(proyectoId)}/override-vivienda`, data),

    previewImpacto: (proyectoId, data) =>
        api.post(`${BASE(proyectoId)}/preview-impacto`, data),

    actualizarRecetas: (proyectoId) =>
        api.post(`${BASE(proyectoId)}/actualizar-recetas`),

    historial: (proyectoId, params = {}) =>
        api.get(`${BASE(proyectoId)}/historial`, { params }),
};

export default itemsProyectoService;
