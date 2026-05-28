import api from './api';

const BASE = '/movimientos-almacen';

const movimientoAlmacenService = {
    listar: (params = {}) => api.get(BASE, { params }),
    obtener: (id) => api.get(`${BASE}/${id}`),

    registrarEntrada: (data) => api.post(`${BASE}/entradas`, data),
    registrarSalidaSocial: (data) => api.post(`${BASE}/salidas-sociales`, data),
    registrarSalidaPrivada: (data) => api.post(`${BASE}/salidas-privadas`, data),
    registrarTransferencia: (data) => api.post(`${BASE}/transferencias`, data),

    anular: (id, motivo) => api.patch(`${BASE}/${id}/anular`, { motivo }),
    validarConsumo: (data) => api.post(`${BASE}/validar-consumo`, data),
};

export default movimientoAlmacenService;
