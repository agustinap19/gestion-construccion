// OpenRouteService — trazado de rutas reales por calles (solo visualización en el mapa).
// El orden de los puntos viene del algoritmo Python (ya optimizado), no se toca aquí.

const ORS_BASE = 'https://api.openrouteservice.org/v2';
const API_KEY = import.meta.env.VITE_ORS_API_KEY;

/**
 * Obtiene la ruta real por calles entre una lista de coordenadas.
 * @param {Array} coordenadas - Array de {lat, lng} en el orden del plan
 * @param {string} perfil - 'driving-hgv' para vehículos pesados,
 *                          'driving-car' para camionetas/autos
 * @returns {Array} Array de [lat, lng] para dibujar en Leaflet
 */
export async function obtenerRutaORS(coordenadas, perfil = 'driving-car') {
    if (!API_KEY || API_KEY === 'tu_api_key_aqui') {
        console.warn('ORS: API key no configurada, usando línea recta');
        return coordenadas.map(c => [c.lat, c.lng]);
    }

    if (coordenadas.length < 2) {
        return coordenadas.map(c => [c.lat, c.lng]);
    }

    // ORS espera [lng, lat] (GeoJSON), no [lat, lng]
    const coordinates = coordenadas.map(c => [c.lng, c.lat]);

    try {
        const response = await fetch(
            `${ORS_BASE}/directions/${perfil}/geojson`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': API_KEY,
                },
                body: JSON.stringify({
                    coordinates,
                    instructions: false,
                    preference: 'shortest',
                }),
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.warn('ORS error:', response.status, error);
            return coordenadas.map(c => [c.lat, c.lng]);
        }

        const data = await response.json();

        // ORS devuelve [lng, lat], Leaflet necesita [lat, lng]
        const rutaPuntos = data.features?.[0]
            ?.geometry
            ?.coordinates
            ?.map(([lng, lat]) => [lat, lng]);

        if (!rutaPuntos || rutaPuntos.length === 0) {
            return coordenadas.map(c => [c.lat, c.lng]);
        }

        return rutaPuntos;

    } catch (error) {
        console.warn('ORS: fallo de red, usando línea recta:', error.message);
        return coordenadas.map(c => [c.lat, c.lng]);
    }
}

/**
 * Elige el perfil ORS según el tipo de activo.
 * @param {string} tipoActivo - 'vehiculo', 'maquinaria', etc.
 */
export function perfilORS(tipoActivo) {
    if (tipoActivo === 'vehiculo') return 'driving-car';
    if (tipoActivo === 'maquinaria') return 'driving-hgv';
    return 'driving-car';
}
