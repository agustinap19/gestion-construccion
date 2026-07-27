import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

const tieneCoordsValidas = (lat, lng) => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    return !isNaN(la) && !isNaN(ln);
};

export default function MapLocationPicker({ latitud, longitud, onChange }) {
    // Default to Cochabamba roughly if no coords
    const initialPos = tieneCoordsValidas(latitud, longitud) ? { lat: parseFloat(latitud), lng: parseFloat(longitud) } : { lat: -17.3960, lng: -66.1534 };

    const [position, setPosition] = useState(initialPos);

    useEffect(() => {
        if (position && (position.lat !== parseFloat(latitud) || position.lng !== parseFloat(longitud))) {
            onChange(position.lat, position.lng);
        }
    }, [position]);

    // If external lat/lng changes via the "Usar mi ubicación actual" button, update the map
    useEffect(() => {
        if (tieneCoordsValidas(latitud, longitud)) {
            setPosition({ lat: parseFloat(latitud), lng: parseFloat(longitud) });
        }
    }, [latitud, longitud]);

    return (
        <div className="w-full h-64 rounded-xl overflow-hidden border border-white/10 shadow-inner mt-4 z-0">
            <MapContainer 
                center={initialPos} 
                zoom={tieneCoordsValidas(latitud, longitud) ? 16 : 6}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                />
                <LocationMarker position={position} setPosition={setPosition} />
            </MapContainer>
        </div>
    );
}
