/**
 * GPS Coordinate Conversion Utilities
 * GMS (Grados, Minutos, Segundos) ↔ Decimal
 */

/**
 * Decimal degrees → GMS string (e.g. -16.5 → "16°30'00.00\"S")
 */
export function decimalToGMS(decimal, isLat = true) {
    if (decimal === null || decimal === undefined || decimal === '') return '';
    const num = parseFloat(decimal);
    if (isNaN(num)) return '';

    const abs = Math.abs(num);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = ((minFloat - min) * 60).toFixed(2);

    let dir = '';
    if (isLat) dir = num >= 0 ? 'N' : 'S';
    else        dir = num >= 0 ? 'E' : 'O';

    return `${deg}°${String(min).padStart(2,'0')}'${String(sec).padStart(5,'0')}"${dir}`;
}

/**
 * GMS string → decimal degrees
 * Accepts formats like: 16°30'00"S, 16 30 00 S, -16.5
 * Returns null if invalid.
 */
export function gmsToDecimal(gms) {
    if (gms === null || gms === undefined || gms === '') return null;
    const s = String(gms).trim();

    // Already decimal
    if (/^-?\d+(\.\d+)?$/.test(s)) {
        const v = parseFloat(s);
        return isNaN(v) ? null : v;
    }

    // GMS pattern: degrees + optional minutes + optional seconds + optional direction
    const match = s.match(
        /^(\d+)[°\s]+(\d+)?['\s]*(\d+(?:[.,]\d+)?)?["\s]*([NSEOnseWwOo])?$/i
    );
    if (!match) return null;

    const deg = parseFloat(match[1]) || 0;
    const min = parseFloat(match[2]) || 0;
    const sec = parseFloat((match[3] || '0').replace(',', '.')) || 0;
    const dir = (match[4] || '').toUpperCase();

    let decimal = deg + min / 60 + sec / 3600;
    if (['S', 'W', 'O'].includes(dir)) decimal = -decimal;

    return Math.round(decimal * 1e7) / 1e7;
}

/**
 * Validate that a decimal coordinate is in valid range.
 */
export function isValidLatitude(v) {
    const n = parseFloat(v);
    return !isNaN(n) && n >= -90 && n <= 90;
}

export function isValidLongitude(v) {
    const n = parseFloat(v);
    return !isNaN(n) && n >= -180 && n <= 180;
}

/**
 * Hook-ready GPS field component helper.
 * Parses user input (GMS or decimal) and returns { decimal, gms, error }.
 */
export function parseGPSInput(value, isLat = true) {
    if (!value || String(value).trim() === '') {
        return { decimal: null, gms: '', error: null };
    }
    const decimal = gmsToDecimal(value);
    if (decimal === null) {
        return { decimal: null, gms: '', error: 'Formato inválido (ej: -16.5 o 16°30\'00"S)' };
    }
    const valid = isLat ? isValidLatitude(decimal) : isValidLongitude(decimal);
    if (!valid) {
        return { decimal: null, gms: '', error: isLat ? 'Latitud fuera de rango (-90 a 90)' : 'Longitud fuera de rango (-180 a 180)' };
    }
    return { decimal, gms: decimalToGMS(decimal, isLat), error: null };
}
