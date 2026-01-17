import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Truck, Navigation, AlertTriangle } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

// Fix for default Leaflet icon not finding images in some build steps
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle auto-fitting bounds
const MapBounds = ({ vehicles }) => {
    const map = useMap();

    useEffect(() => {
        if (vehicles.length > 0) {
            const bounds = L.latLngBounds(vehicles.map(v => {
                const lat = v.position?.lat || v.lat || 0;
                const lng = v.position?.lng || v.lng || 0;
                return [lat, lng];
            }));

            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [vehicles, map]);

    return null;
};

// Create custom DivIcon for vehicles
const createVehicleIcon = (vehicle, isSelected) => {
    const color = vehicle.status === 'moving' ? '#3B82F6' :
        vehicle.status === 'idle' ? '#10B981' :
            vehicle.status === 'alert' ? '#EF4444' : '#64748B';

    const iconHtml = renderToStaticMarkup(
        <div className={`relative flex items-center justify-center ${isSelected ? 'scale-125' : ''}`}>
            {vehicle.status === 'moving' && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-50" style={{ backgroundColor: color, width: '100%', height: '100%' }} />
            )}
            <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-lg transition-transform"
                style={{ backgroundColor: color, transform: `rotate(${vehicle.heading || 0}deg)` }}
            >
                <Truck className="w-5 h-5 text-white" />
            </div>
            {isSelected && (
                <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full border border-white" />
            )}
        </div>
    );

    return L.divIcon({
        html: iconHtml,
        className: 'custom-vehicle-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
    });
};

const TrackingMap = ({
    vehicles = [],
    height = 400,
    onVehicleSelect,
    selectedVehicleId,
    center = [20.5937, 78.9629], // India Center
    zoom = 5
}) => {
    // Check if we have valid vehicles to fit bounds
    const hasVehicles = vehicles.length > 0;

    return (
        <div className="rounded-xl overflow-hidden border border-slate-700 shadow-lg relative z-0" style={{ height }}>
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%' }}
                className="z-0"
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />

                {hasVehicles && <MapBounds vehicles={vehicles} />}

                {vehicles.map(vehicle => {
                    const lat = vehicle.position?.lat || vehicle.lat;
                    const lng = vehicle.position?.lng || vehicle.lng;

                    if (!lat || !lng) return null;

                    return (
                        <Marker
                            key={vehicle.id}
                            position={[lat, lng]}
                            icon={createVehicleIcon(vehicle, selectedVehicleId === vehicle.id)}
                            eventHandlers={{
                                click: () => onVehicleSelect && onVehicleSelect(vehicle.id),
                            }}
                        >
                            <Popup className="custom-popup">
                                <div className="p-2 min-w-[150px]">
                                    <h4 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                                        <Truck className="w-4 h-4" />
                                        {vehicle.name || vehicle.id}
                                    </h4>
                                    <div className="text-xs space-y-1 text-slate-600">
                                        <p className="flex justify-between">
                                            <span>Status:</span>
                                            <span className={`font-semibold ${vehicle.status === 'moving' ? 'text-blue-600' :
                                                    vehicle.status === 'idle' ? 'text-green-600' : 'text-slate-600'
                                                }`}>
                                                {vehicle.status?.toUpperCase()}
                                            </span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span>Speed:</span>
                                            <span>{Math.round(vehicle.speed || 0)} km/h</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span>Driver:</span>
                                            <span>{vehicle.driver || 'N/A'}</span>
                                        </p>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 z-[500] bg-slate-900/90 backdrop-blur-sm p-3 rounded-lg border border-slate-700 text-xs">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-slate-300">Moving</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-slate-300">Idle</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-300">Alert</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackingMap;
