/**
 * TrackingMap Component
 * Displays a map with vehicle/shipment tracking markers
 * Uses a simple placeholder map design (can be replaced with Mapbox/Google Maps)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Truck, Navigation, Circle } from 'lucide-react';

// Map marker colors by status
const statusColors = {
    'On Trip': '#3B82F6',
    'Available': '#10B981',
    'Maintenance': '#F59E0B',
    'Offline': '#64748B',
    'moving': '#3B82F6',
    'idle': '#10B981',
    'stopped': '#F59E0B'
};

// Vehicle Marker Component
const VehicleMarker = ({ vehicle, onClick, isSelected }) => {
    const color = statusColors[vehicle.status] || '#64748B';

    return (
        <div
            onClick={() => onClick?.(vehicle)}
            className={`
                absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer
                transition-all duration-300 hover:scale-110 z-10
                ${isSelected ? 'z-20 scale-125' : ''}
            `}
            style={{
                left: `${((vehicle.location?.lng || vehicle.lng || 72.877) - 68) / 24 * 100}%`,
                top: `${100 - ((vehicle.location?.lat || vehicle.lat || 19.076) - 8) / 22 * 100}%`
            }}
        >
            <div className={`relative ${isSelected ? 'animate-pulse' : ''}`}>
                {/* Pulse ring */}
                {vehicle.speed > 0 && (
                    <div
                        className="absolute inset-0 rounded-full animate-ping opacity-50"
                        style={{ backgroundColor: color }}
                    />
                )}

                {/* Marker body */}
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                    style={{ backgroundColor: color }}
                >
                    <Truck className="w-4 h-4 text-white" />
                </div>

                {/* Vehicle ID label */}
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="text-[10px] px-1 py-0.5 rounded bg-slate-900/80 text-white font-medium">
                        {vehicle.id || vehicle.name}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Map Grid Lines
const MapGrid = () => (
    <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
        {/* Horizontal lines */}
        {[...Array(6)].map((_, i) => (
            <line
                key={`h-${i}`}
                x1="0"
                y1={`${(i + 1) * (100 / 7)}%`}
                x2="100%"
                y2={`${(i + 1) * (100 / 7)}%`}
                stroke="#94A3B8"
                strokeWidth="1"
            />
        ))}
        {/* Vertical lines */}
        {[...Array(8)].map((_, i) => (
            <line
                key={`v-${i}`}
                x1={`${(i + 1) * (100 / 9)}%`}
                y1="0"
                x2={`${(i + 1) * (100 / 9)}%`}
                y2="100%"
                stroke="#94A3B8"
                strokeWidth="1"
            />
        ))}
    </svg>
);

// Main TrackingMap Component
const TrackingMap = ({
    vehicles = [],
    height = 400,
    onVehicleClick,
    selectedVehicleId,
    showControls = true,
    className = ''
}) => {
    const [zoom, setZoom] = useState(1);
    const [hoveredVehicle, setHoveredVehicle] = useState(null);

    // Indian city markers for reference
    const cityMarkers = useMemo(() => [
        { name: 'Mumbai', lat: 19.076, lng: 72.877 },
        { name: 'Delhi', lat: 28.613, lng: 77.209 },
        { name: 'Bangalore', lat: 12.971, lng: 77.594 },
        { name: 'Chennai', lat: 13.082, lng: 80.270 },
        { name: 'Kolkata', lat: 22.572, lng: 88.363 },
        { name: 'Hyderabad', lat: 17.385, lng: 78.486 }
    ], []);

    return (
        <div
            className={`relative overflow-hidden rounded-xl bg-slate-800/50 border border-slate-700 ${className}`}
            style={{ height }}
        >
            {/* Map Background */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
                style={{ transform: `scale(${zoom})` }}
            >
                {/* Grid pattern */}
                <MapGrid />

                {/* India outline (simplified) */}
                <div className="absolute inset-4 border-2 border-dashed border-slate-600/30 rounded-xl" />

                {/* City markers */}
                {cityMarkers.map(city => (
                    <div
                        key={city.name}
                        className="absolute transform -translate-x-1/2 -translate-y-1/2 opacity-40"
                        style={{
                            left: `${(city.lng - 68) / 24 * 100}%`,
                            top: `${100 - (city.lat - 8) / 22 * 100}%`
                        }}
                    >
                        <div className="flex flex-col items-center">
                            <Circle className="w-2 h-2 text-cyan-400 fill-cyan-400" />
                            <span className="text-[9px] text-slate-400 mt-0.5">{city.name}</span>
                        </div>
                    </div>
                ))}

                {/* Vehicle Markers */}
                {vehicles.map(vehicle => (
                    <VehicleMarker
                        key={vehicle.id}
                        vehicle={vehicle}
                        onClick={onVehicleClick}
                        isSelected={selectedVehicleId === vehicle.id}
                    />
                ))}
            </div>

            {/* Map Controls */}
            {showControls && (
                <div className="absolute top-3 right-3 flex flex-col gap-1 z-30">
                    <button
                        onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
                        className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 flex items-center justify-center"
                    >
                        +
                    </button>
                    <button
                        onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
                        className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 flex items-center justify-center"
                    >
                        −
                    </button>
                    <button
                        onClick={() => setZoom(1)}
                        className="w-8 h-8 rounded bg-slate-800 border border-slate-700 text-white hover:bg-slate-700 flex items-center justify-center text-xs"
                    >
                        ⌂
                    </button>
                </div>
            )}

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex gap-3 z-30">
                {[
                    { label: 'On Trip', color: '#3B82F6' },
                    { label: 'Available', color: '#10B981' },
                    { label: 'Maintenance', color: '#F59E0B' },
                    { label: 'Offline', color: '#64748B' }
                ].map(item => (
                    <div key={item.label} className="flex items-center gap-1">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-slate-400">{item.label}</span>
                    </div>
                ))}
            </div>

            {/* Vehicle count */}
            <div className="absolute top-3 left-3 z-30">
                <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
                    <span className="text-xs text-slate-400">
                        <span className="text-cyan-400 font-semibold">{vehicles.length}</span> vehicles tracked
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TrackingMap;
