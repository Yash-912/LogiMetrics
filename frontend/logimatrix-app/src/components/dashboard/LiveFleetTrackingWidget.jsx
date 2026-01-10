import React, { useState, useEffect, useMemo } from 'react';
import DashboardWidget from './DashboardWidget';
import TrackingMap from '../tracking/TrackingMap';
import { fleetData } from '../../data/dashboardMockData';
import { Truck, MapPin, Navigation, Clock, Zap } from 'lucide-react';

/**
 * Live Fleet Tracking Widget
 * Real-time map showing all fleet vehicles with status overlays
 */
const LiveFleetTrackingWidget = ({ data = fleetData, onRefresh, height = 400 }) => {
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    // Transform vehicle data for TrackingMap component
    const vehicles = useMemo(() => {
        return data.vehicles.map(v => ({
            id: v.id,
            name: v.name,
            driver: v.driver,
            position: {
                lat: v.location.lat,
                lng: v.location.lng
            },
            speed: v.speed,
            heading: Math.random() * 360, // Simulate heading
            status: v.status === 'On Trip' ? 'moving' :
                v.status === 'Available' ? 'idle' :
                    v.status === 'Maintenance' ? 'alert' : 'offline',
            type: 'truck',
            lastUpdate: new Date().toISOString(),
            meta: {
                assignment: v.heading,
                vehicle: v.name
            }
        }));
    }, [data.vehicles]);

    // Calculate fleet stats
    const fleetStats = useMemo(() => {
        const stats = {
            active: vehicles.filter(v => v.status === 'moving' || v.status === 'idle').length,
            onTrip: vehicles.filter(v => v.status === 'moving').length,
            idle: vehicles.filter(v => v.status === 'idle').length,
            offline: vehicles.filter(v => v.status === 'offline' || v.status === 'alert').length
        };
        return stats;
    }, [vehicles]);

    // Handle vehicle selection
    const handleVehicleSelect = (vehicleId) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        setSelectedVehicle(vehicle || null);
    };

    return (
        <DashboardWidget
            title="Live Fleet Tracking"
            subtitle={`${fleetStats.active} active vehicles`}
            onRefresh={onRefresh}
            noPadding={true}
            className="overflow-hidden"
        >
            <div className="relative" style={{ height }}>
                {/* Map */}
                <TrackingMap
                    vehicles={vehicles}
                    selectedVehicleId={selectedVehicle?.id}
                    onVehicleSelect={handleVehicleSelect}
                    autoFitBounds={true}
                    fitBoundsPadding={50}
                    showZoomControl={true}
                    showMapStyleToggle={false}
                    height="100%"
                    onMapReady={() => setMapReady(true)}
                />

                {/* Stats Overlay */}
                <div className="absolute bottom-4 left-4 right-4 z-[1000]">
                    <div className="flex gap-2">
                        <StatBadge
                            icon={Navigation}
                            label="Active"
                            value={fleetStats.active}
                            color="cyan"
                        />
                        <StatBadge
                            icon={Truck}
                            label="On Trip"
                            value={fleetStats.onTrip}
                            color="blue"
                        />
                        <StatBadge
                            icon={Clock}
                            label="Idle"
                            value={fleetStats.idle}
                            color="amber"
                        />
                        <StatBadge
                            icon={Zap}
                            label="Offline"
                            value={fleetStats.offline}
                            color="slate"
                        />
                    </div>
                </div>

                {/* Selected Vehicle Info Card */}
                {selectedVehicle && (
                    <div className="absolute top-4 right-4 z-[1000] w-64">
                        <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-xl">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="text-white font-semibold">{selectedVehicle.name}</h4>
                                    <p className="text-xs text-cyan-400 font-mono">{selectedVehicle.id}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedVehicle(null)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-2">
                                <InfoRow icon={Truck} label="Driver" value={selectedVehicle.driver || 'Unassigned'} />
                                <InfoRow icon={Navigation} label="Speed" value={`${selectedVehicle.speed} km/h`} />
                                <InfoRow icon={MapPin} label="Assignment" value={selectedVehicle.meta.assignment} />
                                <StatusIndicator status={selectedVehicle.status} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardWidget>
    );
};

// Stat Badge Component
const StatBadge = ({ icon: Icon, label, value, color }) => {
    const colorClasses = {
        cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        green: 'bg-green-500/20 text-green-400 border-green-500/30',
        red: 'bg-red-500/20 text-red-400 border-red-500/30'
    };

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border backdrop-blur-sm ${colorClasses[color]}`}>
            <Icon className="w-4 h-4" />
            <div>
                <p className="text-lg font-bold leading-none">{value}</p>
                <p className="text-xs opacity-80">{label}</p>
            </div>
        </div>
    );
};

// Info Row Component
const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-slate-400">
            <Icon className="w-3.5 h-3.5" /> {label}
        </span>
        <span className="text-white">{value}</span>
    </div>
);

// Status Indicator Component
const StatusIndicator = ({ status }) => {
    const statusConfig = {
        moving: { label: 'In Transit', color: 'bg-blue-500', pulse: true },
        idle: { label: 'Available', color: 'bg-green-500', pulse: false },
        offline: { label: 'Offline', color: 'bg-slate-500', pulse: false },
        alert: { label: 'Maintenance', color: 'bg-amber-500', pulse: true }
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
            <div className={`w-2.5 h-2.5 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
            <span className="text-sm text-slate-300">{config.label}</span>
        </div>
    );
};

export default LiveFleetTrackingWidget;
