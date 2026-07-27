import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Card from '../ui/Card';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from '../../context/ThemeContext';
import { TrendingUp, MapPin } from 'lucide-react';

const DashboardMap = ({ data = [] }) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';

    // Custom HTML Marker para efecto pulsante (muy premium)
    const createCustomIcon = (estado) => {
        const isPausado = estado === 'pausado';
        const color = isPausado ? 'bg-amber-500' : 'bg-emerald-500';
        const ring = isPausado ? 'border-amber-500' : 'border-emerald-500';

        return L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-full h-full ${ring} border-2 rounded-full opacity-50 animate-ping"></div>
                    <div class="w-4 h-4 ${color} rounded-full shadow-lg border-2 border-white dark:border-slate-800 z-10"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
        });
    };

    // Usar datos reales del backend si existen, sino un fallback
    const markers = useMemo(() => {
        if (data && data.length > 0) {
            return data.map(p => ({
                id: p.id,
                position: [parseFloat(p.latitud), parseFloat(p.longitud)],
                label: p.nombre,
                estado: p.estado,
                avance: p.avance_fisico || 0
            }));
        }
        return [];
    }, [data]);

    // Capas de mapas premium
    const lightMapUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const darkMapUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    return (
        <Card className="flex flex-col p-0 overflow-hidden relative border-none shadow-xl" style={{ height: '450px' }}>
            <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 p-4 rounded-xl shadow-2xl backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                    <MapPin size={18} className="text-emerald-500" />
                    Geolocalización en Tiempo Real
                </h3>
                <p className="text-xs text-slate-500 font-medium">Ubicación y estado de proyectos activos</p>
                <div className="mt-3 flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ejecución</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Pausado</div>
                </div>
            </div>
            
            <div style={{ height: '450px', width: '100%', position: 'relative', zIndex: 0 }}>
                <MapContainer 
                    center={[-16.290154, -63.588653]} // Centro geográfico de Bolivia aproximado
                    zoom={6} 
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={true}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        key={isDarkMode ? 'dark' : 'light'} // Fuerza re-render al cambiar tema
                        url={isDarkMode ? darkMapUrl : lightMapUrl}
                        attribution='&copy; CARTO'
                    />
                    
                    {markers.map((marker) => (
                        <Marker 
                            key={marker.id} 
                            position={marker.position}
                            icon={createCustomIcon(marker.estado)}
                        >
                            <Popup className="premium-popup">
                                <div className="p-1 min-w-[200px]">
                                    <h4 className="font-bold text-slate-900 mb-1">{marker.label}</h4>
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-3 ${marker.estado === 'pausado' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {marker.estado.replace('_', ' ')}
                                    </span>
                                    
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                                            <span>Avance Físico</span>
                                            <span className="text-emerald-600">{Number(marker.avance).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                            <div 
                                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" 
                                                style={{ width: `${marker.avance}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </Card>
    );
};

export default DashboardMap;
